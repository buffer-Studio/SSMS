import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/App.css';

// Lazy load components for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const HomePage = lazy(() => import('./pages/HomePage'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Auth redirect component to handle navigation
const AuthRedirect = ({ token, user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (token && user) {
      // Small delay to ensure navigation happens after component mount
      const timer = setTimeout(() => {
        navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [token, user, navigate]);

  return <PageLoader />;
};

function App() {
  const [token, setToken] = useState(null); // Start with null, will be set by verification
  const [user, setUser] = useState(null);
  const [exhibitionMode, setExhibitionMode] = useState(false);

  // Enhanced dark mode with system detection and persistence
  const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  const getStoredTheme = () => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return 'dark'; // Default to dark mode instead of system preference
  };

  const [darkMode, setDarkMode] = useState(() => getStoredTheme() === 'dark');

  // Apply dark mode class to document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Verify token on app startup
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Verify token with backend
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          } else {
            // Token is valid, set states
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
        } catch (error) {
          // Network error or other issue, clear storage to be safe
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
    };

    verifyToken();
  }, []);

  // Enhanced dark mode setter that persists preference
  const handleSetDarkMode = (isDark) => {
    setDarkMode(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

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
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  exhibitionMode={exhibitionMode}
                  setExhibitionMode={setExhibitionMode}
                  darkMode={darkMode}
                  setDarkMode={handleSetDarkMode}
                  isAuthenticated={!!token}
                  user={user}
                  onLogout={handleLogout}
                />
              }
            />
            <Route
              path="/login"
              element={
                token ? (
                  <AuthRedirect token={token} user={user} />
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
                    setDarkMode={handleSetDarkMode}
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
                    setDarkMode={handleSetDarkMode}
                  />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" richColors />
      </Router>
    </div>
  );
}

export default App;
