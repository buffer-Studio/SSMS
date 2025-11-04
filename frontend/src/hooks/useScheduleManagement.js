import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useTemporarySchedules = (token) => {
  const [temporarySchedules, setTemporarySchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTemporarySchedules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/temporary-schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemporarySchedules(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch temporary schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTemporarySchedule = async (scheduleData) => {
    try {
      const response = await axios.post(`${API}/temporary-schedules`, scheduleData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemporarySchedules(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      console.error('Failed to create temporary schedule:', err);
      throw err;
    }
  };

  const deleteTemporarySchedule = async (scheduleId) => {
    try {
      await axios.delete(`${API}/temporary-schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemporarySchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
    } catch (err) {
      console.error('Failed to delete temporary schedule:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (token) {
      fetchTemporarySchedules();
    }
  }, [token]);

  return {
    temporarySchedules,
    loading,
    error,
    refetch: fetchTemporarySchedules,
    createTemporarySchedule,
    deleteTemporarySchedule
  };
};

export const useEffectiveSchedules = (token) => {
  const [effectiveSchedules, setEffectiveSchedules] = useState([]);
  const [breakAfter, setBreakAfter] = useState(3);
  const [changelogs, setChangelogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEffectiveSchedules = async () => {
    try {
      setLoading(true);
      const [schedulesRes, settingsRes, changelogsRes] = await Promise.all([
        axios.get(`${API}/effective-schedules`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/settings/break-period`),
        axios.get(`${API}/changelogs`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setEffectiveSchedules(schedulesRes.data);
      setBreakAfter(settingsRes.data.break_after_period);
      setChangelogs(changelogsRes.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch effective schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEffectiveSchedules();
    }
  }, [token]);

  return {
    effectiveSchedules,
    breakAfter,
    changelogs,
    loading,
    error,
    refetch: fetchEffectiveSchedules
  };
};

export const useAdminData = (token) => {
  const [teachers, setTeachers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [settings, setSettings] = useState({ break_after_period: 3 });
  const [temporarySchedules, setTemporarySchedules] = useState([]);
  const [changelogs, setChangelogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [teachersRes, schedulesRes, settingsRes, tempSchedulesRes, changelogsRes] = await Promise.all([
        axios.get(`${API}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/schedules`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/settings/break-period`),
        axios.get(`${API}/temporary-schedules`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/changelogs`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Filter to only teachers
      const teacherUsers = teachersRes.data.filter(user => user.role === 'teacher');
      setTeachers(teacherUsers);
      setSchedules(schedulesRes.data);
      setSettings(settingsRes.data);
      setTemporarySchedules(tempSchedulesRes.data);
      setChangelogs(changelogsRes.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateBreakPeriod = async (value) => {
    try {
      await axios.put(`${API}/settings/break-period?break_after=${value}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update the local state
      setSettings(prev => prev ? { ...prev, break_after_period: value } : { break_after_period: value });
      return true;
    } catch (error) {
      console.error('Failed to update break period');
      throw error;
    }
  };

  const createTemporarySchedule = async (scheduleData) => {
    try {
      const response = await axios.post(`${API}/temporary-schedules`, scheduleData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemporarySchedules(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      console.error('Failed to create temporary schedule:', err);
      throw err;
    }
  };

  const deleteTemporarySchedule = async (scheduleId) => {
    try {
      await axios.delete(`${API}/temporary-schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemporarySchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
    } catch (err) {
      console.error('Failed to delete temporary schedule:', err);
      throw err;
    }
  };

  const refetch = () => {
    if (token) {
      fetchAdminData();
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdminData();
    }
  }, [token]);

  return {
    teachers,
    schedules,
    settings,
    temporarySchedules,
    changelogs,
    loading,
    error,
    refetch,
    updateBreakPeriod,
    createTemporarySchedule,
    deleteTemporarySchedule
  };
};
