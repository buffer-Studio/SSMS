import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { LogOut, Moon, Sun, RefreshCw, Clock, QrCode } from 'lucide-react';

import { Button } from '../components/ui/button';
import TimetableGrid from '../components/TimetableGrid';
import ChangeLogPanel from '../components/ChangeLogPanel';
import QRCodeModal from '../components/QRCodeModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeacherDashboard = ({
  user,
  token,
  onLogout,
  exhibitionMode,
  darkMode,
  setDarkMode,
}) => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [breakAfter, setBreakAfter] = useState(3);
  const [changelogs, setChangelogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schedulesRes, settingsRes, changelogsRes] = await Promise.all([
        axios.get(`${API}/schedules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/settings/break-period`),
        axios.get(`${API}/changelogs`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setSchedules(schedulesRes.data);
      setBreakAfter(settingsRes.data.break_after_period);
      setChangelogs(changelogsRes.data);
      setLastRefresh(new Date());
    } catch (error) {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
    toast.success('Schedule refreshed');
  };

  const isRecentChange = updatedAt => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const hoursDiff = (now - updated) / (1000 * 60 * 60);
    return hoursDiff < 24; // Highlight changes within last 24 hours
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {exhibitionMode && (
        <div className="exhibition-badge">Exhibition Mode Active</div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Schedule
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome, {user.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowQRModal(true)}
              variant="outline"
              size="sm"
              data-testid="qr-code-button"
            >
              <QrCode className="w-4 h-4 mr-2" />
              QR Login
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              data-testid="refresh-button"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow hover:shadow-lg"
              data-testid="dark-mode-toggle"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </button>
            <Button
              onClick={onLogout}
              variant="outline"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Alert for recent changes */}
        {changelogs.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-900 dark:text-orange-300">
                  Schedule Updates
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                  You have {changelogs.length} recent schedule change
                  {changelogs.length !== 1 ? 's' : ''}. Updated entries are
                  highlighted in orange.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Timetable */}
          <div className="lg:col-span-2">
            <div className="glass p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Weekly Timetable
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
              </div>

              <TimetableGrid
                schedules={schedules}
                breakAfter={breakAfter}
                isRecentChange={isRecentChange}
                isAdmin={false}
              />

              {schedules.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    No schedule assigned yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Change log panel */}
          <div className="lg:col-span-1">
            <ChangeLogPanel changelogs={changelogs} />
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal open={showQRModal} onClose={() => setShowQRModal(false)} />
    </div>
  );
};

export default TeacherDashboard;
