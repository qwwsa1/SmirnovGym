import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import './App.css';

import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProgramsPage from './pages/ProgramsPage';
import BlogPage from './pages/BlogPage';
import BookingPage from './pages/BookingPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

// API настройки
const API = axios.create({ baseURL: 'http://localhost:5000/api' });
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// Auth Context
const AuthContext = createContext();
export { AuthContext };  // Экспортируем контекст

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      API.get('/auth/profile')
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('token'); setUser(null); })
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password, full_name) => {
    await API.post('/auth/register', { email, password, full_name });
    return login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout, loading, API }}>{children}</AuthContext.Provider>;
}

// Header компонент
function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };

  return (
    <header className="header">
      <div className="container header-container">
        <Link to="/" className="logo">SMIRNOV<span>GYM</span></Link>
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>Главная</Link>
          <Link to="/about" onClick={() => setMenuOpen(false)}>О тренере</Link>
          <Link to="/programs" onClick={() => setMenuOpen(false)}>Программы</Link>
          <Link to="/blog" onClick={() => setMenuOpen(false)}>Блог</Link>
          {user ? (
            <>
              <Link to="/booking" onClick={() => setMenuOpen(false)}>Запись</Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)}>Профиль</Link>
              {user.role === 'admin' && <Link to="/admin" onClick={() => setMenuOpen(false)}>Админка</Link>}
              <button onClick={handleLogout} className="logout-btn">Выйти</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Вход</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)}>Регистрация</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

// Footer компонент
function Footer() {
  const [contacts, setContacts] = useState({});
  const year = new Date().getFullYear();

  useEffect(() => {
    API.get('/contacts').then(res => setContacts(res.data));
  }, []);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div>
            <h3>SMIRNOV GYM</h3>
            <p>Твой путь к идеальному телу</p>
          </div>
          <div>
            <h4>Контакты</h4>
            {contacts.telegram && <a href={contacts.telegram} target="_blank" rel="noopener noreferrer"><img src="./images/icontg.svg" alt="Тренер" />Telegram</a>}
            {contacts.vk && <a href={contacts.vk} target="_blank" rel="noopener noreferrer"><img src="./images/iconvk.svg" alt="Тренер" />VK</a>}
            {contacts.email && <a href={`mailto:${contacts.email}`}><img src="./images/iconmail.svg" alt="Тренер" />{contacts.email}</a>}
          </div>
          <div>
            <h4>Навигация</h4>
            <a href="/about">О тренере</a>
            <a href="/programs">Программы</a>
            <a href="/blog">Блог</a>
          </div>
        </div>
        <div className="footer-bottom">© {year} SMIRNOV GYM. Все права защищены.</div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/programs" element={<ProgramsPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/login" element={<LoginPage isRegister={false} />} />
              <Route path="/register" element={<LoginPage isRegister={true} />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;