import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { LogOut, Moon, Sun, Users, Calendar, Settings as SettingsIcon, Plus, Trash2, Edit2, QrCode, AlertTriangle } from 'lucide-react';
import TimetableGrid from '../components/TimetableGrid';
import QRCodeModal from '../components/QRCodeModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const AdminDashboard = ({ user, token, onLogout, exhibitionMode, darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [breakAfter, setBreakAfter] = useState(3);
  const [loading, setLoading] = useState(true);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleSlot, setScheduleSlot] = useState({ day: '', period: null });

  const [newTeacher, setNewTeacher] = useState({
    username: '',
    password: '',
    name: ''
  });

  const [newScheduleEntry, setNewScheduleEntry] = useState({
    subject: '',
    class_name: ''
  });

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    variant: 'default'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teachersRes, schedulesRes, settingsRes] = await Promise.all([
        axios.get(`${API}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/schedules`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/settings/break-period`)
      ]);

      setTeachers(teachersRes.data.filter(u => u.role === 'teacher'));
      setSchedules(schedulesRes.data);
      setBreakAfter(settingsRes.data.break_after_period);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users`, newTeacher, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Teacher added successfully');
      setShowAddTeacher(false);
      setNewTeacher({ username: '', password: '', name: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add teacher');
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Teacher?',
      description: 'This action cannot be undone. This will permanently delete the teacher and all associated schedules.',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await axios.delete(`${API}/users/${teacherId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success('Teacher deleted successfully');
          fetchData();
        } catch (error) {
          toast.error('Failed to delete teacher');
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  const handleUpdateBreak = async (value) => {
    try {
      await axios.put(`${API}/settings/break-period?break_after=${value}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBreakAfter(value);
      toast.success(`Break period updated to after Period ${value}`);
    } catch (error) {
      toast.error('Failed to update break period');
    }
  };

  const handleScheduleClick = (schedule) => {
    setSelectedSchedule(schedule);
    setShowEditSchedule(true);
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updateData = {
      subject: formData.get('subject'),
      class_name: formData.get('class_name')
    };

    try {
      await axios.put(`${API}/schedules/${selectedSchedule.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Schedule updated successfully');
      setShowEditSchedule(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update schedule');
    }
  };

  const handleAddScheduleEntry = async (day, period) => {
    if (!selectedTeacher) {
      toast.error('Please select a teacher first');
      return;
    }

    // Open the modal with the selected day and period
    setScheduleSlot({ day, period });
    setNewScheduleEntry({ subject: '', class_name: '' });
    setShowAddScheduleModal(true);
  };

  const handleSubmitScheduleEntry = async (e) => {
    e.preventDefault();

    if (!selectedTeacher) {
      toast.error('Please select a teacher first');
      return;
    }

    const teacher = teachers.find(t => t.id === selectedTeacher);

    try {
      await axios.post(`${API}/schedules`, {
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        day: scheduleSlot.day,
        period: scheduleSlot.period,
        subject: newScheduleEntry.subject.trim(),
        class_name: newScheduleEntry.class_name.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Schedule entry added successfully!');
      setShowAddScheduleModal(false);
      setNewScheduleEntry({ subject: '', class_name: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Schedule Entry?',
      description: 'This will permanently remove this schedule entry from the timetable.',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await axios.delete(`${API}/schedules/${scheduleId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success('Schedule deleted successfully');
          setShowEditSchedule(false);
          fetchData();
        } catch (error) {
          toast.error('Failed to delete schedule');
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  const handleLoadDemoSchedules = async () => {
    setConfirmDialog({
      open: true,
      title: 'Load Demo Schedules?',
      description: 'This will replace all existing schedules with demo data. This action cannot be undone.',
      variant: 'default',
      onConfirm: async () => {
        try {
          await axios.post(`${API}/demo/load-schedules`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success('Demo schedules loaded successfully!');
          fetchData();
        } catch (error) {
          toast.error('Failed to load demo schedules');
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  const handleClearAllSchedules = async () => {
    setConfirmDialog({
      open: true,
      title: 'Clear All Schedules?',
      description: 'This will permanently delete ALL schedules and changelogs. This is a destructive action that cannot be undone!',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await axios.post(`${API}/demo/clear-schedules`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success('All schedules cleared');
          fetchData();
        } catch (error) {
          toast.error('Failed to clear schedules');
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome, {user.name}</p>
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

        {/* Tabs */}
        <Tabs defaultValue="schedules" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 shadow-sm">
            <TabsTrigger value="schedules" data-testid="schedules-tab">
              <Calendar className="w-4 h-4 mr-2" />
              Schedules
            </TabsTrigger>
            <TabsTrigger value="teachers" data-testid="teachers-tab">
              <Users className="w-4 h-4 mr-2" />
              Teachers
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="settings-tab">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Schedules Tab */}
          <TabsContent value="schedules" className="space-y-4">
            <div className="glass p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Manage Timetable</h2>
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-gray-600 dark:text-gray-400">Select Teacher:</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger className="w-48" data-testid="teacher-select">
                      <SelectValue placeholder="Choose teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TimetableGrid
                schedules={schedules.filter(s => !selectedTeacher || s.teacher_id === selectedTeacher)}
                breakAfter={breakAfter}
                onCellClick={handleScheduleClick}
                onEmptyCellClick={handleAddScheduleEntry}
                isAdmin={true}
              />
            </div>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            <div className="glass p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Teacher Management</h2>
                <Button onClick={() => setShowAddTeacher(true)} data-testid="add-teacher-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Teacher
                </Button>
              </div>

              <div className="grid gap-4">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{teacher.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{teacher.username}</p>
                    </div>
                    <Button
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      variant="destructive"
                      size="sm"
                      data-testid={`delete-teacher-${teacher.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="glass p-6 rounded-2xl">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">System Settings</h2>

              <div className="space-y-4">
                {/* Break Period Setting */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                  <div>
                    <Label className="text-base font-medium text-gray-900 dark:text-white">Break Period Position</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Currently: After Period {breakAfter}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdateBreak(3)}
                      variant={breakAfter === 3 ? 'default' : 'outline'}
                      data-testid="break-after-3"
                    >
                      After Period 3
                    </Button>
                    <Button
                      onClick={() => handleUpdateBreak(4)}
                      variant={breakAfter === 4 ? 'default' : 'outline'}
                      data-testid="break-after-4"
                    >
                      After Period 4
                    </Button>
                  </div>
                </div>

                {/* Demo Data Management */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                  <Label className="text-base font-medium text-gray-900 dark:text-white">Demo Timetable Management</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                    Load pre-configured demo schedules for all teachers or clear all existing data
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleLoadDemoSchedules}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="load-demo-schedules-button"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Load Demo Schedules
                    </Button>
                    <Button
                      onClick={handleClearAllSchedules}
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      data-testid="clear-all-schedules-button"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear All Schedules
                    </Button>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-900 dark:text-blue-300">
                      <strong>Note:</strong> Demo schedules include realistic timetables for all 4 teachers (Alex, Amy, John, Sara)
                      with subjects like Mathematics, Physics, English, and History across all weekdays.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Teacher Dialog */}
      <Dialog open={showAddTeacher} onOpenChange={setShowAddTeacher}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>Create a new teacher account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTeacher} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newTeacher.name}
                onChange={(e) => setNewTeacher({...newTeacher, name: e.target.value})}
                required
                data-testid="teacher-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={newTeacher.username}
                onChange={(e) => setNewTeacher({...newTeacher, username: e.target.value})}
                required
                data-testid="teacher-username-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newTeacher.password}
                onChange={(e) => setNewTeacher({...newTeacher, password: e.target.value})}
                required
                data-testid="teacher-password-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddTeacher(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="submit-add-teacher">
                Add Teacher
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={showEditSchedule} onOpenChange={setShowEditSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              {selectedSchedule && `${selectedSchedule.day}, Period ${selectedSchedule.period}`}
            </DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <form onSubmit={handleUpdateSchedule} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  defaultValue={selectedSchedule.subject}
                  required
                  data-testid="edit-subject-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class_name">Class</Label>
                <Input
                  id="class_name"
                  name="class_name"
                  defaultValue={selectedSchedule.class_name}
                  required
                  data-testid="edit-class-input"
                />
              </div>
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                  data-testid="delete-schedule-button"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditSchedule(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="save-schedule-button">
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <QRCodeModal open={showQRModal} onClose={() => setShowQRModal(false)} />

      {/* Add Schedule Entry Modal */}
      <Dialog open={showAddScheduleModal} onOpenChange={setShowAddScheduleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Add Schedule Entry
            </DialogTitle>
            <DialogDescription>
              Adding entry for {scheduleSlot.day}, Period {scheduleSlot.period}
              {selectedTeacher && (
                <span className="block mt-1 font-medium text-gray-700 dark:text-gray-300">
                  Teacher: {teachers.find(t => t.id === selectedTeacher)?.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitScheduleEntry} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-subject" className="text-sm font-medium">
                Subject Name *
              </Label>
              <Input
                id="new-subject"
                name="subject"
                placeholder="e.g., Mathematics, Science, English"
                value={newScheduleEntry.subject}
                onChange={(e) => setNewScheduleEntry({ ...newScheduleEntry, subject: e.target.value })}
                required
                maxLength={50}
                className="transition-all focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {newScheduleEntry.subject.length}/50 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-class" className="text-sm font-medium">
                Class/Section *
              </Label>
              <Input
                id="new-class"
                name="class_name"
                placeholder="e.g., 10-A, Grade 9B, Class 12"
                value={newScheduleEntry.class_name}
                onChange={(e) => setNewScheduleEntry({ ...newScheduleEntry, class_name: e.target.value })}
                required
                maxLength={30}
                className="transition-all focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {newScheduleEntry.class_name.length}/30 characters
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddScheduleModal(false);
                  setNewScheduleEntry({ subject: '', class_name: '' });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={!newScheduleEntry.subject.trim() || !newScheduleEntry.class_name.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${confirmDialog.variant === 'destructive' ? 'text-red-600' : 'text-yellow-600'}`} />
              {confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.onConfirm}
              className={confirmDialog.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
