import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from './ProgramsPage.module.css';

export default function ProgramsPage() {
  const { API, user } = useContext(AuthContext);
  const [programs, setPrograms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/programs').then(res => setPrograms(res.data));
  }, [API]);

  const handleBooking = (programId) => {
    if (user) {
      navigate('/booking', { state: { programId } });
    } else {
      navigate('/login');
    }
  };

  return (
    <div className={styles.programs}>
      <section className={styles.hero}>
        <h1>Программы тренировок</h1>
        <p>Выбери свой путь к идеальному телу</p>
      </section>

      <section className={styles.content}>
        <div className={styles.programsGrid}>
          {programs.map(program => (
            <div key={program.id} className={styles.programCard}>
              <div className={styles.programHeader}>
                <h3>{program.name}</h3>
                <div className={styles.price}>{program.price}₽</div>
                <span className={styles.duration}>{program.duration}</span>
              </div>
              <div className={styles.programBody}>
                <p>{program.description}</p>
                <ul className={styles.features}>
                  <li>✅ Индивидуальный подход</li>
                  <li>✅ Чат с поддержкой</li>
                  <li>✅ Доступ к материалам 24/7</li>
                </ul>
              </div>
              <div className={styles.programFooter}>
                <button 
                  className={styles.bookBtn}
                  onClick={() => handleBooking(program.id)}
                >
                  Записаться →
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.faq}>
          <h2>Часто задаваемые вопросы</h2>
          <div className={styles.faqGrid}>
            <div className={styles.faqItem}>
              <h4>Что нужно для занятий?</h4>
              <p>Удобная одежда, коврик и желание тренироваться!</p>
            </div>
            <div className={styles.faqItem}>
              <h4>Как проходят тренировки?</h4>
              <p>Онлайн через видеосвязь или по записям тренировок.</p>
            </div>
            <div className={styles.faqItem}>
              <h4>Можно ли вернуть деньги?</h4>
              <p>Да, в течение 14 дней с момента покупки программы.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}