import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TodoLayout from './pages/todo/TodoLayout';
import TaskListPage from './pages/todo/TaskListPage';
import AddTaskPage from './pages/todo/AddTaskPage';
import CalendarPage from './pages/todo/CalendarPage';
import AnalyticsPage from './pages/todo/AnalyticsPage';
import AdvancedTaskPage from './pages/todo/AdvancedTaskPage';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Khởi tạo state từ localStorage ngay lần đầu
    const token = localStorage.getItem('token');
    return !!token;
  });

  // Lắng nghe sự kiện storage để cập nhật khi login/logout
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <div className="app-container">
      <Router>
        <Routes>
          {/* Public routes - KHÔNG cần kiểm tra auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
                <TodoLayout /> : 
                <Navigate to="/login" replace state={{ from: '/' }} />
            }
          >
            <Route index element={<Navigate to="/tasks" replace />} />
            <Route path="tasks" element={<TaskListPage />} />
            <Route path="add-task" element={<AddTaskPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="advanced-tasks" element={<AdvancedTaskPage />} />
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;