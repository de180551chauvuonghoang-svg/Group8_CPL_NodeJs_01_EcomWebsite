
interface SpinnerProps {
  fullPage?: boolean;
  message?: string;
}

export default function Spinner({ fullPage = false, message = 'Đang tải dữ liệu...' }: SpinnerProps) {
  const spinnerElement = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '2rem'
    }}>
      <div className="spinner-ring" style={{
        width: '45px',
        height: '45px',
        borderRadius: '50%',
        border: '3px solid rgba(255, 255, 255, 0.05)',
        borderTop: '3px solid var(--accent-primary)',
        animation: 'spin 0.8s linear infinite'
      }} />
      {message && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{message}</p>}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(10, 11, 16, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
}
