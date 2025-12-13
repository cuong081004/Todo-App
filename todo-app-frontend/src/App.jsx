import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TodoLayout from './pages/todo/TodoLayout';
import TaskListPage from './pages/todo/TaskListPage';
import AddTaskPage from './pages/todo/AddTaskPage';
import CalendarPage from './pages/todo/CalendarPage';
import AnalyticsPage from './pages/todo/AnalyticsPage'; // Thêm import
import AdvancedTaskPage from './pages/todo/AdvancedTaskPage';
import './App.css';

function App() {
  const token = localStorage.getItem('token');

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
            <Route path="analytics" element={<AnalyticsPage />} /> {/* Thêm route */}
            <Route path="advanced-tasks" element={<AdvancedTaskPage />} />
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;