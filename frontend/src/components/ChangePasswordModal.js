import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock } from 'lucide-react';
import axios from 'axios';
import { API } from '../config/api';

const ChangePasswordModal = ({ open, onClose, token }) => {
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    
    if (formData.newPassword.length > 72) {
      toast.error('Password too long (max 72 characters)');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post(
        `${API}/auth/change-password`,
        {
          old_password: formData.oldPassword,
          new_password: formData.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success('Password changed successfully!');
      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">Change Password</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Update your password to keep your account secure
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          {/* Current Password */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="oldPassword" className="text-xs sm:text-sm">Current Password *</Label>
            <div className="relative">
              <Input
                id="oldPassword"
                name="oldPassword"
                type={showOldPassword ? "text" : "password"}
                value={formData.oldPassword}
                onChange={handleChange}
                required
                className="pr-10 text-sm sm:text-base"
                placeholder="Enter current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-2 sm:px-3 hover:bg-transparent"
                onClick={() => setShowOldPassword(!showOldPassword)}
              >
                {showOldPassword ? (
                  <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                ) : (
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="newPassword" className="text-xs sm:text-sm">New Password *</Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={formData.newPassword}
                onChange={handleChange}
                required
                minLength={8}
                maxLength={72}
                className="pr-10 text-sm sm:text-base"
                placeholder="Enter new password (min 8 chars)"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-2 sm:px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                ) : (
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formData.newPassword.length}/72 characters
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="pr-10 text-sm sm:text-base"
                placeholder="Re-enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-2 sm:px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                ) : (
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <div className="space-y-1">
              <div className="flex gap-1">
                <div className={`h-1 flex-1 rounded ${formData.newPassword.length >= 8 ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                <div className={`h-1 flex-1 rounded ${formData.newPassword.length >= 12 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                <div className={`h-1 flex-1 rounded ${formData.newPassword.length >= 16 && /[A-Z]/.test(formData.newPassword) && /[0-9]/.test(formData.newPassword) ? 'bg-green-600' : 'bg-gray-200'}`}></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formData.newPassword.length < 8 && 'Weak - Use at least 8 characters'}
                {formData.newPassword.length >= 8 && formData.newPassword.length < 12 && 'Fair - Use 12+ characters for better security'}
                {formData.newPassword.length >= 12 && 'Good - Strong password!'}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordModal;
