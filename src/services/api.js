import axios from 'axios';

const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  return "https://apiharem.kuyumcufatih.com";
};

const API_URL = getBackendUrl();
const getTenantId = () => {
  if (process.env.REACT_APP_TENANT_ID) {
    return process.env.REACT_APP_TENANT_ID.toLowerCase();
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'kuyumcular-odasi-dev';
  }
  return 'kuyumcular-odasi';
};

export const TENANT_ID = getTenantId();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  config.headers['X-Tenant-Id'] = TENANT_ID;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      const base = process.env.PUBLIC_URL || '';
      window.location.href = `${base}/login`;
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password });
    return response.data;
  },
  
  verify: async () => {
    const response = await api.get('/api/auth/verify');
    return response.data;
  },
  
  setup: async (username, password) => {
    const response = await api.post('/api/auth/setup', { username, password });
    return response.data;
  },
  
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/api/auth/change-password', { currentPassword, newPassword });
    return response.data;
  }
};

export const settingsService = {
  getSettings: async () => {
    const response = await api.get('/api/settings');
    return response.data;
  },
  
  updateSettings: async (settings) => {
    const response = await api.put('/api/settings', settings);
    return response.data;
  }
};

export default api;
