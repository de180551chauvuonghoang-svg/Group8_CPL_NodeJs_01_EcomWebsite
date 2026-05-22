import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Store } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

export default function Header() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('Header must be used within an AuthProvider');
  }
  const { user, logout, isAuthenticated } = auth;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="glass-panel" style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      borderRadius: '0 0 var(--radius-md) var(--radius-md)',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      padding: '0 1.5rem',
      background: 'rgba(10, 11, 16, 0.75)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '70px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Store size={26} className="gradient-text" style={{ color: 'var(--accent-primary)' }} />
          <span className="gradient-text" style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            E-Com FPT
          </span>
        </Link>

        {/* Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 500,
            fontSize: '0.95rem',
            color: 'var(--text-secondary)'
          }} className="nav-link">
            Cửa hàng
          </Link>

          {/* User authenticated block */}
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ maxWidth: '1200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Hi, {user.name} {user.role ? `(${user.role})` : ''}
                  </span>
                </div>
              </div>

              <button onClick={handleLogout} style={{
                background: 'none',
                border: 'none',
                color: 'var(--error)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                transition: 'var(--transition-fast)'
              }} title="Đăng xuất">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <Link to="/login" className="secondary-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', height: '36px' }}>
                Đăng nhập
              </Link>
              <Link to="/register" className="gradient-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', height: '36px' }}>
                Đăng ký
              </Link>
            </div>
          )}
        </nav>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .nav-link:hover {
          color: var(--accent-primary) !important;
        }
      `}} />
    </header>
  );
}
