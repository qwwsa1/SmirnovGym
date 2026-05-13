import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from './BookingPage.module.css';

export default function BookingPage() {
  const { API } = useContext(AuthContext);  // ✅ УДАЛЕНА неиспользуемая переменная user
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const times = ['10:00', '12:00', '14:00', '16:00', '18:00'];

  useEffect(() => {
    API.get('/programs').then(res => setPrograms(res.data));
    if (location.state?.programId) {
      setSelectedProgram(location.state.programId.toString());
    }
  }, [API, location]);

  const getMinDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await API.post('/bookings', {
        program_id: parseInt(selectedProgram),
        booking_date: date,
        booking_time: time,
        comment
      });
      setSuccess('✅ Запись успешно создана!');
      setTimeout(() => navigate('/profile'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при создании записи');
    } finally {
      setLoading(false);
    }
  };

  const selectedProgramData = programs.find(p => p.id === parseInt(selectedProgram));

  return (
    <div className={styles.booking}>
      <section className={styles.hero}>
        <h1>Запись на тренировку</h1>
        <p>Заполни форму и начни свой путь к идеальному телу</p>
      </section>

      <section className={styles.content}>
        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Выбери программу *</label>
              <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} required>
                <option value="">Выбери программу</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.price}₽ / {p.duration}</option>
                ))}
              </select>
            </div>

            {selectedProgramData && (
              <div className={styles.programInfo}>
                <p><strong>Описание:</strong> {selectedProgramData.description}</p>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Дата тренировки *</label>
              <input 
                type="date" 
                min={getMinDate()} 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
              />
            </div>

            <div className={styles.formGroup}>
              <label>Время тренировки *</label>
              <div className={styles.timeGrid}>
                {times.map(t => (
                  <button 
                    key={t}
                    type="button"
                    className={`${styles.timeBtn} ${time === t ? styles.timeActive : ''}`}
                    onClick={() => setTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Комментарий (необязательно)</label>
              <textarea 
                rows="4"
                placeholder="Напиши свои цели, пожелания или вопросы..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Отправка...' : 'Записаться →'}
            </button>
          </form>
        </div>

        <div className={styles.info}>
          <h3>Что тебя ждёт?</h3>
          <ul>
            <li>🏋️ Индивидуальная программа тренировок</li>
            <li>🥗 Рекомендации по питанию</li>
            <li>💬 Поддержка в мессенджере 24/7</li>
            <li>📊 Отслеживание прогресса</li>
            <li>🎥 Доступ к видео-библиотеке тренировок</li>
          </ul>
        </div>
      </section>
    </div>
  );
}