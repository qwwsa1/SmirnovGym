import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const { API } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [contacts, setContacts] = useState({});
  
  const [newPost, setNewPost] = useState({ title: '', content: '', video_url: '', cover_image: '' });
  const [editingPost, setEditingPost] = useState(null);
  const [newProgram, setNewProgram] = useState({ name: '', description: '', price: '', duration: '' });
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
    if (activeTab === 'posts') {
      const res = await API.get('/posts?page=1&limit=100');
      setPosts(res.data.posts);
    }
    if (activeTab === 'programs') {
      const res = await API.get('/programs');
      setPrograms(res.data);
    }
    if (activeTab === 'bookings') {
      const res = await API.get('/bookings/all');
      setAllBookings(res.data);
    }
    if (activeTab === 'reviews') {
      const res = await API.get('/reviews/pending');
      setPendingReviews(res.data);
    }
    if (activeTab === 'contacts') {
      const res = await API.get('/contacts');
      setContacts(res.data);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, loadData]);

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    try {
      const res = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.url;
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCoverImageUpload = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;
    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      if (isEdit) {
        setEditingPost({ ...editingPost, cover_image: imageUrl });
      } else {
        setNewPost({ ...newPost, cover_image: imageUrl });
      }
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    await API.post('/posts', newPost);
    setNewPost({ title: '', content: '', video_url: '', cover_image: '' });
    await loadData();
    setRefreshKey(prev => prev + 1);
  };

  const updatePost = async (e) => {
    e.preventDefault();
    await API.put(`/posts/${editingPost.id}`, editingPost);
    setEditingPost(null);
    await loadData();
    setRefreshKey(prev => prev + 1);
  };

  const deletePost = async (id) => {
    if (window.confirm('Удалить пост?')) {
      await API.delete(`/posts/${id}`);
      await loadData();
      setRefreshKey(prev => prev + 1);
    }
  };

  const startEditPost = (post) => {
    setEditingPost(post);
  };

  const cancelEdit = () => {
    setEditingPost(null);
  };

  const createProgram = async (e) => {
    e.preventDefault();
    await API.post('/programs', newProgram);
    setNewProgram({ name: '', description: '', price: '', duration: '' });
    loadData();
  };

  const deleteProgram = async (id) => {
    if (window.confirm('Удалить программу?')) {
      await API.delete(`/programs/${id}`);
      loadData();
    }
  };

  const updateBookingStatus = async (id, status) => {
    await API.put(`/bookings/${id}/status`, { status });
    loadData();
  };

  const approveReview = async (id) => {
    await API.put(`/reviews/${id}/approve`);
    loadData();
  };

  const deleteReview = async (id) => {
    await API.delete(`/reviews/${id}`);
    loadData();
  };

  const updateContacts = async (e) => {
    e.preventDefault();
    await API.put('/contacts', contacts);
    alert('Контакты обновлены');
  };

  return (
    <div className={styles.admin}>
      <section className={styles.hero}>
        <h1>Админ-панель</h1>
        <p>Управление контентом</p>
      </section>

      <section className={styles.content}>
        <div className={styles.tabs}>
          <button className={activeTab === 'posts' ? styles.tabActive : ''} onClick={() => setActiveTab('posts')}>📝 Посты</button>
          <button className={activeTab === 'programs' ? styles.tabActive : ''} onClick={() => setActiveTab('programs')}>💪 Программы</button>
          <button className={activeTab === 'bookings' ? styles.tabActive : ''} onClick={() => setActiveTab('bookings')}>📅 Записи</button>
          <button className={activeTab === 'reviews' ? styles.tabActive : ''} onClick={() => setActiveTab('reviews')}>⭐ Отзывы</button>
          <button className={activeTab === 'contacts' ? styles.tabActive : ''} onClick={() => setActiveTab('contacts')}>📞 Контакты</button>
        </div>

        {/* Посты */}
        {activeTab === 'posts' && (
          <div className={styles.tabContent}>
            {/* Форма создания нового поста */}
            <div className={styles.formCard}>
              <h3>➕ Добавить пост</h3>
              <form onSubmit={createPost}>
                <input 
                  type="text" 
                  placeholder="Заголовок" 
                  value={newPost.title} 
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})} 
                  required 
                />
                <textarea 
                  placeholder="Текст поста" 
                  value={newPost.content} 
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})} 
                  rows="4"
                />
                <input 
                  type="text" 
                  placeholder="VK Video URL" 
                  value={newPost.video_url} 
                  onChange={(e) => setNewPost({...newPost, video_url: e.target.value})} 
                />
                <div className={styles.uploadArea}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleCoverImageUpload(e, false)}
                    id="coverUpload"
                    style={{ display: 'none' }}
                  />
                  <button type="button" onClick={() => document.getElementById('coverUpload').click()} disabled={uploading}>
                    {uploading ? 'Загрузка...' : '📷 Загрузить обложку'}
                  </button>
                  {newPost.cover_image && (
                    <div className={styles.preview}>
                      <img 
                        src={`${newPost.cover_image}?t=${Date.now()}`} 
                        alt="Превью" 
                      />
                      <button type="button" onClick={() => setNewPost({...newPost, cover_image: ''})}>✕</button>
                    </div>
                  )}
                </div>
                <button type="submit">Создать пост</button>
              </form>
            </div>

            {/* Форма редактирования поста */}
            {editingPost && (
              <div className={styles.formCard}>
                <h3>✏️ Редактировать пост</h3>
                <form onSubmit={updatePost}>
                  <input 
                    type="text" 
                    placeholder="Заголовок" 
                    value={editingPost.title} 
                    onChange={(e) => setEditingPost({...editingPost, title: e.target.value})} 
                    required 
                  />
                  <textarea 
                    placeholder="Текст поста" 
                    value={editingPost.content || ''} 
                    onChange={(e) => setEditingPost({...editingPost, content: e.target.value})} 
                    rows="4"
                  />
                  <input 
                    type="text" 
                    placeholder="VK Video URL" 
                    value={editingPost.video_url || ''} 
                    onChange={(e) => setEditingPost({...editingPost, video_url: e.target.value})} 
                  />
                  <div className={styles.uploadArea}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleCoverImageUpload(e, true)}
                      id="editCoverUpload"
                      style={{ display: 'none' }}
                    />
                    <button type="button" onClick={() => document.getElementById('editCoverUpload').click()} disabled={uploading}>
                      {uploading ? 'Загрузка...' : '📷 Заменить обложку'}
                    </button>
                    {editingPost.cover_image && (
                      <div className={styles.preview}>
                        <img 
                          src={`${editingPost.cover_image}?t=${Date.now()}`} 
                          alt="Превью" 
                        />
                        <button type="button" onClick={() => setEditingPost({...editingPost, cover_image: ''})}>✕</button>
                      </div>
                    )}
                  </div>
                  <div className={styles.editButtons}>
                    <button type="submit">Сохранить</button>
                    <button type="button" onClick={cancelEdit} className={styles.cancelBtn}>Отмена</button>
                  </div>
                </form>
              </div>
            )}

            {/* Список постов */}
            <div className={styles.list} key={refreshKey}>
              <h3>📋 Все посты</h3>
              {posts.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '40px' }}>Нет постов. Добавьте первый!</p>
              ) : (
                posts.map(post => (
                  <div key={`${post.id}_${post.cover_image}`} className={styles.listItem}>
                    <div>
                      <strong>{post.title}</strong>
                      {post.cover_image && (
                        <img 
                          src={`${post.cover_image}?t=${refreshKey}`} 
                          alt="обложка" 
                          className={styles.thumbnail}
                        />
                      )}
                      <br />
                      <small style={{ color: '#888' }}>{new Date(post.created_at).toLocaleString()}</small>
                    </div>
                    <div className={styles.itemButtons}>
                      <button onClick={() => startEditPost(post)} className={styles.editBtn}>✏️ Редактировать</button>
                      <button onClick={() => deletePost(post.id)} className={styles.deleteBtn}>🗑️ Удалить</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Программы */}
        {activeTab === 'programs' && (
          <div className={styles.tabContent}>
            <div className={styles.formCard}>
              <h3>➕ Добавить программу</h3>
              <form onSubmit={createProgram}>
                <input type="text" placeholder="Название" value={newProgram.name} onChange={(e) => setNewProgram({...newProgram, name: e.target.value})} required />
                <textarea placeholder="Описание" value={newProgram.description} onChange={(e) => setNewProgram({...newProgram, description: e.target.value})} rows="3" />
                <input type="number" placeholder="Цена" value={newProgram.price} onChange={(e) => setNewProgram({...newProgram, price: e.target.value})} required />
                <input type="text" placeholder="Длительность (1 месяц)" value={newProgram.duration} onChange={(e) => setNewProgram({...newProgram, duration: e.target.value})} required />
                <button type="submit">Создать программу</button>
              </form>
            </div>
            <div className={styles.list}>
              <h3>💪 Все программы</h3>
              {programs.map(prog => (
                <div key={prog.id} className={styles.listItem}>
                  <div><strong>{prog.name}</strong> - {prog.price}₽ / {prog.duration}</div>
                  <button onClick={() => deleteProgram(prog.id)} className={styles.deleteBtn}>Удалить</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Записи */}
        {activeTab === 'bookings' && (
          <div className={styles.tabContent}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Клиент</th>
                    <th>Email</th>
                    <th>Программа</th>
                    <th>Дата</th>
                    <th>Время</th>
                    <th>Статус</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {allBookings.map(b => (
                    <tr key={b.id}>
                      <td>{b.full_name}</td>
                      <td>{b.email}</td>
                      <td>{b.program_name}</td>
                      <td>{b.booking_date}</td>
                      <td>{b.booking_time}</td>
                      <td>
                        <select value={b.status} onChange={(e) => updateBookingStatus(b.id, e.target.value)}>
                          <option value="pending">⏳ Ожидание</option>
                          <option value="confirmed">✅ Подтверждена</option>
                          <option value="cancelled">❌ Отменена</option>
                        </select>
                      </td>
                      <td>
                        <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className={styles.approveBtn}>Подтвердить</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Отзывы */}
        {activeTab === 'reviews' && (
          <div className={styles.tabContent}>
            <div className={styles.list}>
              <h3>⭐ Отзывы на модерации</h3>
              {pendingReviews.map(r => (
                <div key={r.id} className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <strong>{r.full_name}</strong> ({r.email}) - ⭐ {r.rating}
                  </div>
                  <p>{r.text}</p>
                  <div className={styles.reviewActions}>
                    <button onClick={() => approveReview(r.id)} className={styles.approveBtn}>✅ Опубликовать</button>
                    <button onClick={() => deleteReview(r.id)} className={styles.deleteBtn}>❌ Удалить</button>
                  </div>
                </div>
              ))}
              {pendingReviews.length === 0 && <p>Нет отзывов на модерации</p>}
            </div>
          </div>
        )}

        {/* Контакты */}
        {activeTab === 'contacts' && (
          <div className={styles.tabContent}>
            <div className={styles.formCard}>
              <h3>📞 Редактировать контакты</h3>
              <form onSubmit={updateContacts}>
                <input type="text" placeholder="Telegram URL" value={contacts.telegram || ''} onChange={(e) => setContacts({...contacts, telegram: e.target.value})} />
                <input type="text" placeholder="VK URL" value={contacts.vk || ''} onChange={(e) => setContacts({...contacts, vk: e.target.value})} />
                <input type="text" placeholder="WhatsApp номер" value={contacts.whatsapp || ''} onChange={(e) => setContacts({...contacts, whatsapp: e.target.value})} />
                <input type="email" placeholder="Email" value={contacts.email || ''} onChange={(e) => setContacts({...contacts, email: e.target.value})} />
                <button type="submit">Сохранить изменения</button>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}