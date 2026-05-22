import { Store, Shield, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      padding: '3rem 1.5rem 1.5rem 1.5rem',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '2.5rem',
        paddingBottom: '2.5rem'
      }}>
        {/* Brand section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Store size={22} style={{ color: 'var(--accent-primary)' }} />
            <span className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 800 }}>E-Com FPT</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            Dự án Codebase chuẩn cho thương mại điện tử (E-commerce). Được thiết kế tối ưu, có tính mở rộng cao và trải nghiệm người dùng cao cấp.
          </p>
        </div>

        {/* Links section */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem', color: 'var(--text-primary)' }}>Công nghệ sử dụng</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <li>React JS + Vite</li>
            <li>Node.js + Express</li>
            <li>In-memory Service Layers</li>
            <li>Pure CSS & Custom Tokens</li>
          </ul>
        </div>

        {/* Support section */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem', color: 'var(--text-primary)' }}>Tính năng nổi bật</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <li>Xác thực bảo mật với JWT</li>
            <li>Quản lý trạng thái Context API</li>
            <li>Cơ sở dữ liệu In-Memory linh hoạt</li>
            <li>Thiết kế Glassmorphism & HSL</li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div>
          © {new Date().getFullYear()} E-Com FPT. All rights reserved.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Made with <Heart size={12} style={{ color: 'var(--accent-secondary)' }} /> for developers
          </span>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
            Github
          </a>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Shield size={14} /> Secure Base
          </span>
        </div>
      </div>
    </footer>
  );
}
