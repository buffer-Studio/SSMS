import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { LogOut, Moon, Sun, Users, Calendar, Settings as SettingsIcon, Plus, Trash2, Edit2, QrCode, Clock } from 'lucide-react';
import TeacherManagement from '../components/TeacherManagement';
import BulkOperations from '../components/BulkOperations';
import { useAdminData } from '../hooks/useScheduleManagement';
import TimetableGrid from '../components/TimetableGrid';
import QRCodeModal from '../components/QRCodeModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const AdminDashboard = ({ user, token, onLogout, exhibitionMode, darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const { 
    teachers, 
    schedules, 
    settings, 
    temporarySchedules, 
    changelogs, 
    loading, 
    refetch, 
    updateBreakPeriod,
    createTemporarySchedule,
    deleteTemporarySchedule
  } = useAdminData(token);

  // Extract breakAfter from settings
  const breakAfter = settings?.break_after_period || 3;

  const isRecentChange = (scheduleId) => {
    if (!scheduleId) return false;

    // Check if this schedule has a recent changelog entry
    const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = new Date();

    return changelogs.some(log => {
      if (log.schedule_id !== scheduleId) return false;
      
      const logDate = new Date(log.timestamp);
      const diffMs = now - logDate;
      
      return diffMs < recentThreshold;
    });
  };

  const handleDataUpdate = () => {
    refetch();
  };

  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showAddTemporarySchedule, setShowAddTemporarySchedule] = useState(false);
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [showEditTemporarySchedule, setShowEditTemporarySchedule] = useState(false);
  const [pendingScheduleCell, setPendingScheduleCell] = useState(null);
  const [pendingDeleteTeacher, setPendingDeleteTeacher] = useState(null);
  const [pendingDeleteSchedule, setPendingDeleteSchedule] = useState(null);
  const [pendingLoadDemo, setPendingLoadDemo] = useState(false);
  const [pendingClearAll, setPendingClearAll] = useState(false);
  const [submittingTeacher, setSubmittingTeacher] = useState(false);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [updatingSchedule, setUpdatingSchedule] = useState(false);

  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const [newScheduleEntry, setNewScheduleEntry] = useState({
    subject: '',
    class_name: ''
  });

  const [formErrors, setFormErrors] = useState({});

  const validateScheduleForm = () => {
    const errors = {};

    if (!newScheduleEntry.subject?.trim()) {
      errors.subject = 'Subject is required';
    } else if (newScheduleEntry.subject.trim().length < 2) {
      errors.subject = 'Subject must be at least 2 characters';
    }

    if (!newScheduleEntry.class_name?.trim()) {
      errors.class_name = 'Class name is required';
    } else if (newScheduleEntry.class_name.trim().length < 2) {
      errors.class_name = 'Class name must be at least 2 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditScheduleForm = () => {
    const errors = {};

    if (!selectedSchedule?.subject?.trim()) {
      errors.editSubject = 'Subject is required';
    } else if (selectedSchedule.subject.trim().length < 2) {
      errors.editSubject = 'Subject must be at least 2 characters';
    }

    if (!selectedSchedule?.class_name?.trim()) {
      errors.editClassName = 'Class name is required';
    } else if (selectedSchedule.class_name.trim().length < 2) {
      errors.editClassName = 'Class name must be at least 2 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDeleteTeacher = async (teacherId) => {
    setPendingDeleteTeacher(teacherId);
  };

  const confirmDeleteTeacher = async () => {
    if (!pendingDeleteTeacher) return;

    try {
      await axios.delete(`${API}/users/${pendingDeleteTeacher}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Teacher deleted successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to delete teacher');
    } finally {
      setPendingDeleteTeacher(null);
    }
  };

  const handleUpdateBreak = async (value) => {
    try {
      await updateBreakPeriod(value);
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

    // Update selectedSchedule with form values
    const formData = new FormData(e.target);
    const updatedSchedule = {
      ...selectedSchedule,
      subject: formData.get('subject'),
      class_name: formData.get('class_name')
    };
    setSelectedSchedule(updatedSchedule);

    if (!validateEditScheduleForm()) {
      return;
    }

    setUpdatingSchedule(true);
    try {
      await axios.put(`${API}/schedules/${selectedSchedule.id}`, {
        subject: updatedSchedule.subject.trim(),
        class_name: updatedSchedule.class_name.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Schedule updated successfully');
      setShowEditSchedule(false);
      setFormErrors({});
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update schedule');
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const handleAddScheduleEntry = async (day, period) => {
    if (!selectedTeacher) {
      toast.error('Please select a teacher first');
      return;
    }

    setPendingScheduleCell({ day, period });
    setShowAddSchedule(true);
  };

  const handleSubmitScheduleEntry = async (e) => {
    e.preventDefault();

    if (!validateScheduleForm()) {
      return;
    }

    if (!pendingScheduleCell || !selectedTeacher) return;

    const teacher = teachers.find(t => t.id === selectedTeacher);
    if (!teacher) return;

    setSubmittingSchedule(true);
    try {
      await axios.post(`${API}/schedules`, {
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        day: pendingScheduleCell.day,
        period: pendingScheduleCell.period,
        subject: newScheduleEntry.subject.trim(),
        class_name: newScheduleEntry.class_name.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Schedule entry added');
      setShowAddSchedule(false);
      setNewScheduleEntry({ subject: '', class_name: '' });
      setFormErrors({});
      setPendingScheduleCell(null);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add schedule');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    setPendingDeleteSchedule(scheduleId);
  };

  const confirmDeleteSchedule = async () => {
    if (!pendingDeleteSchedule) return;

    try {
      await axios.delete(`${API}/schedules/${pendingDeleteSchedule}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Schedule deleted successfully');
      setShowEditSchedule(false);
      refetch();
    } catch (error) {
      toast.error('Failed to delete schedule');
    } finally {
      setPendingDeleteSchedule(null);
    }
  };

  const handleTemporaryScheduleClick = (schedule) => {
    // Handle editing temporary schedules
    setSelectedSchedule(schedule);
    setShowEditTemporarySchedule(true);
  };

  const handleAddTemporaryScheduleEntry = async (day, period) => {
    if (!selectedTeacher) {
      toast.error('Please select a teacher first');
      return;
    }

    setPendingScheduleCell({ day, period });
    setShowAddTemporarySchedule(true);
  };

  const handleSubmitTemporaryScheduleEntry = async (e) => {
    e.preventDefault();

    if (!validateScheduleForm()) {
      return;
    }

    if (!pendingScheduleCell || !selectedTeacher) return;

    const teacher = teachers.find(t => t.id === selectedTeacher);
    if (!teacher) return;

    setSubmittingSchedule(true);
    try {
      await createTemporarySchedule({
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        day: pendingScheduleCell.day,
        period: pendingScheduleCell.period,
        subject: newScheduleEntry.subject.trim(),
        class_name: newScheduleEntry.class_name.trim()
      });
      toast.success('Temporary schedule override created (expires in 8 hours)');
      setShowAddTemporarySchedule(false);
      setNewScheduleEntry({ subject: '', class_name: '' });
      setFormErrors({});
      setPendingScheduleCell(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create temporary schedule');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleUpdateTemporarySchedule = async (e) => {
    e.preventDefault();

    // Update selectedSchedule with form values
    const formData = new FormData(e.target);
    const updatedSchedule = {
      ...selectedSchedule,
      subject: formData.get('subject'),
      class_name: formData.get('class_name')
    };

    if (!validateEditScheduleForm()) {
      return;
    }

    setUpdatingSchedule(true);
    try {
      // For temporary schedules, we need to delete and recreate
      await deleteTemporarySchedule(selectedSchedule.id);
      await createTemporarySchedule({
        teacher_id: selectedSchedule.teacher_id,
        teacher_name: selectedSchedule.teacher_name,
        day: selectedSchedule.day,
        period: selectedSchedule.period,
        subject: updatedSchedule.subject.trim(),
        class_name: updatedSchedule.class_name.trim()
      });
      toast.success('Temporary schedule updated successfully');
      setShowEditTemporarySchedule(false);
      setFormErrors({});
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update temporary schedule');
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const handleDeleteTemporarySchedule = async () => {
    if (!selectedSchedule) return;

    try {
      await deleteTemporarySchedule(selectedSchedule.id);
      toast.success('Temporary schedule deleted successfully');
      setShowEditTemporarySchedule(false);
    } catch (error) {
      toast.error('Failed to delete temporary schedule');
    }
  };

  const handleLoadDemoSchedules = async () => {
    setPendingLoadDemo(true);
  };

  const confirmLoadDemoSchedules = async () => {
    if (!pendingLoadDemo) return;

    try {
      await axios.post(`${API}/demo/load-schedules`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Demo schedules loaded successfully!');
      refetch();
    } catch (error) {
      toast.error('Failed to load demo schedules');
    } finally {
      setPendingLoadDemo(false);
    }
  };

  const handleClearAllSchedules = async () => {
    setPendingClearAll(true);
  };

  const confirmClearAllSchedules = async () => {
    if (!pendingClearAll) return;

    try {
      await axios.post(`${API}/demo/clear-schedules`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('All schedules cleared');
      refetch();
    } catch (error) {
      toast.error('Failed to clear schedules');
    } finally {
      setPendingClearAll(false);
    }
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
        <Tabs defaultValue="default-schedule" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 shadow-sm">
            <TabsTrigger value="default-schedule" data-testid="default-schedule-tab">
              <Calendar className="w-4 h-4 mr-2" />
              Default Schedule
            </TabsTrigger>
            <TabsTrigger value="temporary-schedule" data-testid="temporary-schedule-tab">
              <Clock className="w-4 h-4 mr-2" />
              Temporary Schedule
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

          {/* Default Schedule Tab */}
          <TabsContent value="default-schedule" className="space-y-4">
            <div className="glass p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Default Schedule Management</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    View and edit the permanent schedule that teachers see by default
                  </p>
                </div>
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
                isRecentChange={isRecentChange}
                isAdmin={true}
              />
            </div>
          </TabsContent>

          {/* Temporary Schedule Tab */}
          <TabsContent value="temporary-schedule" className="space-y-4">
            <div className="glass p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Temporary Schedule Overrides</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Create 8-hour temporary schedule changes that override the default schedule
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-gray-600 dark:text-gray-400">Select Teacher:</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger className="w-48" data-testid="temp-teacher-select">
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

              {/* Active Temporary Overrides */}
              {temporarySchedules.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Active Temporary Overrides</h3>
                  <div className="space-y-3">
                    {temporarySchedules.map(tempSchedule => (
                      <div key={tempSchedule.id} className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {tempSchedule.teacher_name} - {tempSchedule.day}, Period {tempSchedule.period}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {tempSchedule.subject} - {tempSchedule.class_name}
                          </p>
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Expires: {new Date(tempSchedule.valid_until).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => deleteTemporarySchedule(tempSchedule.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timetable for creating temporary overrides */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create Temporary Override</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Click on any cell to create an 8-hour temporary schedule override
                </p>
                <TimetableGrid
                  schedules={temporarySchedules.filter(s => !selectedTeacher || s.teacher_id === selectedTeacher)}
                  breakAfter={breakAfter}
                  onCellClick={handleTemporaryScheduleClick}
                  onEmptyCellClick={handleAddTemporaryScheduleEntry}
                  isRecentChange={() => false} // Temporary schedules don't show recent changes
                  isAdmin={true}
                  showAsTemporary={true}
                />
              </div>
            </div>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            <Tabs defaultValue="teachers" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="teachers" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Teachers
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule
                </TabsTrigger>
                <TabsTrigger value="bulk" className="flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4" />
                  Bulk Ops
                </TabsTrigger>
              </TabsList>

              <TabsContent value="teachers" className="space-y-6">
                <TeacherManagement
                  teachers={teachers}
                  onTeacherUpdate={handleDataUpdate}
                  token={token}
                />
              </TabsContent>

              <TabsContent value="schedule" className="space-y-6">
                {/* Teacher Schedule View */}
                <div className="glass p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teacher Schedules</h3>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-gray-600 dark:text-gray-400">Select Teacher:</Label>
                      <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                        <SelectTrigger className="w-48" data-testid="teacher-select-schedule">
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
                    isRecentChange={isRecentChange}
                    isAdmin={true}
                  />
                </div>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-6">
                <BulkOperations
                  teachers={teachers}
                  schedules={schedules}
                  onDataUpdate={handleDataUpdate}
                  token={token}
                />
              </TabsContent>

            </Tabs>
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
                      className="bg-green-600 hover:bg-green-700 text-white"
                      data-testid="load-demo-schedules-button"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Load Demo Schedules
                    </Button>
                    <AlertDialog open={pendingLoadDemo} onOpenChange={setPendingLoadDemo}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Load Demo Schedules</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will replace all existing schedules with demo data. This action cannot be undone. Continue?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmLoadDemoSchedules} className="bg-green-600 hover:bg-green-700">
                            Load Demo Data
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                    <AlertDialog open={pendingClearAll} onOpenChange={setPendingClearAll}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear All Schedules</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete ALL schedules and changelogs. This action cannot be undone. Are you sure?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmClearAllSchedules} className="bg-red-600 hover:bg-red-700">
                            Delete Everything
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="mt-3 p-3 bg-green-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-green-900 dark:text-blue-300">
                      <strong>Note:</strong> Demo schedules include realistic timetables for all 4 teachers (Sagnik Sir, Nadeem Sir, Prinshu Sir, Abhishek Sir)
                      with subjects like Mathematics, Physics, English, and History across all weekdays.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
                  onChange={(e) => {
                    setSelectedSchedule({...selectedSchedule, subject: e.target.value});
                    if (formErrors.editSubject) {
                      setFormErrors(prev => ({ ...prev, editSubject: '' }));
                    }
                  }}
                  required
                  className={formErrors.editSubject ? 'border-red-500 focus:border-red-500' : ''}
                  data-testid="edit-subject-input"
                />
                {formErrors.editSubject && (
                  <p className="text-sm text-red-600 dark:text-red-400">{formErrors.editSubject}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="class_name">Class</Label>
                <Input
                  id="class_name"
                  name="class_name"
                  defaultValue={selectedSchedule.class_name}
                  onChange={(e) => {
                    setSelectedSchedule({...selectedSchedule, class_name: e.target.value});
                    if (formErrors.editClassName) {
                      setFormErrors(prev => ({ ...prev, editClassName: '' }));
                    }
                  }}
                  required
                  className={formErrors.editClassName ? 'border-red-500 focus:border-red-500' : ''}
                  data-testid="edit-class-input"
                />
                {formErrors.editClassName && (
                  <p className="text-sm text-red-600 dark:text-red-400">{formErrors.editClassName}</p>
                )}
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
                <AlertDialog open={pendingDeleteSchedule === selectedSchedule?.id} onOpenChange={() => setPendingDeleteSchedule(null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Schedule Entry</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this schedule entry? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={confirmDeleteSchedule} className="bg-red-600 hover:bg-red-700">
                        Delete Schedule
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditSchedule(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="save-schedule-button" disabled={updatingSchedule}>
                    {updatingSchedule ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Temporary Schedule Entry Dialog */}
      <Dialog open={showAddTemporarySchedule} onOpenChange={setShowAddTemporarySchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Temporary Schedule Override</DialogTitle>
            <DialogDescription>
              {pendingScheduleCell && `Create an 8-hour temporary override for ${pendingScheduleCell.day}, Period ${pendingScheduleCell.period}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTemporaryScheduleEntry} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="temp-subject">Subject</Label>
              <Input
                id="temp-subject"
                value={newScheduleEntry.subject}
                onChange={(e) => {
                  setNewScheduleEntry({...newScheduleEntry, subject: e.target.value});
                  if (formErrors.subject) {
                    setFormErrors(prev => ({ ...prev, subject: '' }));
                  }
                }}
                required
                className={formErrors.subject ? 'border-red-500 focus:border-red-500' : ''}
                data-testid="temp-add-subject-input"
              />
              {formErrors.subject && (
                <p className="text-sm text-red-600 dark:text-red-400">{formErrors.subject}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="temp-class_name">Class</Label>
              <Input
                id="temp-class_name"
                value={newScheduleEntry.class_name}
                onChange={(e) => {
                  setNewScheduleEntry({...newScheduleEntry, class_name: e.target.value});
                  if (formErrors.class_name) {
                    setFormErrors(prev => ({ ...prev, class_name: '' }));
                  }
                }}
                required
                className={formErrors.class_name ? 'border-red-500 focus:border-red-500' : ''}
                data-testid="temp-add-class-input"
              />
              {formErrors.class_name && (
                <p className="text-sm text-red-600 dark:text-red-400">{formErrors.class_name}</p>
              )}
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Note:</strong> This temporary override will expire in 8 hours and automatically revert to the default schedule.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowAddTemporarySchedule(false);
                setNewScheduleEntry({ subject: '', class_name: '' });
                setPendingScheduleCell(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" data-testid="temp-submit-add-schedule" disabled={submittingSchedule}>
                {submittingSchedule ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Override'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Temporary Schedule Dialog */}
      <Dialog open={showEditTemporarySchedule} onOpenChange={setShowEditTemporarySchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Temporary Schedule Override</DialogTitle>
            <DialogDescription>
              {selectedSchedule && `${selectedSchedule.day}, Period ${selectedSchedule.period}`}
            </DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <form onSubmit={handleUpdateTemporarySchedule} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="temp-edit-subject">Subject</Label>
                <Input
                  id="temp-edit-subject"
                  name="subject"
                  defaultValue={selectedSchedule.subject}
                  onChange={(e) => {
                    setSelectedSchedule({...selectedSchedule, subject: e.target.value});
                    if (formErrors.editSubject) {
                      setFormErrors(prev => ({ ...prev, editSubject: '' }));
                    }
                  }}
                  required
                  className={formErrors.editSubject ? 'border-red-500 focus:border-red-500' : ''}
                  data-testid="temp-edit-subject-input"
                />
                {formErrors.editSubject && (
                  <p className="text-sm text-red-600 dark:text-red-400">{formErrors.editSubject}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp-edit-class_name">Class</Label>
                <Input
                  id="temp-edit-class_name"
                  name="class_name"
                  defaultValue={selectedSchedule.class_name}
                  onChange={(e) => {
                    setSelectedSchedule({...selectedSchedule, class_name: e.target.value});
                    if (formErrors.editClassName) {
                      setFormErrors(prev => ({ ...prev, editClassName: '' }));
                    }
                  }}
                  required
                  className={formErrors.editClassName ? 'border-red-500 focus:border-red-500' : ''}
                  data-testid="temp-edit-class-input"
                />
                {formErrors.editClassName && (
                  <p className="text-sm text-red-600 dark:text-red-400">{formErrors.editClassName}</p>
                )}
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Expires: {selectedSchedule.valid_until ? new Date(selectedSchedule.valid_until).toLocaleString() : 'Unknown'}
                </p>
              </div>
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteTemporarySchedule}
                  data-testid="temp-delete-schedule-button"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Override
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditTemporarySchedule(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="temp-save-schedule-button" disabled={updatingSchedule}>
                    {updatingSchedule ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <QRCodeModal open={showQRModal} onClose={() => setShowQRModal(false)} />
    </div>
  );
};

export default AdminDashboard;
