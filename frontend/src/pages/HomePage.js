import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Moon, Sun } from 'lucide-react';

const HomePage = ({ darkMode, setDarkMode, isAuthenticated, user }) => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-blue-200 dark:bg-blue-900 rounded-full filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-purple-200 dark:bg-purple-900 rounded-full filter blur-3xl opacity-20 translate-x-1/2 translate-y-1/2"></div>

      {/* Top controls */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-full shadow-lg hover:shadow-xl"
          data-testid="dark-mode-toggle"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />}
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center space-y-6 sm:space-y-8 max-w-4xl px-4">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl">
              <svg className="w-16 h-16 sm:w-20 sm:h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight px-4">
            School Scheduling
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              Management System
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
            Streamline your school's timetable management with real-time updates,
            conflict detection, and seamless teacher coordination.
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-4 sm:pt-6">
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg rounded-full shadow-xl hover:shadow-2xl w-full sm:w-auto"
            data-testid="login-button"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Login'}
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-8 sm:pt-12">
          <div className="glass p-5 sm:p-6 rounded-xl sm:rounded-2xl text-left space-y-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Real-time Updates</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Teachers get instant notifications when schedules change</p>
          </div>

          <div className="glass p-5 sm:p-6 rounded-xl sm:rounded-2xl text-left space-y-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Conflict Detection</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Automatically prevent double-booking and scheduling errors</p>
          </div>

          <div className="glass p-5 sm:p-6 rounded-xl sm:rounded-2xl text-left space-y-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Easy Management</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Simple interface for admins to manage teachers and schedules</p>
          </div>
        </div>

        {/* Credits */}
        <div className="pt-6 sm:pt-8 pb-4">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 flex items-center justify-center gap-1 sm:gap-2 flex-wrap px-4">
            <span>Created by</span>
            <a
              href="https://bento.me/buffer"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Yuvraj
            </a>
            <span>,</span>
            <a
              href="https://discord.com/users/1021765669185925150"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Naman
            </a>
            <span>&</span>
            <a
              href="https://discord.com/users/779311662737784862"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Supriyo
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
