import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { LogIn, ArrowLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoginPage = ({ onLogin, darkMode }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔍 Login attempt:', { username, apiUrl: `${API}/auth/login` });
      
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password
      });

      console.log('✅ Login response:', response.data);
      
      // Handle both 'token' and 'access_token' field names
      const token = response.data.token || response.data.access_token;
      const user = response.data.user;
      
      if (!token) {
        console.error('❌ No token in response:', response.data);
        throw new Error('No token received from server');
      }
      
      console.log('🔑 Token received:', token.substring(0, 20) + '...');
      
      onLogin(token, user);

      toast.success(`Welcome back, ${user.name || user.username}!`);

      // Navigate based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.detail || error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (username, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password
      });

      const token = response.data.token || response.data.access_token;
      const user = response.data.user;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      onLogin(token, user);
      toast.success(`Welcome back, ${user.name || user.username}!`);

      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 dark:bg-blue-900 rounded-full filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 dark:bg-purple-900 rounded-full filter blur-3xl opacity-20 translate-x-1/2 translate-y-1/2"></div>

      {/* Back button */}
      <Button
        onClick={() => navigate('/')}
        variant="ghost"
        className="absolute top-8 left-8"
        data-testid="back-to-home-button"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass p-8 rounded-3xl shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl">
                <LogIn className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sign in to access your dashboard</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                data-testid="username-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                data-testid="password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-6 rounded-xl shadow-lg hover:shadow-xl"
              data-testid="login-submit-button"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mb-3">Quick Login (Dev Mode)</p>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => handleQuickLogin('admin123', 'password123')}
                disabled={loading}
                className="w-full bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <p className="font-semibold text-blue-900 dark:text-blue-300">Admin</p>
                <p className="text-gray-600 dark:text-gray-400">admin123 / password123</p>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickLogin('t_sagnik', 'pass123')}
                  disabled={loading}
                  className="bg-gray-50 dark:bg-slate-800 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs">Sagnik Sir</p>
                  <p className="text-gray-500 dark:text-gray-500 text-xs">t_sagnik / pass123</p>
                </button>
                <button
                  onClick={() => handleQuickLogin('t_nadeem', 'pass123')}
                  disabled={loading}
                  className="bg-gray-50 dark:bg-slate-800 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs">Nadeem Sir</p>
                  <p className="text-gray-500 dark:text-gray-500 text-xs">t_nadeem / pass123</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
