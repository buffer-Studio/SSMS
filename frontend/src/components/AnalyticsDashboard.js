import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart3, Users, Calendar, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AnalyticsDashboard = ({ token }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all data needed for analytics
      const [schedulesRes, teachersRes, changelogsRes] = await Promise.all([
        axios.get(`${API}/schedules`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/changelogs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const schedules = schedulesRes.data;
      const teachers = teachersRes.data.filter(user => user.role === 'teacher');
      const changelogs = changelogsRes.data;

      // Calculate analytics
      const totalSchedules = schedules.length;
      const totalTeachers = teachers.length;
      const totalChanges = changelogs.length;

      // Teacher workload analysis
      const teacherWorkload = teachers.map(teacher => {
        const teacherSchedules = schedules.filter(s => s.teacher_id === teacher.id);
        return {
          name: teacher.name,
          schedules: teacherSchedules.length,
          subjects: [...new Set(teacherSchedules.map(s => s.subject))]
        };
      });

      // Subject distribution
      const subjectDistribution = schedules.reduce((acc, schedule) => {
        acc[schedule.subject] = (acc[schedule.subject] || 0) + 1;
        return acc;
      }, {});

      // Recent changes (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentChanges = changelogs.filter(log =>
        new Date(log.timestamp) > sevenDaysAgo
      ).length;

      // Class utilization
      const classUtilization = schedules.reduce((acc, schedule) => {
        acc[schedule.class_name] = (acc[schedule.class_name] || 0) + 1;
        return acc;
      }, {});

      setAnalytics({
        totalSchedules,
        totalTeachers,
        totalChanges,
        teacherWorkload,
        subjectDistribution,
        recentChanges,
        classUtilization
      });

      setLastRefresh(new Date());
    } catch (error) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  const handleRefresh = () => {
    fetchAnalytics();
    toast.success('Analytics refreshed');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Failed to load analytics</p>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              System insights and statistics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalSchedules}</div>
              <p className="text-xs text-muted-foreground">
                Active schedule entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalTeachers}</div>
              <p className="text-xs text-muted-foreground">
                Registered teachers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Changes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalChanges}</div>
              <p className="text-xs text-muted-foreground">
                All-time schedule changes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Changes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.recentChanges}</div>
              <p className="text-xs text-muted-foreground">
                Changes in last 7 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="teachers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="teachers">Teacher Workload</TabsTrigger>
            <TabsTrigger value="subjects">Subject Distribution</TabsTrigger>
            <TabsTrigger value="classes">Class Utilization</TabsTrigger>
          </TabsList>

          <TabsContent value="teachers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Teacher Workload Analysis</CardTitle>
                <CardDescription>
                  Distribution of schedules across teachers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.teacherWorkload.map((teacher, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-green-700 dark:text-blue-300">
                              {teacher.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{teacher.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {teacher.subjects.length} unique subject{teacher.subjects.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{teacher.schedules}</div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">schedules</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subject Distribution</CardTitle>
                <CardDescription>
                  How many classes are scheduled for each subject
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(analytics.subjectDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .map(([subject, count]) => (
                    <div key={subject} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="font-medium">{subject}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Class Utilization</CardTitle>
                <CardDescription>
                  How many periods are scheduled for each class
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(analytics.classUtilization)
                    .sort(([,a], [,b]) => b - a)
                    .map(([className, count]) => (
                    <div key={className} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="font-medium">{className}</span>
                      <Badge variant="secondary">{count} period{count !== 1 ? 's' : ''}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
