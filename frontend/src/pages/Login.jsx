import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext.jsx';
import Spinner from '../components/common/Spinner.jsx';

export default function Login() {
  const { login, isAuthenticated, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setErrorMsg('');
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Sai tài khoản hoặc mật khẩu');
    }
  };

  const handleQuickLogin = (role) => {
    if (role === 'customer') {
      setEmail('customer@ecom.com');
      setPassword('password123');
    } else if (role === 'admin') {
      setEmail('admin@ecom.com');
      setPassword('password123');
    }
  };

  if (loading) return <Spinner fullPage message="Đang xác minh thông tin tài khoản..." />;

  return (
    <div className="fade-in" style={{ maxWidth: '420px', margin: '4rem auto', padding: '0 1.5rem', width: '100%' }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Đăng Nhập</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>Nhập thông tin tài khoản của bạn để tiếp tục</p>
        </div>

        {errorMsg && (
          <div className="badge-error" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Input email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="email"
              placeholder="customer@ecom.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              required
            />
          </div>
        </div>

        {/* Input password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Mật khẩu</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="••••••••"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              required
            />
          </div>
        </div>

        <button type="submit" className="gradient-btn" style={{ width: '100%', height: '44px', marginTop: '0.5rem' }}>
          <LogIn size={18} /> Đăng nhập
        </button>

        {/* Predefined mock testing credentials helper */}
        <div className="glass-panel" style={{
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed var(--border-color)',
          fontSize: '0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <span style={{ fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            💡 Đăng nhập nhanh để test thử:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('customer')}
              className="secondary-btn"
              style={{ flexGrow: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem', height: '30px' }}
            >
              Khách hàng
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="secondary-btn"
              style={{ flexGrow: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem', height: '30px' }}
            >
              Quản trị viên
            </button>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
            * Password mặc định là <strong>password123</strong>
          </span>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }} className="nav-link">Đăng ký ngay</Link>
        </div>
      </form>
    </div>
  );
}
