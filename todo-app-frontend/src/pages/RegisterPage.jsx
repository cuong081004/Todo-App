import { useState } from 'react';
import axios from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Đăng ký tài khoản
      await axios.post('/auth/register', { username, password });
      
      // Tự động đăng nhập sau khi đăng ký
      const loginRes = await axios.post('/auth/login', { username, password });
      
      // Lưu token và user info
      localStorage.setItem('token', loginRes.data.token);
      localStorage.setItem('user', JSON.stringify({
        id: loginRes.data.user.id,
        username: loginRes.data.user.username
      }));
      
      setMessage('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="auth-container">
      <h2>Đăng ký</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Đăng ký</button>
      </form>
      <p>{message}</p>
      <p>
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </div>
  );
}