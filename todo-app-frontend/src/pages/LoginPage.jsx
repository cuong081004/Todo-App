import { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Lấy redirect path nếu có
  const from = location.state?.from?.pathname || '/';

  // CHỈ kiểm tra khi component mount, không chuyển hướng tự động
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Nếu đã có token, chuyển hướng đến trang trước đó hoặc trang chủ
      navigate(from, { replace: true });
    }
  }, []); // Empty dependency array - chỉ chạy một lần

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loading) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const res = await axios.post('/auth/login', { username, password });
      
      // Lưu token và user info
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify({
        id: res.data.user.id,
        username: res.data.user.username
      }));
      
      // Dispatch storage event để App cập nhật state
      window.dispatchEvent(new Event('storage'));
      
      setMessage('Đăng nhập thành công! Đang chuyển hướng...');
      
      // Chuyển hướng ngay lập tức, không cần timeout
      navigate(from, { replace: true });
      
    } catch (err) {
      setMessage(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Đăng nhập</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          required
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          autoComplete="current-password"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
      {message && <p className={message.includes('thành công') ? 'success' : 'error'}>{message}</p>}
      <p>
        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
      </p>
    </div>
  );
}