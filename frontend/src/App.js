import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import { Toaster } from './components/ui/sonner';
import '@/App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [exhibitionMode, setExhibitionMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
  }, [token]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const ProtectedRoute = ({ children, requiredRole }) => {
    if (!token || !user) {
      return <Navigate to="/login" replace />;
    }
    if (requiredRole && user.role !== requiredRole) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                exhibitionMode={exhibitionMode}
                setExhibitionMode={setExhibitionMode}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                isAuthenticated={!!token}
                user={user}
              />
            }
          />
          <Route
            path="/login"
            element={
              token ? (
                <Navigate
                  to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  replace
                />
              ) : (
                <LoginPage onLogin={handleLogin} darkMode={darkMode} />
              )
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard
                  user={user}
                  token={token}
                  onLogout={handleLogout}
                  exhibitionMode={exhibitionMode}
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="teacher">
                <TeacherDashboard
                  user={user}
                  token={token}
                  onLogout={handleLogout}
                  exhibitionMode={exhibitionMode}
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
