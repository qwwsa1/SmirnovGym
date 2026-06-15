import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import styles from './AboutPage.module.css';

export default function AboutPage() {
  const { API } = useContext(AuthContext);
  const [contacts, setContacts] = useState({});

  useEffect(() => {
    API.get('/contacts').then(res => setContacts(res.data));
  }, [API]);

  return (
    <div className={styles.about}>
      <section className={styles.hero}>
        <h1>Обо мне</h1>
        <p>Твой проводник в мир силы и здоровья</p>
      </section>

      <section className={styles.content}>
        <div className={styles.bio}>
          <div className={styles.bioImage}>
            <img src="./images/SmirnovGym.svg" alt="Тренер" />
          </div>
          <div className={styles.bioText}>
            <h2>Привет, я Влад</h2>
            <p>8 лет в спорте. Не просто тренирую — меняю жизни. За моими плечами сотни благодарных клиентов, которые наконец увидели своё отражение в зеркале и полюбили его. Моё кредо: кайф от процесса и результат, который видно невооружённым глазом.</p>

<p>Всё началось с обычного парня, который хотел просто подкачаться к лету. А закончилось тем, что спорт стал моим призванием. Я прошёл путь от новичка до мастера спорта, от простого зала — к международным сертификациям и тысячам часов тренировок.</p>

<p>Теперь я здесь — с тобой онлайн. Никаких отговорок про нехватку времени или абонемент. Тренируйся там, где удобно, когда удобно. Я сделаю так, чтобы ты полюбил своё тело и каждый день просыпался с мыслью: «Чёрт, да я крут!»</p>
          </div>
        </div>

        <div className={styles.achievements}>
          <h2>Мои достижения</h2>
          <div className={styles.achievementsGrid}>
            <div className={styles.achievementCard}>🏆 Мастер спорта по жиму лежа</div>
            <div className={styles.achievementCard}>📚 Сертифицированный тренер Российской Федерации</div>
            <div className={styles.achievementCard}>💪 Помог 500+ клиентам</div>
            <div className={styles.achievementCard}>🎥 Автор 100+ тренировочных программ</div>
          </div>
        </div>

        <div className={styles.certificates}>
          <h2>Сертификаты и награды</h2>
          <div className={styles.certsGrid}>
            <div className={styles.cert}>🏅 Российский сертификат "Фитнес Тренер"</div>
            <div className={styles.cert}>🏅 Рекорд Тверской области по "Подъему штанги на бицепс"</div>
            <div className={styles.cert}>🏅 Специалист по питанию</div>
            <div className={styles.cert}>🏅 Персональный тренер года 2025</div>
          </div>
        </div>

        <div className={styles.social}>
          <h2>Свяжись со мной</h2>
          <div className={styles.socialLinks}>
            {contacts.telegram && <a href={contacts.telegram} target="_blank" rel="noopener noreferrer"><img src="./images/icontg.svg" alt="Тренер" /> Telegram</a>}
            {contacts.vk && <a href={contacts.vk} target="_blank" rel="noopener noreferrer"><img src="./images/iconvk.svg" alt="Тренер" /> VK</a>}
            {contacts.whatsapp && <a href={`https://wa.me/${contacts.whatsapp}`} target="_blank" rel="noopener noreferrer"><img src="./images/iconinsta.svg" alt="Тренер" /> Instagram</a>}
          </div>
        </div>
      </section>
    </div>
  );
}