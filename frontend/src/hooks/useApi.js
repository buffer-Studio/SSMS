/**
 * Custom React hooks for data fetching and state management
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';

/**
 * Hook for fetching data with loading and error states
 */
export const useFetch = (fetchFunction, dependencies = [], options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { 
    initialData = null,
    onSuccess = null,
    onError = null,
    showErrorToast = true 
  } = options;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      setData(result);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err);
      if (showErrorToast) {
        toast.error(err.message || 'Failed to fetch data');
      }
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [fetchData, initialData]);

  return { data, loading, error, refetch: fetchData };
};

/**
 * Hook for managing schedules
 */
export const useSchedules = (teacherId = null) => {
  const { data: schedules, loading, error, refetch } = useFetch(
    () => api.schedules.getAll(teacherId),
    [teacherId]
  );

  const createSchedule = async (scheduleData) => {
    try {
      const newSchedule = await api.schedules.create(scheduleData);
      toast.success('Schedule created successfully');
      await refetch();
      return newSchedule;
    } catch (err) {
      toast.error(err.message || 'Failed to create schedule');
      throw err;
    }
  };

  const updateSchedule = async (scheduleId, updateData) => {
    try {
      const updatedSchedule = await api.schedules.update(scheduleId, updateData);
      toast.success('Schedule updated successfully');
      await refetch();
      return updatedSchedule;
    } catch (err) {
      toast.error(err.message || 'Failed to update schedule');
      throw err;
    }
  };

  const deleteSchedule = async (scheduleId) => {
    try {
      await api.schedules.delete(scheduleId);
      toast.success('Schedule deleted successfully');
      await refetch();
    } catch (err) {
      toast.error(err.message || 'Failed to delete schedule');
      throw err;
    }
  };

  return {
    schedules: schedules || [],
    loading,
    error,
    refetch,
    createSchedule,
    updateSchedule,
    deleteSchedule
  };
};

/**
 * Hook for managing users
 */
export const useUsers = () => {
  const { data: users, loading, error, refetch } = useFetch(() => api.users.getAll());

  const createUser = async (userData) => {
    try {
      const newUser = await api.users.create(userData);
      toast.success('User created successfully');
      await refetch();
      return newUser;
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
      throw err;
    }
  };

  const deleteUser = async (userId) => {
    try {
      await api.users.delete(userId);
      toast.success('User deleted successfully');
      await refetch();
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
      throw err;
    }
  };

  return {
    users: users || [],
    loading,
    error,
    refetch,
    createUser,
    deleteUser
  };
};

/**
 * Hook for managing break settings
 */
export const useBreakSettings = () => {
  const { data: settings, loading, error, refetch } = useFetch(() => api.settings.getBreakPeriod());

  const updateBreakPeriod = async (breakAfter) => {
    try {
      await api.settings.updateBreakPeriod(breakAfter);
      toast.success(`Break period updated to after Period ${breakAfter}`);
      await refetch();
    } catch (err) {
      toast.error(err.message || 'Failed to update break period');
      throw err;
    }
  };

  return {
    breakAfter: settings?.break_after_period || 3,
    loading,
    error,
    updateBreakPeriod
  };
};

/**
 * Hook for authentication
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.auth.login(credentials);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      toast.success('Login successful');
      return response;
    } catch (err) {
      toast.error(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
  };

  return {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    logout
  };
};
