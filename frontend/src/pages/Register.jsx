import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext.jsx';
import Spinner from '../components/common/Spinner.jsx';

export default function Register() {
  const { register, isAuthenticated, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name || !email || !password || !confirmPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu nhập lại không trùng khớp');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có độ dài ít nhất 6 ký tự');
      return;
    }

    try {
      await register(name, email, password);
      setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển hướng...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi đăng ký tài khoản. Vui lòng thử lại.');
    }
  };

  if (loading) return <Spinner fullPage message="Đang tạo tài khoản của bạn..." />;

  return (
    <div className="fade-in" style={{ maxWidth: '420px', margin: '4rem auto', padding: '0 1.5rem', width: '100%' }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Đăng Ký</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>Tạo một tài khoản mới để trải nghiệm mua sắm</p>
        </div>

        {errorMsg && (
          <div className="badge-error" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="badge-success" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        {/* Input name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Họ và tên</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="VD: Nguyễn Văn A"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              required
            />
          </div>
        </div>

        {/* Input email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="email"
              placeholder="customer2@ecom.com"
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
              placeholder="Tối thiểu 6 ký tự"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              required
            />
          </div>
        </div>

        {/* Input confirm password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Nhập lại mật khẩu</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="••••••••"
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              required
            />
          </div>
        </div>

        <button type="submit" className="gradient-btn" style={{ width: '100%', height: '44px', marginTop: '0.5rem' }}>
          <UserPlus size={18} /> Đăng ký tài khoản
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }} className="nav-link">Đăng nhập</Link>
        </div>
      </form>
    </div>
  );
}
