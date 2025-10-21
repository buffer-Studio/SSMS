/**
 * Constants used throughout the application
 */

// API Configuration
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
export const API_BASE_URL = `${BACKEND_URL}/api`;

// Schedule Constants
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
export const DEFAULT_BREAK_AFTER = 3;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme'
};

// Time Constants
export const REFRESH_INTERVAL = 30000; // 30 seconds
export const RECENT_CHANGE_HOURS = 24;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ADMIN_DASHBOARD: '/admin',
  TEACHER_DASHBOARD: '/dashboard'
};

// Toast Configuration
export const TOAST_CONFIG = {
  SUCCESS_DURATION: 3000,
  ERROR_DURATION: 5000,
  WARNING_DURATION: 4000
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    VERIFY: '/auth/verify'
  },
  USERS: '/users',
  SCHEDULES: '/schedules',
  CHANGELOGS: '/changelogs',
  SETTINGS: {
    BREAK_PERIOD: '/settings/break-period'
  },
  DEMO: {
    LOAD_SCHEDULES: '/demo/load-schedules',
    CLEAR_SCHEDULES: '/demo/clear-schedules'
  }
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred.'
};
