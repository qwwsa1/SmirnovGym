const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;  // ← ИСПРАВЛЕНО: берём порт из окружения
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';  // ← ИСПРАВЛЕНО: из окружения

// Middleware
app.use(cors({
  origin: '*',  // ← ДЛЯ RAILWAY: разрешаем все источники
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

// ==================== БАЗА ДАННЫХ ====================
let db;

async function initializeDB() {
  db = await open({
    filename: path.join(__dirname, 'fitnes.db'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER,
      duration TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      video_url TEXT,
      cover_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      program_id INTEGER NOT NULL,
      booking_date DATE NOT NULL,
      booking_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (program_id) REFERENCES programs(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      is_approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram TEXT,
      vk TEXT,
      whatsapp TEXT,
      email TEXT
    );
  `);

  try {
    await db.exec(`ALTER TABLE posts ADD COLUMN cover_image TEXT`);
  } catch (e) {}

  const adminExists = await db.get('SELECT * FROM users WHERE email = ?', ['admin@fitnes.com']);
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run(
      'INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)',
      ['admin@fitnes.com', hashedPassword, 'Администратор', 'admin']
    );
    console.log('✅ Админ создан: admin@fitnes.com / admin123');
  }

  const programsCount = await db.get('SELECT COUNT(*) as count FROM programs');
  if (programsCount.count === 0) {
    await db.run(
      'INSERT INTO programs (name, description, price, duration) VALUES (?, ?, ?, ?)',
      ['Старт', 'Домашние тренировки без инвентаря. Идеально для новичков.', 2990, '1 месяц']
    );
    await db.run(
      'INSERT INTO programs (name, description, price, duration) VALUES (?, ?, ?, ?)',
      ['Прокачка', 'Интенсивные тренировки с гантелями и резиной.', 4990, '1 месяц']
    );
    await db.run(
      'INSERT INTO programs (name, description, price, duration) VALUES (?, ?, ?, ?)',
      ['VIP', 'Индивидуальные тренировки 1-на-1 с тренером.', 9990, '1 месяц']
    );
    console.log('✅ Добавлены тестовые программы');
  }

  const postsCount = await db.get('SELECT COUNT(*) as count FROM posts');
  if (postsCount.count === 0) {
    await db.run(
      'INSERT INTO posts (title, content, video_url, cover_image) VALUES (?, ?, ?, ?)',
      ['Первая тренировка', 'Как начать заниматься и не бросить', 'https://vk.com/video-238431227_456239024', null]
    );
  }

  const contactsCount = await db.get('SELECT COUNT(*) as count FROM contacts');
  if (contactsCount.count === 0) {
    await db.run(
      'INSERT INTO contacts (telegram, vk, whatsapp, email) VALUES (?, ?, ?, ?)',
      ['https://t.me/trainer', 'https://vk.com/trainer', '+79991234567', 'trainer@fitnes.com']
    );
  }

  console.log('✅ База данных готова');
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
    await db.run(
      'INSERT INTO users (email, password, full_name) VALUES (?, ?, ?)',
      [email, hashedPassword, full_name]
    );
    res.status(201).json({ message: 'Пользователь создан' });
  } catch (error) {
    res.status(400).json({ error: 'Email уже существует' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
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
  const user = await db.get('SELECT id, email, full_name, role FROM users WHERE id = ?', [req.user.id]);
  res.json(user);
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

  const posts = await db.all(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  const total = await db.get('SELECT COUNT(*) as count FROM posts');
  
  const postsWithEmbed = posts.map(post => {
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
    total: total.count,
    page,
    totalPages: Math.ceil(total.count / limit)
  });
});

app.get('/api/posts/latest', async (req, res) => {
  const posts = await db.all(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT 3'
  );
  res.json(posts);
});

app.post('/api/posts', authenticateToken, requireAdmin, async (req, res) => {
  const { title, content, video_url, cover_image } = req.body;
  const result = await db.run(
    'INSERT INTO posts (title, content, video_url, cover_image) VALUES (?, ?, ?, ?)',
    [title, content, video_url, cover_image || null]
  );
  res.json({ id: result.lastID, message: 'Пост создан' });
});

app.put('/api/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { title, content, video_url, cover_image } = req.body;
  await db.run(
    'UPDATE posts SET title = ?, content = ?, video_url = ?, cover_image = ? WHERE id = ?',
    [title, content, video_url, cover_image, req.params.id]
  );
  res.json({ message: 'Пост обновлен' });
});

app.delete('/api/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
  await db.run('DELETE FROM posts WHERE id = ?', [req.params.id]);
  res.json({ message: 'Пост удален' });
});

// ==================== PROGRAMS РОУТЫ ====================
app.get('/api/programs', async (req, res) => {
  const programs = await db.all('SELECT * FROM programs WHERE is_active = 1');
  res.json(programs);
});

app.post('/api/programs', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, price, duration } = req.body;
  const result = await db.run(
    'INSERT INTO programs (name, description, price, duration) VALUES (?, ?, ?, ?)',
    [name, description, price, duration]
  );
  res.json({ id: result.lastID, message: 'Программа создана' });
});

app.put('/api/programs/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, price, duration, is_active } = req.body;
  await db.run(
    'UPDATE programs SET name = ?, description = ?, price = ?, duration = ?, is_active = ? WHERE id = ?',
    [name, description, price, duration, is_active, req.params.id]
  );
  res.json({ message: 'Программа обновлена' });
});

app.delete('/api/programs/:id', authenticateToken, requireAdmin, async (req, res) => {
  await db.run('DELETE FROM programs WHERE id = ?', [req.params.id]);
  res.json({ message: 'Программа удалена' });
});

// ==================== BOOKINGS РОУТЫ ====================
app.get('/api/bookings/my', authenticateToken, async (req, res) => {
  const bookings = await db.all(`
    SELECT b.*, p.name as program_name, p.price 
    FROM bookings b
    JOIN programs p ON b.program_id = p.id
    WHERE b.user_id = ?
    ORDER BY b.booking_date DESC
  `, [req.user.id]);
  res.json(bookings);
});

app.get('/api/bookings/all', authenticateToken, requireAdmin, async (req, res) => {
  const bookings = await db.all(`
    SELECT b.*, u.full_name, u.email, p.name as program_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN programs p ON b.program_id = p.id
    ORDER BY b.booking_date DESC
  `);
  res.json(bookings);
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  const { program_id, booking_date, booking_time, comment } = req.body;
  
  const existing = await db.get(
    'SELECT * FROM bookings WHERE user_id = ? AND booking_date = ? AND booking_time = ?',
    [req.user.id, booking_date, booking_time]
  );
  
  if (existing) {
    return res.status(400).json({ error: 'Вы уже записаны на это время' });
  }
  
  const result = await db.run(
    'INSERT INTO bookings (user_id, program_id, booking_date, booking_time, comment) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, program_id, booking_date, booking_time, comment]
  );
  res.json({ id: result.lastID, message: 'Запись создана' });
});

app.put('/api/bookings/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { status } = req.body;
  await db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ message: 'Статус обновлен' });
});

app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking || (booking.user_id !== req.user.id && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  await db.run('DELETE FROM bookings WHERE id = ?', [req.params.id]);
  res.json({ message: 'Запись отменена' });
});

// ==================== REVIEWS РОУТЫ ====================
app.get('/api/reviews', async (req, res) => {
  const reviews = await db.all(`
    SELECT r.*, u.full_name 
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.is_approved = 1
    ORDER BY r.created_at DESC
    LIMIT 10
  `);
  res.json(reviews);
});

app.get('/api/reviews/pending', authenticateToken, requireAdmin, async (req, res) => {
  const reviews = await db.all(`
    SELECT r.*, u.full_name, u.email
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.is_approved = 0
    ORDER BY r.created_at DESC
  `);
  res.json(reviews);
});

app.post('/api/reviews', authenticateToken, async (req, res) => {
  const { text, rating } = req.body;
  const result = await db.run(
    'INSERT INTO reviews (user_id, text, rating) VALUES (?, ?, ?)',
    [req.user.id, text, rating]
  );
  res.json({ id: result.lastID, message: 'Отзыв отправлен на модерацию' });
});

app.put('/api/reviews/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  await db.run('UPDATE reviews SET is_approved = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Отзыв опубликован' });
});

app.delete('/api/reviews/:id', authenticateToken, requireAdmin, async (req, res) => {
  await db.run('DELETE FROM reviews WHERE id = ?', [req.params.id]);
  res.json({ message: 'Отзыв удален' });
});

// ==================== CONTACTS РОУТЫ ====================
app.get('/api/contacts', async (req, res) => {
  let contacts = await db.get('SELECT * FROM contacts WHERE id = 1');
  if (!contacts) {
    await db.run(
      'INSERT INTO contacts (telegram, vk, whatsapp, email) VALUES (?, ?, ?, ?)',
      ['https://t.me/trainer', 'https://vk.com/trainer', '+79991234567', 'trainer@fitnes.com']
    );
    contacts = await db.get('SELECT * FROM contacts WHERE id = 1');
  }
  res.json(contacts);
});

app.put('/api/contacts', authenticateToken, requireAdmin, async (req, res) => {
  const { telegram, vk, whatsapp, email } = req.body;
  await db.run(
    `UPDATE contacts SET telegram = ?, vk = ?, whatsapp = ?, email = ? WHERE id = 1`,
    [telegram, vk, whatsapp, email]
  );
  res.json({ message: 'Контакты обновлены' });
});

// ==================== РАЗДАЧА СТАТИКИ ДЛЯ ПРОДАКШН ====================
// Раздаём собранный React клиент
app.use(express.static(path.join(__dirname, '../client/build')));

// Все остальные маршруты отдаём index.html (для React Router)
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