import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Download, Upload, Trash2, FileText, AlertTriangle, Edit3, Users, Calendar } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BulkOperations = ({ teachers, schedules, onDataUpdate, token }) => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [bulkEditData, setBulkEditData] = useState({ subject: '', class_name: '' });

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API}/bulk/export-schedules`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'schedules_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Schedules exported successfully');
    } catch (error) {
      toast.error('Failed to export schedules');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/bulk/import-schedules`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const { imported_count, errors } = response.data;
      toast.success(`Imported ${imported_count} schedules successfully`);

      if (errors.length > 0) {
        toast.warning(`${errors.length} rows had errors. Check console for details.`);
        console.warn('Import errors:', errors);
      }

      onDataUpdate();
      setShowImportDialog(false);
      event.target.value = ''; // Reset file input
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import schedules');
    } finally {
      setImporting(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await axios.post(`${API}/demo/clear-schedules`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('All schedules cleared successfully');
      onDataUpdate();
      setShowClearDialog(false);
    } catch (error) {
      toast.error('Failed to clear schedules');
    } finally {
      setClearing(false);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedSchedules.length === 0) {
      toast.error('Please select schedules to edit');
      return;
    }

    try {
      const updates = [];
      for (const scheduleId of selectedSchedules) {
        const updateData = {};
        if (bulkEditData.subject) updateData.subject = bulkEditData.subject;
        if (bulkEditData.class_name) updateData.class_name = bulkEditData.class_name;

        if (Object.keys(updateData).length > 0) {
          await axios.put(`${API}/schedules/${scheduleId}`, updateData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          updates.push(scheduleId);
        }
      }

      toast.success(`Updated ${updates.length} schedule${updates.length !== 1 ? 's' : ''}`);
      setShowBulkEditDialog(false);
      setSelectedSchedules([]);
      setBulkEditData({ subject: '', class_name: '' });
      onDataUpdate();
    } catch (error) {
      toast.error('Failed to update schedules');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSchedules.length === 0) {
      toast.error('Please select schedules to delete');
      return;
    }

    try {
      for (const scheduleId of selectedSchedules) {
        await axios.delete(`${API}/schedules/${scheduleId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      toast.success(`Deleted ${selectedSchedules.length} schedule${selectedSchedules.length !== 1 ? 's' : ''}`);
      setShowBulkDeleteDialog(false);
      setSelectedSchedules([]);
      onDataUpdate();
    } catch (error) {
      toast.error('Failed to delete schedules');
    }
  };

  const handleScheduleSelect = (scheduleId) => {
    setSelectedSchedules(prev =>
      prev.includes(scheduleId)
        ? prev.filter(id => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSchedules.length === schedules.length) {
      setSelectedSchedules([]);
    } else {
      setSelectedSchedules(schedules.map(s => s.id));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Bulk Operations
        </CardTitle>
        <CardDescription>
          Import/export schedules and manage bulk data operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Operations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>

          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Schedules from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium mb-2">CSV Format Requirements:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Headers: teacher_name, day, period, subject, class_name</li>
                    <li>Days: Monday, Tuesday, Wednesday, Thursday, Friday</li>
                    <li>Periods: 1-8</li>
                    <li>Teachers must already exist in the system</li>
                  </ul>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Select CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImport}
                    disabled={importing}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-green-50 file:text-green-700
                      dark:file:bg-blue-900 dark:file:text-blue-300
                      hover:file:bg-green-100 dark:hover:file:bg-blue-800"
                  />
                </div>
                {importing && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-blue-400">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    Importing schedules...
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400">
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Clear All Schedules
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete ALL schedules and changelogs. This action cannot be undone.
                  Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} disabled={clearing} className="bg-red-600 hover:bg-red-700">
                  {clearing ? 'Clearing...' : 'Delete Everything'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Advanced Bulk Operations */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Advanced Bulk Operations
          </h3>

          {schedules.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedSchedules.length === schedules.length}
                      onCheckedChange={handleSelectAll}
                    />
                    Select All ({selectedSchedules.length} selected)
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowBulkEditDialog(true)}
                    disabled={selectedSchedules.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Bulk Edit
                  </Button>
                  <Button
                    onClick={() => setShowBulkDeleteDialog(true)}
                    disabled={selectedSchedules.length === 0}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Bulk Delete
                  </Button>
                </div>
              </div>

              {/* Schedule Selection List */}
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {schedules.map(schedule => (
                  <div key={schedule.id} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Checkbox
                      checked={selectedSchedules.includes(schedule.id)}
                      onCheckedChange={() => handleScheduleSelect(schedule.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{schedule.subject}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {schedule.class_name} • {schedule.day} P{schedule.period} • {schedule.teacher_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {schedules.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No schedules available for bulk operations
            </p>
          )}
        </div>

        {/* Bulk Edit Dialog */}
        <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Edit Schedules</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Update {selectedSchedules.length} selected schedule{selectedSchedules.length !== 1 ? 's' : ''}.
                Leave fields empty to keep current values.
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bulk-subject">New Subject (optional)</Label>
                  <Input
                    id="bulk-subject"
                    value={bulkEditData.subject}
                    onChange={(e) => setBulkEditData({...bulkEditData, subject: e.target.value})}
                    placeholder="Leave empty to keep current"
                  />
                </div>
                <div>
                  <Label htmlFor="bulk-class">New Class (optional)</Label>
                  <Input
                    id="bulk-class"
                    value={bulkEditData.class_name}
                    onChange={(e) => setBulkEditData({...bulkEditData, class_name: e.target.value})}
                    placeholder="Leave empty to keep current"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBulkEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkEdit}>
                  Update {selectedSchedules.length} Schedule{selectedSchedules.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Dialog */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Bulk Delete Schedules
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedSchedules.length} selected schedule{selectedSchedules.length !== 1 ? 's' : ''}?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                Delete {selectedSchedules.length} Schedule{selectedSchedules.length !== 1 ? 's' : ''}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="space-y-1">
            <li>• Use export to backup your current schedule data</li>
            <li>• Import validates data and skips conflicting entries</li>
            <li>• Bulk edit allows updating multiple schedules at once</li>
            <li>• Clear all is irreversible - export first if needed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkOperations;
