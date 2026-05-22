import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';

// Layout components
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';

// Pages components
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

function AppContent() {
  return (
    <Router>
      <Header />
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%',
        minHeight: 'calc(100vh - 70px - 100px)' // subtract Header and Footer heights approximately
      }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Fallback to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

