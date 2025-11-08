import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:5000/api', 
    // baseURL: 'https://todo-app-t1g9.onrender.com/api', // ⚡ Dùng URL backend của bạn
});

export default instance;
