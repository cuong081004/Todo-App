import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:5000/api', // đổi nếu backend deploy sau này
});

export default instance;
