import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { LogOut, Moon, Sun, RefreshCw, Clock, QrCode, Calendar, Activity, User } from 'lucide-react';
import TimetableGrid from '../components/TimetableGrid';
import ChangeLogPanel from '../components/ChangeLogPanel';
import QRCodeModal from '../components/QRCodeModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeacherDashboard = ({ user, token, onLogout, exhibitionMode, darkMode, setDarkMode }) => {
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
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/settings/break-period`),
        axios.get(`${API}/changelogs`, {
          headers: { Authorization: `Bearer ${token}` }
        })
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

  const isRecentChange = (updatedAt) => {
    if (!updatedAt) return false;

    const updatedDate = new Date(updatedAt);
    const now = new Date();
    const diffMs = now - updatedDate;

    // Consider it recent if updated within the last 24 hours
    // But exclude schedules that were likely loaded as demo data
    // (demo data timestamps are usually very close together)
    const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const demoThreshold = 5 * 60 * 1000; // 5 minutes - if updated very recently, likely demo data

    return diffMs < recentThreshold && diffMs > demoThreshold;
  };

  const scheduleStats = {
    totalClasses: schedules.length,
    thisWeek: schedules.length, // All current schedules are "this week" for now
    recentChanges: changelogs.length
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back, {user.name}</p>
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
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
            <Button onClick={onLogout} variant="outline" data-testid="logout-button">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-blue-900 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Classes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{scheduleStats.totalClasses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-blue-900 p-2 rounded-lg">
                  <Activity className="w-5 h-5 text-green-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{scheduleStats.thisWeek}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 dark:bg-blue-900 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recent Changes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{scheduleStats.recentChanges}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert for recent changes */}
        {changelogs.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-900 dark:text-orange-300">Schedule Updates</h3>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                  You have {changelogs.length} recent schedule change{changelogs.length !== 1 ? 's' : ''}.
                  Updated entries are highlighted in orange.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 shadow-sm">
            <TabsTrigger value="schedule" data-testid="schedule-tab">
              <Calendar className="w-4 h-4 mr-2" />
              My Schedule
            </TabsTrigger>
            <TabsTrigger value="changes" data-testid="changes-tab">
              <Activity className="w-4 h-4 mr-2" />
              Changes ({changelogs.length})
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="profile-tab">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Weekly Timetable
                </CardTitle>
                <CardDescription>
                  Your complete schedule for the week
                  <span className="ml-2 text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimetableGrid
                  schedules={schedules}
                  breakAfter={breakAfter}
                  isRecentChange={isRecentChange}
                  isAdmin={false}
                />

                {schedules.length === 0 && (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 dark:bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Schedule Yet</h3>
                    <p className="text-gray-500 dark:text-gray-400">Your schedule will appear here once it's assigned by an administrator.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Changes Tab */}
          <TabsContent value="changes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Schedule Changes
                </CardTitle>
                <CardDescription>
                  Recent updates to your schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChangeLogPanel changelogs={changelogs} />

                {changelogs.length === 0 && (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 dark:bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Changes Yet</h3>
                    <p className="text-gray-500 dark:text-gray-400">Schedule changes will appear here when they occur.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Teacher Profile
                </CardTitle>
                <CardDescription>
                  Your account information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Info */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 dark:from-blue-500 dark:to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">Teacher</Badge>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">Account Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">User ID:</span>
                        <span className="text-gray-900 dark:text-white font-mono">{user.id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Role:</span>
                        <span className="text-gray-900 dark:text-white capitalize">{user.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Joined:</span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">Quick Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Classes:</span>
                        <span className="text-gray-900 dark:text-white">{scheduleStats.totalClasses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">This Week:</span>
                        <span className="text-gray-900 dark:text-white">{scheduleStats.thisWeek}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Changes:</span>
                        <span className="text-gray-900 dark:text-white">{scheduleStats.recentChanges}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal open={showQRModal} onClose={() => setShowQRModal(false)} />
    </div>
  );
};

export default TeacherDashboard;
