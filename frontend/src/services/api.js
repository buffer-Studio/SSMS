/**
 * Centralized API client for making HTTP requests
 * Handles authentication, error handling, and response formatting
 */
import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS, HTTP_STATUS, ERROR_MESSAGES } from '../constants';

/**
 * Create axios instance with default configuration
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request interceptor to add auth token
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customError = {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      status: null,
      data: null
    };

    if (error.response) {
      // Server responded with error status
      customError.status = error.response.status;
      customError.data = error.response.data;

      switch (error.response.status) {
        case HTTP_STATUS.UNAUTHORIZED:
          customError.message = error.response.data?.detail || ERROR_MESSAGES.UNAUTHORIZED;
          // Clear auth data on unauthorized
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          break;
        case HTTP_STATUS.FORBIDDEN:
          customError.message = error.response.data?.detail || ERROR_MESSAGES.FORBIDDEN;
          break;
        case HTTP_STATUS.NOT_FOUND:
          customError.message = error.response.data?.detail || 'Resource not found';
          break;
        case HTTP_STATUS.CONFLICT:
          customError.message = error.response.data?.detail || 'Resource conflict';
          break;
        case HTTP_STATUS.INTERNAL_SERVER_ERROR:
          customError.message = ERROR_MESSAGES.SERVER_ERROR;
          break;
        default:
          customError.message = error.response.data?.detail || ERROR_MESSAGES.UNKNOWN_ERROR;
      }
    } else if (error.request) {
      // Request made but no response
      customError.message = ERROR_MESSAGES.NETWORK_ERROR;
    } else {
      // Error in request setup
      customError.message = error.message;
    }

    return Promise.reject(customError);
  }
);

/**
 * API service methods
 */
export const api = {
  // Authentication
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    verify: () => apiClient.get('/auth/verify')
  },

  // Users
  users: {
    getAll: () => apiClient.get('/users'),
    create: (userData) => apiClient.post('/users', userData),
    delete: (userId) => apiClient.delete(`/users/${userId}`)
  },

  // Schedules
  schedules: {
    getAll: (teacherId) => {
      const params = teacherId ? { teacher_id: teacherId } : {};
      return apiClient.get('/schedules', { params });
    },
    create: (scheduleData) => apiClient.post('/schedules', scheduleData),
    update: (scheduleId, updateData) => apiClient.put(`/schedules/${scheduleId}`, updateData),
    delete: (scheduleId) => apiClient.delete(`/schedules/${scheduleId}`)
  },

  // Changelogs
  changelogs: {
    getAll: (teacherId) => {
      const params = teacherId ? { teacher_id: teacherId } : {};
      return apiClient.get('/changelogs', { params });
    }
  },

  // Settings
  settings: {
    getBreakPeriod: () => apiClient.get('/settings/break-period'),
    updateBreakPeriod: (breakAfter) => 
      apiClient.put(`/settings/break-period?break_after=${breakAfter}`)
  },

  // Demo data
  demo: {
    loadSchedules: () => apiClient.post('/demo/load-schedules'),
    clearSchedules: () => apiClient.post('/demo/clear-schedules')
  }
};

export default apiClient;
