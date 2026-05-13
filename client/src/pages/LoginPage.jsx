import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from './LoginPage.module.css';

export default function LoginPage({ isRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка');
    }
  };

  return (
    <div className={styles.login}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>{isRegister ? 'Регистрация' : 'Вход'}</h1>
          <p>{isRegister ? 'Создай аккаунт и начни тренировки' : 'Войди в свой аккаунт'}</p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <input
                type="text"
                placeholder="Полное имя"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">{isRegister ? 'Зарегистрироваться' : 'Войти'}</button>
          </form>

          <div className={styles.switch}>
            {isRegister ? (
              <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
            ) : (
              <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}