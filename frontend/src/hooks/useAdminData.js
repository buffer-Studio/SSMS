import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useTeachers = (token, options = {}) => {
  const { enablePagination = false, pageSize = 10 } = options;
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTeachers = async (pageNum = page) => {
    try {
      setLoading(true);
      setError(null);

      const params = enablePagination ? { page: pageNum, limit: pageSize } : {};
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setTeachers(response.data.filter(user => user.role === 'teacher'));

      // Handle pagination metadata if available
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages || 1);
        setTotalCount(response.data.pagination.totalCount || response.data.length);
      } else {
        setTotalPages(1);
        setTotalCount(response.data.length);
      }

    } catch (error) {
      const errorMessage = 'Failed to load teachers';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTeachers();
    }
  }, [token, enablePagination, pageSize]);

  useEffect(() => {
    if (enablePagination && token) {
      fetchTeachers(page);
    }
  }, [page, token]);

  const refetch = () => fetchTeachers(page);

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
    }
  };

  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);

  return {
    teachers,
    loading,
    error,
    refetch,
    // Pagination
    pagination: enablePagination ? {
      page,
      pageSize,
      totalPages,
      totalCount,
      goToPage,
      nextPage,
      prevPage,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    } : null
  };
};

export const useSchedules = (token, options = {}) => {
  const { enablePagination = false, pageSize = 20, filters = {} } = options;
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSchedules = async (pageNum = page) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        ...(enablePagination && { page: pageNum, limit: pageSize }),
        ...filters
      };

      const response = await axios.get(`${API}/schedules`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setSchedules(response.data);

      // Handle pagination metadata if available
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages || 1);
        setTotalCount(response.data.pagination.totalCount || response.data.length);
      } else {
        setTotalPages(1);
        setTotalCount(response.data.length);
      }

    } catch (error) {
      const errorMessage = 'Failed to load schedules';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSchedules();
    }
  }, [token, enablePagination, pageSize, JSON.stringify(filters)]);

  useEffect(() => {
    if (enablePagination && token) {
      fetchSchedules(page);
    }
  }, [page, token]);

  const refetch = () => fetchSchedules(page);

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
    }
  };

  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);

  return {
    schedules,
    loading,
    error,
    refetch,
    // Pagination
    pagination: enablePagination ? {
      page,
      pageSize,
      totalPages,
      totalCount,
      goToPage,
      nextPage,
      prevPage,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    } : null,
    // Filters
    setFilters: (newFilters) => {
      // This would trigger a refetch with new filters
      fetchSchedules(1); // Reset to first page when filtering
    }
  };
};

export const useSettings = () => {
  const [breakAfter, setBreakAfter] = useState(3);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings/break-period`);
      setBreakAfter(response.data.break_after_period);
    } catch (error) {
      console.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateBreakPeriod = async (value, token) => {
    try {
      await axios.put(`${API}/settings/break-period?break_after=${value}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBreakAfter(value);
      return true;
    } catch (error) {
      console.error('Failed to update break period');
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { breakAfter, loading, refetch: fetchSettings, updateBreakPeriod };
};
