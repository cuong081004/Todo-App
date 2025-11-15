import { useState, useEffect } from "react";
import axios from "../api/axios";
import TaskList from "../components/TaskList";
import TaskForm from "../components/TaskForm";
import { useNavigate } from "react-router-dom";
import CalendarView from "../components/CalendarView";

export default function TodoPage() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("none");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Gọi API lấy tasks
  const fetchTasks = async () => {
    try {
      const res = await axios.get("/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // CRUD
  const handleAdd = async (data) => {
    const res = await axios.post("/tasks", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
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

  const handleEdit = async (id, data) => {
    const res = await axios.patch(`/tasks/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTasks(tasks.map((t) => (t._id === id ? res.data : t)));
  };

  const handleDelete = async (id) => {
    await axios.delete(`/tasks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTasks(tasks.filter((t) => t._id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ---------- FILTER + SEARCH ----------
  const now = new Date();

  let filteredTasks = tasks
    .filter((t) =>
      t.title?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((t) => {
      if (filter === "all") return true;
      if (filter === "completed") return t.completed === true;
      if (filter === "incomplete") return t.completed === false;
      if (filter === "withDate") return t.dueDate != null;
      if (filter === "overdue") {
        return (
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.completed === false
        );
      }
      return true;
    });

  // ---------- SORT ----------
  let sortedTasks = [...filteredTasks];

  if (sort === "date") {
    sortedTasks.sort((a, b) => {
      if (!a.dueDate) return 1;  
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  if (sort === "name") {
    sortedTasks.sort((a, b) =>
      a.title.localeCompare(b.title, "vi", { sensitivity: "base" })
    );
  }

  return (
    <div className="todo-container">
      {/* SEARCH */}
      <input
        type="text"
        placeholder="Tìm công việc..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "8px",
          width: "100%",
          margin: "12px 0",
          fontSize: "16px",
        }}
      />

      {/* FILTER BUTTONS */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button onClick={() => setFilter("all")}>Tất cả</button>
        <button onClick={() => setFilter("completed")}>Hoàn thành</button>
        <button onClick={() => setFilter("incomplete")}>Chưa hoàn thành</button>
        <button onClick={() => setFilter("withDate")}>Có ngày</button>
        <button onClick={() => setFilter("overdue")}>Trễ hạn</button>
      </div>

      {/* SORT */}
      <div style={{ marginBottom: "12px" }}>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ padding: "8px" }}
        >
          <option value="none">Không sắp xếp</option>
          <option value="date">Ngày gần nhất</option>
          <option value="name">Tên A → Z</option>
        </select>
      </div>

      {/* HEADER */}
      <h2>Danh sách công việc</h2>
      <button onClick={handleLogout}>Đăng xuất</button>

      {/* ADD + LIST */}
      <TaskForm onAdd={handleAdd} />
      <TaskList
        tasks={sortedTasks}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onEdit={handleEdit}
        search={search}
      />

      {/* CALENDAR */}
      <CalendarView tasks={tasks} />
    </div>
  );
}
