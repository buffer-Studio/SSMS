import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { LogOut, Moon, Sun, RefreshCw, Clock, QrCode, Lock, Send, History, X } from 'lucide-react';
import TimetableGrid from '../components/TimetableGrid';
import ChangeLogPanel from '../components/ChangeLogPanel';
import QRCodeModal from '../components/QRCodeModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ScheduleChangeRequestModal from '../components/ScheduleChangeRequestModal';
import { API } from '../config/api';

const TeacherDashboard = ({ user, token, onLogout, darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const timetableRef = useRef(null);
  const [schedules, setSchedules] = useState([]);
  const [breakAfter, setBreakAfter] = useState(3);
  const [changelogs, setChangelogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showQRModal, setShowQRModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showScheduleRequest, setShowScheduleRequest] = useState(false);
  const [showChangeLog, setShowChangeLog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-scroll to timetable when loaded
  useEffect(() => {
    if (!loading && mySchedules.length > 0 && timetableRef.current) {
      setTimeout(() => {
        const element = timetableRef.current;
        const headerOffset = 20; // Small offset from top
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }, 400);
    }
  }, [loading]);

  const fetchData = async () => {
    try {
      console.log('📡 Fetching data from:', API);
      console.log('🔑 Token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
      
      const [schedulesRes, settingsRes, changelogsRes] = await Promise.all([
        axios.get(`${API}/schedules`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/settings/break-period`),
        axios.get(`${API}/changelogs`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      console.log('✅ Schedules loaded:', schedulesRes.data.length);
      setSchedules(schedulesRes.data);
      setBreakAfter(settingsRes.data.break_after_period);
      setChangelogs(changelogsRes.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to load schedule';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
    toast.success('Schedule refreshed');
  };

  const isRecentChange = (updatedAt) => {
    if (!updatedAt) return false;
    const now = new Date();
    const updated = new Date(updatedAt);
    const hoursDiff = (now - updated) / (1000 * 60 * 60);
    return hoursDiff < 24; // Highlight changes within last 24 hours
  };

  // Filter only teacher's own schedules
  const mySchedules = schedules.filter(s => s.teacher_id === user.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              My Schedule
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome, {user.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              onClick={() => setShowScheduleRequest(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex-1 sm:flex-none"
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Request Change
            </Button>
            <Button
              onClick={() => setShowChangePassword(true)}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Lock className="w-4 h-4 mr-2" />
              Password
            </Button>
            <Button
              onClick={() => setShowQRModal(true)}
              variant="outline"
              size="sm"
              className="hidden sm:flex"
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
              <RefreshCw className="w-4 h-4" />
            </Button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow hover:shadow-lg transition-all"
              data-testid="dark-mode-toggle"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
            <Button onClick={onLogout} variant="outline" size="sm" data-testid="logout-button">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Alert for recent changes */}
        {changelogs.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 md:p-4 mb-4 md:mb-6 shadow-sm">
            <div className="flex items-start gap-2 md:gap-3">
              <div className="bg-orange-500 dark:bg-orange-600 p-1.5 md:p-2 rounded-lg shadow-md">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm md:text-base font-semibold text-orange-900 dark:text-orange-300">Schedule Updates</h3>
                <p className="text-xs md:text-sm text-orange-700 dark:text-orange-400 mt-1">
                  You have {changelogs.length} recent schedule change{changelogs.length !== 1 ? 's' : ''} in the last 24 hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timetable with changelog button */}
        <div className="glass p-3 md:p-4 lg:p-6 rounded-xl md:rounded-2xl shadow-lg">
          <div ref={timetableRef} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
              Weekly Timetable
            </h2>
            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setShowChangeLog(!showChangeLog)}
                variant={showChangeLog ? "default" : "outline"}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <History className="w-4 h-4 mr-2" />
                {showChangeLog ? 'Hide' : 'Show'} Changelog
              </Button>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <TimetableGrid
                schedules={mySchedules}
                breakAfter={breakAfter}
                isRecentChange={isRecentChange}
                isAdmin={false}
              />
            </div>
          </div>

          {mySchedules.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-block p-4 bg-gray-100 dark:bg-slate-800 rounded-full mb-4">
                <Clock className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No schedule assigned yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Contact admin to set up your timetable</p>
            </div>
          )}
        </div>

      </div>

      {/* Changelog Bottom Popup */}
      {showChangeLog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
            onClick={() => setShowChangeLog(false)}
          />
          
          {/* Popup Panel */}
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="glass max-w-4xl mx-auto mb-0 sm:mb-4 sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header with close button */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg">
                    <History className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Recent Changes</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Schedule updates from the last 24 hours</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowChangeLog(false)}
                  variant="ghost"
                  size="sm"
                  className="rounded-full hover:bg-red-100 dark:hover:bg-red-900/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Scrollable content */}
              <div className="overflow-y-auto p-4 sm:p-6">
                <ChangeLogPanel changelogs={changelogs} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* QR Code Modal */}
      <QRCodeModal open={showQRModal} onClose={() => setShowQRModal(false)} />
      
      {/* Change Password Modal */}
      <ChangePasswordModal 
        open={showChangePassword} 
        onClose={() => setShowChangePassword(false)}
        token={token}
      />

      {/* Schedule Change Request Modal */}
      <ScheduleChangeRequestModal
        open={showScheduleRequest}
        onClose={() => setShowScheduleRequest(false)}
        token={token}
      />
    </div>
  );
};

export default TeacherDashboard;
