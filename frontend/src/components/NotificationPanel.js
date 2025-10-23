import { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Shield, FileText, Check, CheckCheck, Trash2, Clock } from 'lucide-react';
import { API } from '../config/api';

const NotificationPanel = ({ open, onClose, token }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async (category = null) => {
    try {
      const url = category 
        ? `${API}/notifications/mark-all-read?category=${category}`
        : `${API}/notifications/mark-all-read`;
      
      await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(notifications.map(n => 
        (!category || n.category === category) ? { ...n, read: true } : n
      ));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const filterNotifications = (category) => {
    if (category === 'all') return notifications;
    return notifications.filter(n => n.category === category);
  };

  const getUnreadCount = (category) => {
    const filtered = category === 'all' ? notifications : notifications.filter(n => n.category === category);
    return filtered.filter(n => !n.read).length;
  };

  const renderNotification = (notif) => (
    <div
      key={notif.id}
      className={`p-3 sm:p-4 rounded-lg border transition-all ${
        notif.read 
          ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 opacity-60' 
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={`p-2 rounded-lg ${
          notif.category === 'security' 
            ? 'bg-red-100 dark:bg-red-900/30' 
            : 'bg-blue-100 dark:bg-blue-900/30'
        }`}>
          {notif.category === 'security' ? (
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : (
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">{notif.title}</h4>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(notif.timestamp)}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line">
            {notif.message}
          </p>
          
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {notif.from_user_name}
            </Badge>
            {!notif.read && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => markAsRead(notif.id)}
                className="h-7 text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark read
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-base sm:text-lg">Notifications</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => markAllAsRead(activeTab === 'all' ? null : activeTab)}
            >
              <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Mark all read
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="relative text-xs sm:text-sm">
              All
              {getUnreadCount('all') > 0 && (
                <Badge className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs bg-green-500">{getUnreadCount('all')}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="security" className="relative text-xs sm:text-sm">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Security</span>
              {getUnreadCount('security') > 0 && (
                <Badge className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs bg-red-500">{getUnreadCount('security')}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="relative text-xs sm:text-sm">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Requests</span>
              {getUnreadCount('requests') > 0 && (
                <Badge className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs bg-blue-500">{getUnreadCount('requests')}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 overflow-y-auto mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filterNotifications('all').length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No notifications</p>
              </div>
            ) : (
              filterNotifications('all').map(renderNotification)
            )}
          </TabsContent>

          <TabsContent value="security" className="flex-1 overflow-y-auto mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filterNotifications('security').length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No security notifications</p>
              </div>
            ) : (
              filterNotifications('security').map(renderNotification)
            )}
          </TabsContent>

          <TabsContent value="requests" className="flex-1 overflow-y-auto mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filterNotifications('requests').length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No schedule change requests</p>
              </div>
            ) : (
              filterNotifications('requests').map(renderNotification)
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPanel;
