import { useState } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { API } from '../config/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const ScheduleChangeRequestModal = ({ open, onClose, token, currentSchedule = null }) => {
  const [formData, setFormData] = useState({
    day: currentSchedule?.day || '',
    period: currentSchedule?.period || '',
    current_subject: currentSchedule?.subject || '',
    current_class: currentSchedule?.class_name || '',
    requested_subject: '',
    requested_class: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.day || !formData.period || !formData.requested_subject || !formData.requested_class || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/schedule-requests`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Schedule change request submitted successfully!');
      onClose();
      setFormData({
        day: '',
        period: '',
        current_subject: '',
        current_class: '',
        requested_subject: '',
        requested_class: '',
        reason: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Schedule Change</DialogTitle>
          <DialogDescription>
            Submit a request to modify your timetable. The admin will review and approve your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="day">Day *</Label>
              <Select value={formData.day} onValueChange={(value) => setFormData({ ...formData, day: value })}>
                <SelectTrigger id="day">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period *</Label>
              <Select 
                value={formData.period.toString()} 
                onValueChange={(value) => setFormData({ ...formData, period: parseInt(value) })}
              >
                <SelectTrigger id="period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map(period => (
                    <SelectItem key={period} value={period.toString()}>Period {period}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.current_subject && (
            <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
              <Label className="text-sm text-gray-600 dark:text-gray-400">Current Schedule</Label>
              <p className="text-sm font-medium mt-1">
                {formData.current_subject} - {formData.current_class}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requested_subject">Requested Subject *</Label>
              <Input
                id="requested_subject"
                value={formData.requested_subject}
                onChange={(e) => setFormData({ ...formData, requested_subject: e.target.value })}
                placeholder="e.g., Mathematics"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requested_class">Requested Class *</Label>
              <Input
                id="requested_class"
                value={formData.requested_class}
                onChange={(e) => setFormData({ ...formData, requested_class: e.target.value })}
                placeholder="e.g., Grade 10A"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please explain why you need this schedule change..."
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </span>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleChangeRequestModal;
