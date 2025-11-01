import { useState, useEffect } from 'react';
import axios from '../api/axios';
import TaskList from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import { useNavigate } from 'react-router-dom';

export default function TodoPage() {
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Gọi API lấy danh sách task
  const fetchTasks = async () => {
    try {
      const res = await axios.get('/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAdd = async (title) => {
    const res = await axios.post(
      '/tasks',
      { title },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setTasks([res.data, ...tasks]);
  };

  const handleToggle = async (id, completed) => {
    const res = await axios.patch(
      `/tasks/${id}`,
      { completed: !completed },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setTasks(tasks.map((t) => (t._id === id ? res.data : t)));
  };

  const handleDelete = async (id) => {
    await axios.delete(`/tasks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTasks(tasks.filter((t) => t._id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="todo-container">
      <h2>Danh sách công việc</h2>
      <button onClick={handleLogout}>Đăng xuất</button>
      <TaskForm onAdd={handleAdd} />
      <TaskList tasks={tasks} onToggle={handleToggle} onDelete={handleDelete} />
    </div>
  );
}
