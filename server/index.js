const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Создаем папку для загрузок, если её нет
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 10000);
    const ext = path.extname(file.originalname);
    const originalName = path.basename(file.originalname, ext);
    const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${timestamp}_${randomNum}_${safeName}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Только изображения!'));
    }
  }
});

// ==================== ПОДКЛЮЧЕНИЕ К POSTGRESQL ====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fitnes',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ==================== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ====================
async function initializeDB() {
  const client = await pool.connect();
  
  try {
    // Создание таблиц
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS programs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER,
        duration TEXT,
        is_active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        video_url TEXT,
        cover_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        booking_time TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        is_approved INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        telegram TEXT,
        vk TEXT,
        whatsapp TEXT,
        email TEXT
      );
    `);

    // Добавляем тестового админа
    const adminExists = await client.query('SELECT * FROM users WHERE email = $1', ['admin@fitnes.com']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4)',
        ['admin@fitnes.com', hashedPassword, 'Администратор', 'admin']
      );
      console.log('✅ Админ создан: admin@fitnes.com / admin123');
    }

    // Добавляем тестовые программы
    const programsCount = await client.query('SELECT COUNT(*) as count FROM programs');
    if (parseInt(programsCount.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO programs (name, description, price, duration) VALUES ($1, $2, $3, $4)',
        ['Старт', 'Домашние тренировки без инвентаря. Идеально для новичков.', 2990, '1 месяц']
      );
      await client.query(
        'INSERT INTO programs (name, description, price, duration) VALUES ($1, $2, $3, $4)',
        ['Прокачка', 'Интенсивные тренировки с гантелями и резиной.', 4990, '1 месяц']
      );
      await client.query(
        'INSERT INTO programs (name, description, price, duration) VALUES ($1, $2, $3, $4)',
        ['VIP', 'Индивидуальные тренировки 1-на-1 с тренером.', 9990, '1 месяц']
      );
      console.log('✅ Добавлены тестовые программы');
    }

    // Добавляем тестовый пост
    const postsCount = await client.query('SELECT COUNT(*) as count FROM posts');
    if (parseInt(postsCount.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO posts (title, content, video_url, cover_image) VALUES ($1, $2, $3, $4)',
        ['Первая тренировка', 'Как начать заниматься и не бросить', 'https://vk.com/video-238431227_456239024', null]
      );
    }

    // Добавляем контакты по умолчанию
    const contactsCount = await client.query('SELECT COUNT(*) as count FROM contacts');
    if (parseInt(contactsCount.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO contacts (telegram, vk, whatsapp, email) VALUES ($1, $2, $3, $4)',
        ['https://t.me/trainer', 'https://vk.com/trainer', '+79991234567', 'trainer@fitnes.com']
      );
    }

    console.log('✅ База данных PostgreSQL готова');
  } finally {
    client.release();
  }
}

// ==================== MIDDLEWARE ====================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора.' });
  }
  next();
}

// ==================== ФУНКЦИИ ДЛЯ VK VIDEO ====================
function getVKVideoId(url) {
  if (!url) return null;
  const match = url.match(/video(-?\d+_\d+)/);
  return match ? match[1] : null;
}

function getVKEmbedUrl(videoId) {
  if (!videoId) return null;
  const [oid, id] = videoId.split('_');
  return `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=1`;
}

// ==================== AUTH РОУТЫ ====================
app.post('/api/auth/register', async (req, res) => {
  const { email, password, full_name } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (email, password, full_name) VALUES ($1, $2, $3)',
      [email, hashedPassword, full_name]
    );
    res.status(201).json({ message: 'Пользователь создан' });
  } catch (error) {
    res.status(400).json({ error: 'Email уже существует' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    }
  });
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT id, email, full_name, role FROM users WHERE id = $1', [req.user.id]);
  res.json(result.rows[0]);
});

// ==================== UPLOAD РОУТ ====================
app.post('/api/upload', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// ==================== POSTS РОУТЫ ====================
app.get('/api/posts', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const offset = (page - 1) * limit;

  const result = await pool.query(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const totalResult = await pool.query('SELECT COUNT(*) as count FROM posts');
  const total = parseInt(totalResult.rows[0].count);
  
  const postsWithEmbed = result.rows.map(post => {
    let video_embed = null;
    if (post.video_url) {
      const videoId = getVKVideoId(post.video_url);
      if (videoId) {
        const embedUrl = getVKEmbedUrl(videoId);
        video_embed = `<iframe width="100%" height="200" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
      }
    }
    return { ...post, video_embed };
  });
  
  res.json({
    posts: postsWithEmbed,
    total: total,
    page,
    totalPages: Math.ceil(total / limit)
  });
});

app.get('/api/posts/latest', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT 3'
  );
  res.json(result.rows);
});

app.post('/api/posts', authenticateToken, requireAdmin, async (req, res) => {
  const { title, content, video_url, cover_image } = req.body;
  const result = await pool.query(
    'INSERT INTO posts (title, content, video_url, cover_image) VALUES ($1, $2, $3, $4) RETURNING id',
    [title, content, video_url, cover_image || null]
  );
  res.json({ id: result.rows[0].id, message: 'Пост создан' });
});

app.put('/api/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { title, content, video_url, cover_image } = req.body;
  await pool.query(
    'UPDATE posts SET title = $1, content = $2, video_url = $3, cover_image = $4 WHERE id = $5',
    [title, content, video_url, cover_image, req.params.id]
  );
  res.json({ message: 'Пост обновлен' });
});

app.delete('/api/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  res.json({ message: 'Пост удален' });
});

// ==================== PROGRAMS РОУТЫ ====================
app.get('/api/programs', async (req, res) => {
  const result = await pool.query('SELECT * FROM programs WHERE is_active = 1');
  res.json(result.rows);
});

app.post('/api/programs', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, price, duration } = req.body;
  const result = await pool.query(
    'INSERT INTO programs (name, description, price, duration) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, description, price, duration]
  );
  res.json({ id: result.rows[0].id, message: 'Программа создана' });
});

app.put('/api/programs/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, price, duration, is_active } = req.body;
  await pool.query(
    'UPDATE programs SET name = $1, description = $2, price = $3, duration = $4, is_active = $5 WHERE id = $6',
    [name, description, price, duration, is_active, req.params.id]
  );
  res.json({ message: 'Программа обновлена' });
});

app.delete('/api/programs/:id', authenticateToken, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM programs WHERE id = $1', [req.params.id]);
  res.json({ message: 'Программа удалена' });
});

// ==================== BOOKINGS РОУТЫ ====================
app.get('/api/bookings/my', authenticateToken, async (req, res) => {
  const result = await pool.query(`
    SELECT b.*, p.name as program_name, p.price 
    FROM bookings b
    JOIN programs p ON b.program_id = p.id
    WHERE b.user_id = $1
    ORDER BY b.booking_date DESC
  `, [req.user.id]);
  res.json(result.rows);
});

app.get('/api/bookings/all', authenticateToken, requireAdmin, async (req, res) => {
  const result = await pool.query(`
    SELECT b.*, u.full_name, u.email, p.name as program_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN programs p ON b.program_id = p.id
    ORDER BY b.booking_date DESC
  `);
  res.json(result.rows);
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  const { program_id, booking_date, booking_time, comment } = req.body;
  
  const existing = await pool.query(
    'SELECT * FROM bookings WHERE user_id = $1 AND booking_date = $2 AND booking_time = $3',
    [req.user.id, booking_date, booking_time]
  );
  
  if (existing.rows.length > 0) {
    return res.status(400).json({ error: 'Вы уже записаны на это время' });
  }
  
  const result = await pool.query(
    'INSERT INTO bookings (user_id, program_id, booking_date, booking_time, comment) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [req.user.id, program_id, booking_date, booking_time, comment]
  );
  res.json({ id: result.rows[0].id, message: 'Запись создана' });
});

app.put('/api/bookings/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ message: 'Статус обновлен' });
});

app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
  if (booking.rows.length === 0 || (booking.rows[0].user_id !== req.user.id && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  await pool.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
  res.json({ message: 'Запись отменена' });
});

// ==================== REVIEWS РОУТЫ ====================
app.get('/api/reviews', async (req, res) => {
  const result = await pool.query(`
    SELECT r.*, u.full_name 
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.is_approved = 1
    ORDER BY r.created_at DESC
    LIMIT 10
  `);
  res.json(result.rows);
});

app.get('/api/reviews/pending', authenticateToken, requireAdmin, async (req, res) => {
  const result = await pool.query(`
    SELECT r.*, u.full_name, u.email
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.is_approved = 0
    ORDER BY r.created_at DESC
  `);
  res.json(result.rows);
});

app.post('/api/reviews', authenticateToken, async (req, res) => {
  const { text, rating } = req.body;
  const result = await pool.query(
    'INSERT INTO reviews (user_id, text, rating) VALUES ($1, $2, $3) RETURNING id',
    [req.user.id, text, rating]
  );
  res.json({ id: result.rows[0].id, message: 'Отзыв отправлен на модерацию' });
});

app.put('/api/reviews/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  await pool.query('UPDATE reviews SET is_approved = 1 WHERE id = $1', [req.params.id]);
  res.json({ message: 'Отзыв опубликован' });
});

app.delete('/api/reviews/:id', authenticateToken, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  res.json({ message: 'Отзыв удален' });
});

// ==================== CONTACTS РОУТЫ ====================
app.get('/api/contacts', async (req, res) => {
  let result = await pool.query('SELECT * FROM contacts WHERE id = 1');
  let contacts = result.rows[0];
  
  if (!contacts) {
    await pool.query(
      'INSERT INTO contacts (telegram, vk, whatsapp, email) VALUES ($1, $2, $3, $4)',
      ['https://t.me/trainer', 'https://vk.com/trainer', '+79991234567', 'trainer@fitnes.com']
    );
    result = await pool.query('SELECT * FROM contacts WHERE id = 1');
    contacts = result.rows[0];
  }
  res.json(contacts);
});

app.put('/api/contacts', authenticateToken, requireAdmin, async (req, res) => {
  const { telegram, vk, whatsapp, email } = req.body;
  await pool.query(
    `UPDATE contacts SET telegram = $1, vk = $2, whatsapp = $3, email = $4 WHERE id = 1`,
    [telegram, vk, whatsapp, email]
  );
  res.json({ message: 'Контакты обновлены' });
});

// ==================== РАЗДАЧА СТАТИКИ ДЛЯ ПРОДАКШН ====================
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// ==================== ЗАПУСК СЕРВЕРА ====================
async function startServer() {
  await initializeDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📝 API доступен по адресу: http://localhost:${PORT}/api`);
    console.log(`👑 Админ: admin@fitnes.com / admin123\n`);
  });
}

startServer();