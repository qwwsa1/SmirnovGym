import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { API, user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    const bookingsRes = await API.get('/bookings/my');
    setBookings(bookingsRes.data);
    
    const reviewsRes = await API.get('/reviews');
    const userReviews = reviewsRes.data.filter(r => r.full_name === user?.full_name);
    setReviews(userReviews);
  };

  // ✅ ИСПРАВЛЕНО: добавлена зависимость loadData
  useEffect(() => {
    loadData();
  }, [loadData]);

  const cancelBooking = async (id) => {
    if (window.confirm('Отменить запись?')) {
      await API.delete(`/bookings/${id}`);
      loadData();
      setMessage('✅ Запись отменена');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    
    await API.post('/reviews', { text: reviewText, rating: reviewRating });
    setReviewText('');
    setReviewRating(5);
    setMessage('✅ Отзыв отправлен на модерацию');
    setTimeout(() => setMessage(''), 3000);
    loadData();
  };

  const getStatusBadge = (status) => {
    const statuses = {
      pending: { text: '⏳ Ожидание', class: styles.statusPending },
      confirmed: { text: '✅ Подтверждена', class: styles.statusConfirmed },
      cancelled: { text: '❌ Отменена', class: styles.statusCancelled }
    };
    return statuses[status] || statuses.pending;
  };

  return (
    <div className={styles.profile}>
      <section className={styles.hero}>
        <h1>Мой профиль</h1>
        <p>Привет, {user?.full_name}!</p>
      </section>

      <section className={styles.content}>
        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.bookingsSection}>
          <h2>Мои записи</h2>
          {bookings.length === 0 ? (
            <div className={styles.empty}>У тебя пока нет записей</div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Программа</th>
                    <th>Дата</th>
                    <th>Время</th>
                    <th>Статус</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => {
                    const status = getStatusBadge(b.status);
                    return (
                      <tr key={b.id}>
                        <td>{b.program_name}</td>
                        <td>{b.booking_date}</td>
                        <td>{b.booking_time}</td>
                        <td><span className={status.class}>{status.text}</span></td>
                        <td>
                          {b.status !== 'cancelled' && (
                            <button onClick={() => cancelBooking(b.id)} className={styles.cancelBtn}>
                              Отменить
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.reviewSection}>
          <h2>Оставить отзыв</h2>
          <form onSubmit={submitReview} className={styles.reviewForm}>
            <textarea
              rows="4"
              placeholder="Расскажи о своём опыте тренировок..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              required
            />
            <div className={styles.rating}>
              <span>Оценка: </span>
              {[1,2,3,4,5].map(r => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.starBtn} ${reviewRating >= r ? styles.starActive : ''}`}
                  onClick={() => setReviewRating(r)}
                >
                  ★
                </button>
              ))}
            </div>
            <button type="submit" className={styles.submitBtn}>Отправить отзыв</button>
          </form>
        </div>

        {reviews.length > 0 && (
          <div className={styles.myReviews}>
            <h2>Мои отзывы</h2>
            {reviews.map(r => (
              <div key={r.id} className={styles.reviewCard}>
                <div className={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div>
                <p>{r.text}</p>
                <span className={r.is_approved ? styles.approved : styles.pending}>
                  {r.is_approved ? '✓ Опубликован' : '⏳ На модерации'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}