import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { user, API } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [latestPosts, setLatestPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [contacts, setContacts] = useState({});
  const [selectedPost, setSelectedPost] = useState(null); // Добавляем состояние для модального окна

  useEffect(() => {
    API.get('/posts/latest').then(res => setLatestPosts(res.data));
    API.get('/reviews').then(res => setReviews(res.data));
    API.get('/programs').then(res => setPrograms(res.data));
    API.get('/contacts').then(res => setContacts(res.data));
  }, [API]);

  const scrollToBooking = () => user ? navigate('/booking') : navigate('/login');

  // Функция для получения ID видео ВК
  const getVKVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/video(-?\d+_\d+)/);
    return match ? match[1] : null;
  };

  // Функция для получения embed кода ВК
  const getVKEmbedUrl = (videoId) => {
    if (!videoId) return null;
    return `https://vk.com/video_ext.php?oid=${videoId.split('_')[0]}&id=${videoId.split('_')[1]}&hd=1`;
  };

  const openModal = (post) => setSelectedPost(post);
  const closeModal = () => setSelectedPost(null);

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Я изменю твоё тело</h1>
          <p className={styles.subtitle}>Хватит мечтать — начни тренироваться.</p>
          <button className={styles.ctaButton} onClick={scrollToBooking}>Начать тренировки</button>
        </div>
        <div className={styles.heroImage}>
          <img src="./images/Vlad.svg" alt="Тренер" />
        </div>
      </section>

      <section className={styles.services}>
        <h2>Мои услуги</h2>
        <div className={styles.cards}>
          {programs.slice(0, 3).map(p => (
            <div key={p.id} className={styles.card}>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <span className={styles.price}>{p.price}₽ / {p.duration}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.latestPosts}>
        <h2>Мой блог</h2>
        <div className={styles.postsGrid}>
          {latestPosts.map(post => {
            const videoId = getVKVideoId(post.video_url);
            return (
              <div key={post.id} className={styles.postCard} onClick={() => openModal(post)}>
                {/* Показываем обложку, если нет видео */}
                {!videoId && post.cover_image && (
                  <div className={styles.videoPreview}>
                    <img 
                      src={`http://localhost:5000${post.cover_image}`} 
                      alt={post.title} 
                    />
                    <div className={styles.playBtn}>▶</div>
                  </div>
                )}
                
                {/* Показываем видео, если есть */}
                {videoId && (
                  <div className={styles.videoPreview}>
                    <iframe 
                      width="100%" 
                      height="100%" 
                      src={getVKEmbedUrl(videoId)} 
                      frameBorder="0" 
                      allowFullScreen 
                      title={post.title}
                    ></iframe>
                  </div>
                )}
                
                <div className={styles.postInfo}>
                  <h3>{post.title}</h3>
                  <p>{post.content?.substring(0, 100)}...</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.reviews}>
        <h2>Отзывы клиентов</h2>
        <div className={styles.reviewsGrid}>
          {reviews.slice(0, 3).map(r => (
            <div key={r.id} className={styles.reviewCard}>
              <p>"{r.text}"</p>
              <div className={styles.stars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              <strong>{r.full_name}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.social}>
        <h2>Свяжись со мной</h2>
        <div className={styles.socialLinks}>
          {contacts.telegram && <a href={contacts.telegram} target="_blank" rel="noopener noreferrer"><img src="./images/icontg.svg" alt="Telegram" /> Telegram</a>}
          {contacts.vk && <a href={contacts.vk} target="_blank" rel="noopener noreferrer"><img src="./images/iconvk.svg" alt="VK" /> VK</a>}
        </div>
      </section>

      {/* Модальное окно для просмотра видео */}
      {selectedPost && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeModal}>×</button>
            <h2>{selectedPost.title}</h2>
            {(() => {
              const videoId = getVKVideoId(selectedPost.video_url);
              if (videoId) {
                const embedUrl = getVKEmbedUrl(videoId);
                return (
                  <iframe 
                    width="100%" 
                    height="400" 
                    src={embedUrl}
                    frameBorder="0" 
                    allowFullScreen 
                    title={selectedPost.title}
                  ></iframe>
                );
              }
              return null;
            })()}
            <p>{selectedPost.content}</p>
          </div>
        </div>
      )}
    </div>
  );
}