import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TodoLayout from './pages/todo/TodoLayout';
import TaskListPage from './pages/todo/TaskListPage';
import AddTaskPage from './pages/todo/AddTaskPage';
import CalendarPage from './pages/todo/CalendarPage';
import AnalyticsPage from './pages/todo/AnalyticsPage';
import AdvancedTaskPage from './pages/todo/AdvancedTaskPage';
import './App.css';
import { useEffect, useState } from 'react';

function App() {
  const [connectionError, setConnectionError] = useState(false);
  const token = localStorage.getItem('token');

  // Kiểm tra kết nối khi app load
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('https://todo-app-t1g9.onrender.com/health');
        if (!response.ok) {
          setConnectionError(true);
        }
      } catch (error) {
        console.warn('Backend connection check failed:', error);
        setConnectionError(true);
      }
    };

    checkConnection();
  }, []);

  if (connectionError) {
    return (
      <div className="app-container">
        <div className="connection-error">
          <h1>⚠️ Connection Issue</h1>
          <p>Unable to connect to the backend server.</p>
          <p>Please try again in a few moments.</p>
          <button onClick={() => window.location.reload()}>Retry Connection</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={token ? <TodoLayout /> : <Navigate to="/login" />}>
            <Route index element={<Navigate to="/tasks" />} />
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