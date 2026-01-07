import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './config';
import { getValidAccessToken, isTokenFullyExpired, clearAuthTokens } from './token-utils';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add access token
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get valid token (will refresh if needed)
    const token = await getValidAccessToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Check if token is fully expired
      const storedToken = localStorage.getItem('access_token');
      if (storedToken && isTokenFullyExpired(storedToken)) {
        clearAuthTokens();
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login?expired=true';
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors and refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await getValidAccessToken();
        
        if (newToken) {
          processQueue(null, newToken);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          
          isRefreshing = false;
          return axiosInstance(originalRequest);
        } else {
          // Refresh failed, clear tokens and redirect
          clearAuthTokens();
          processQueue(new Error('Token refresh failed'), null);
          isRefreshing = false;
          
          if (typeof window !== 'undefined') {
            window.location.href = '/login?expired=true';
          }
          
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        clearAuthTokens();
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login?expired=true';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

