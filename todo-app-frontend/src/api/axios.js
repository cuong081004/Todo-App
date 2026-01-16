import axios from 'axios';
// baseURL: 'http://localhost:5000/api',
// Tạo instance axios với timeout
const API_URL = import.meta.env.VITE_API_URL || 'https://todo-app-t1g9.onrender.com/api';
// Tạo instance axios với timeout
const instance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: false,
});
// Request interceptor để thêm token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    config.headers['Content-Type'] = 'application/json';
    config.headers['Accept'] = 'application/json';
    
    console.log('📤 Request:', {
      url: config.url,
      method: config.method,
      params: config.params
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor để xử lý lỗi
instance.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', {
      url: response.config.url,
      status: response.status,
      dataLength: response.data?.data?.length || 0
    });
    return response;
  },
  (error) => {
    // KHÔNG log CanceledError (đây là expected behavior)
    if (axios.isCancel(error)) {
      console.log('⏹️ Request canceled:', error.message);
      return Promise.reject(error);
    }
    
    console.error('❌ Axios error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.response?.status,
    });
    
    // Xử lý timeout
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout');
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    
    // Xử lý network errors
    if (!error.response) {
      console.error('🌐 Network error - no response received');
      if (error.message.includes('Network Error')) {
        return Promise.reject(new Error('Cannot connect to server. Please check if the backend server is running.'));
      }
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    // Xử lý CORS errors
    if (error.response.status === 0) {
      console.error('🔒 CORS or network error - status 0');
      return Promise.reject(new Error('Cannot connect to server. Please check CORS configuration and ensure backend is running.'));
    }
    
    // Xử lý authentication errors
    if (error.response.status === 401) {
      console.warn('🔑 Authentication error - removing token');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Xử lý server errors
    if (error.response.status >= 500) {
      console.error('💥 Server error:', error.response.status);
      return Promise.reject(new Error(`Server error ${error.response.status}. Please try again later.`));
    }
    
    // Trả về error từ server
    const serverMessage = error.response.data?.message || `Error ${error.response.status}`;
    return Promise.reject(new Error(serverMessage));
  }
);

// Hàm helper để tạo cancel token
export const createCancelToken = () => {
  return axios.CancelToken.source();
};

// Hàm helper cho debounced requests
export const debounceRequest = (func, wait) => {
  let timeout;
  let cancelToken;
  
  return function(...args) {
    // Cancel previous request
    if (cancelToken) {
      cancelToken.cancel('Request canceled due to new request');
    }
    
    // Create new cancel token
    cancelToken = createCancelToken();
    
    // Clear previous timeout
    clearTimeout(timeout);
    
    return new Promise((resolve, reject) => {
      timeout = setTimeout(() => {
        func(...args, cancelToken.token)
          .then(resolve)
          .catch((error) => {
            if (!axios.isCancel(error)) {
              reject(error);
            }
          });
      }, wait);
    });
  };
};

// Test connection function
export const testConnection = async () => {
  try {
    const response = await instance.get('/health');
    return {
      connected: true,
      data: response.data
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
};

export default instance;