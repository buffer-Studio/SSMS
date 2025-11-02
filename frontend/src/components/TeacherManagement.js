import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { UserPlus, Trash2, Users } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeacherManagement = ({ teachers, onTeacherUpdate, token }) => {
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [pendingDeleteTeacher, setPendingDeleteTeacher] = useState(null);
  const [newTeacher, setNewTeacher] = useState({ username: '', password: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!newTeacher.name.trim()) {
      errors.name = 'Full name is required';
    } else if (newTeacher.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!newTeacher.username.trim()) {
      errors.username = 'Username is required';
    } else if (newTeacher.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(newTeacher.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!newTeacher.password) {
      errors.password = 'Password is required';
    } else if (newTeacher.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await axios.post(`${API}/users`, {
        username: newTeacher.username.trim(),
        password: newTeacher.password,
        name: newTeacher.name.trim(),
        role: 'teacher'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Teacher added successfully');
      setShowAddTeacher(false);
      setNewTeacher({ username: '', password: '', name: '' });
      setFormErrors({});
      onTeacherUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!pendingDeleteTeacher) return;

    try {
      await axios.delete(`${API}/users/${pendingDeleteTeacher}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Teacher deleted successfully');
      onTeacherUpdate();
    } catch (error) {
      toast.error('Failed to delete teacher');
    } finally {
      setPendingDeleteTeacher(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Teacher Management
        </CardTitle>
        <CardDescription>
          Manage teachers and their accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} registered
          </div>
          <Dialog open={showAddTeacher} onOpenChange={setShowAddTeacher}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Teacher</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTeacher} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newTeacher.name}
                    onChange={(e) => {
                      setNewTeacher({...newTeacher, name: e.target.value});
                      if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={formErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                    required
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newTeacher.username}
                    onChange={(e) => {
                      setNewTeacher({...newTeacher, username: e.target.value});
                      if (formErrors.username) setFormErrors(prev => ({ ...prev, username: '' }));
                    }}
                    className={formErrors.username ? 'border-red-500 focus:border-red-500' : ''}
                    required
                  />
                  {formErrors.username && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.username}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newTeacher.password}
                    onChange={(e) => {
                      setNewTeacher({...newTeacher, password: e.target.value});
                      if (formErrors.password) setFormErrors(prev => ({ ...prev, password: '' }));
                    }}
                    className={formErrors.password ? 'border-red-500 focus:border-red-500' : ''}
                    required
                  />
                  {formErrors.password && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.password}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddTeacher(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Teacher'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-2">
          {teachers.map(teacher => (
            <div key={teacher.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {teacher.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{teacher.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{teacher.username}</p>
                </div>
                <Badge variant="outline">Teacher</Badge>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {teacher.name}? This will also remove all their schedules.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setPendingDeleteTeacher(teacher.id)} className="bg-red-600 hover:bg-red-700">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>

        <AlertDialog open={!!pendingDeleteTeacher} onOpenChange={() => setPendingDeleteTeacher(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All schedules for this teacher will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTeacher} className="bg-red-600 hover:bg-red-700">
                Delete Teacher
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default TeacherManagement;
