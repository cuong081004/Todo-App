import axios from 'axios';

// Kiểm tra môi trường để sử dụng URL phù hợp
const getBaseURL = () => {
  // Nếu đang chạy trên Vercel, dùng Render backend
  if (window.location.hostname.includes('vercel.app')) {
    return 'https://todo-app-t1g9.onrender.com/api';
  }
  // Nếu là localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  // Mặc định dùng Render
  return 'https://todo-app-t1g9.onrender.com/api';
};

// Tạo instance axios với timeout
const instance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // TĂNG timeout lên 30 giây
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
      if (error.message.includes('Failed to fetch')) {
        return Promise.reject(new Error('Cannot connect to server. Please check your internet connection.'));
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
      localStorage.removeItem('user');
      // Chỉ redirect nếu không ở trang login/register
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    
    // Xử lý CORS errors cụ thể
    if (error.response.status === 403 && error.response.data?.message?.includes('CORS')) {
      console.error('🔒 CORS error detected');
      return Promise.reject(new Error('CORS error. Please check server configuration.'));
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