import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://promotion-backend.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  // Check if this is an admin route
  if (config.url && config.url.includes('/admin/')) {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else {
    // For regular user routes
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle token expiration and authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if it's a 401 (Unauthorized) error
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message;
      
      // Check if this was an admin route
      if (error.config?.url && error.config.url.includes('/admin/')) {
        console.log('🔐 Admin session expired or invalid');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
        
        // Show alert for better UX
        if (errorCode === 'TOKEN_EXPIRED') {
          alert('Your admin session has expired. Please login again.');
        }
        
        window.location.href = '/admin/login';
      } else {
        // For regular user routes
        console.log('🔐 User session expired or invalid:', errorCode);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Show alert for better UX
        if (errorCode === 'TOKEN_EXPIRED') {
          alert('Your session has expired. Please login again.');
        } else if (errorMessage) {
          alert(errorMessage);
        }
        
        window.location.href = '/login';
      }
    }
    
    // Check for 400 errors that might be token-related
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.message;
      if (errorMessage && (
        errorMessage.toLowerCase().includes('token') || 
        errorMessage.toLowerCase().includes('expired') ||
        errorMessage.toLowerCase().includes('invalid')
      )) {
        console.log('🔐 Token issue detected in 400 error');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Your session is invalid. Please login again.');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;