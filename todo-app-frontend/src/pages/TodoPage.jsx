import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import axios from "../api/axios";
import TaskList from "../components/TaskList";
import TaskForm from "../components/TaskForm";
import { useNavigate } from "react-router-dom";
import CalendarView from "../components/CalendarView";
import { ThemeContext } from "../context/ThemeContext";

export default function TodoPage() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // FETCH TASKS
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data.data || res.data);
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate("/login");
      } else {
        setError('Không thể tải danh sách công việc');
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchTasks();
  }, [token, navigate, fetchTasks]);

  // ADD TASK
  const handleAdd = async (data) => {
    try {
      const res = await axios.post("/tasks", data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newTask = res.data.data || res.data;
      setTasks([newTask, ...tasks]);
    } catch (err) {
      console.error('Add error:', err);
      alert(err.response?.data?.message || 'Không thể thêm công việc');
    }
  };

  // TOGGLE COMPLETED
  const handleToggle = async (id, completed) => {
    try {
      const res = await axios.patch(
        `/tasks/${id}`,
        { completed: !completed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedTask = res.data.data || res.data;
      setTasks(tasks.map((t) => (t._id === id ? updatedTask : t)));
    } catch (err) {
      console.error('Toggle error:', err);
      alert('Không thể cập nhật trạng thái');
    }
  };

  // EDIT TASK
  const handleEdit = async (id, data) => {
    try {
      const res = await axios.patch(`/tasks/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedTask = res.data.data || res.data;
      setTasks(tasks.map((t) => (t._id === id ? updatedTask : t)));
    } catch (err) {
      console.error('Edit error:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật công việc');
    }
  };

  // DELETE TASK
  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa công việc này?')) return;
    
    try {
      await axios.delete(`/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(tasks.filter((t) => t._id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Không thể xóa công việc');
    }
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // FILTER + SEARCH (Memoized)
  const filteredTasks = useMemo(() => {
    const now = new Date();
    
    return tasks
      .filter((t) => t.title?.toLowerCase().includes(search.toLowerCase()))
      .filter((t) => {
        if (filter === "all") return true;
        if (filter === "completed") return t.completed === true;
        if (filter === "incomplete") return t.completed === false;
        if (filter === "withDate") return t.dueDate != null;
        if (filter === "overdue") {
          return t.dueDate && new Date(t.dueDate) < now && t.completed === false;
        }
        return true;
      });
  }, [tasks, search, filter]);

  // SORT (Memoized)
  const sortedTasks = useMemo(() => {
    let result = [...filteredTasks];

    if (sort === "date") {
      result.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    } else if (sort === "name") {
      result.sort((a, b) =>
        a.title.localeCompare(b.title, "vi", { sensitivity: "base" })
      );
    }

    return result;
  }, [filteredTasks, sort]);

  if (loading) {
    return (
      <div className="todo-container">
        <div className="loading-spinner">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="todo-container">
      <div className="header">
        <h2>Danh sách công việc</h2>
        <div className="header-actions">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="theme-toggle"
            aria-label={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {darkMode ? "🌞" : "🌙"}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Đăng xuất
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <input
        type="text"
        placeholder="Tìm công việc..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
        aria-label="Tìm kiếm công việc"
      />

      {/* FILTER */}
      <div className="filter-buttons">
        <button 
          onClick={() => setFilter("all")}
          className={filter === "all" ? "active" : ""}
        >
          Tất cả ({tasks.length})
        </button>
        <button 
          onClick={() => setFilter("completed")}
          className={filter === "completed" ? "active" : ""}
        >
          Hoàn thành ({tasks.filter(t => t.completed).length})
        </button>
        <button 
          onClick={() => setFilter("incomplete")}
          className={filter === "incomplete" ? "active" : ""}
        >
          Chưa hoàn thành ({tasks.filter(t => !t.completed).length})
        </button>
        <button 
          onClick={() => setFilter("withDate")}
          className={filter === "withDate" ? "active" : ""}
        >
          Có ngày
        </button>
        <button 
          onClick={() => setFilter("overdue")}
          className={filter === "overdue" ? "active" : ""}
        >
          Trễ hạn
        </button>
      </div>

      {/* SORT */}
      <div className="sort-container">
        <label htmlFor="sort-select">Sắp xếp:</label>
        <select
          id="sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="sort-select"
        >
          <option value="none">Mặc định</option>
          <option value="date">Ngày gần nhất</option>
          <option value="name">Tên A → Z</option>
        </select>
      </div>

      <TaskForm onAdd={handleAdd} />

      {sortedTasks.length === 0 ? (
        <div className="empty-state">
          {search ? "Không tìm thấy công việc" : "Chưa có công việc nào"}
        </div>
      ) : (
        <TaskList
          tasks={sortedTasks}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEdit={handleEdit}
          search={search}
        />
      )}

      <CalendarView tasks={tasks} />
    </div>
  );
}