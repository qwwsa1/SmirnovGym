import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import styles from './BlogPage.module.css';

export default function BlogPage() {
  const { API } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    API.get(`/posts?page=${page}&limit=6`).then(res => {
      setPosts(res.data.posts);
      setTotalPages(res.data.totalPages);
    });
  }, [API, page]);

  // Функция для извлечения ID видео ВК
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
    <div className={styles.blog}>
      <section className={styles.hero}>
        <h1>Блог тренировок</h1>
        <p>Видеоуроки и полезные советы</p>
      </section>

      <section className={styles.content}>
        <div className={styles.postsGrid}>
          {posts.map(post => {
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

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>← Назад</button>
            <span>Страница {page} из {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>Вперед →</button>
          </div>
        )}
      </section>

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