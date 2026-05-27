import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AnimatePresence } from 'framer-motion';

// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Pages components
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      {!isAuthPage && <Header />}
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%',
        minHeight: !isAuthPage ? 'calc(100vh - 70px - 100px)' : '100vh',
        overflow: 'hidden'
      }}>
        <AnimatePresence mode="popLayout">
          <Routes location={location} key={location.pathname}>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Fallback to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
