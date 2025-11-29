import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "../api/axios";
import TaskList from "../components/TaskList";
import TaskForm from "../components/TaskForm";
import { useNavigate } from "react-router-dom";
import CalendarView from "../components/CalendarView";
import { useTheme } from "../hooks/useTheme";

export default function TodoPage() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ----------------------- REQUEST NOTIFICATION PERMISSION -----------------------
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;

    let permission = Notification.permission;
    if (permission === "default") {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // ----------------------- REGISTER WEB PUSH SUBSCRIPTION -----------------------
  const registerWebPush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const reg = await navigator.serviceWorker.ready;

    // Fetch VAPID public key
    const { data } = await axios.get("/push/public-key");
    const vapidPublicKey = data.key;

    const convertKey = (base64) =>
      Uint8Array.from(
        atob(base64.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0)
      );

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertKey(vapidPublicKey),
    });

    await axios.post(
      "/push/subscribe",
      { subscription },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("WebPush Subscribed:", subscription);
  };

  useEffect(() => {
    if (token) registerWebPush();
  }, [token]);

  // ------------------------ SEND TASK TO SERVICE WORKER ------------------------
  const sendTaskToSW = (task) => {
    if (!task) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({
          type: "schedule-task",
          payload: task,
        });
      });
    }
  };

  // ------------------------------ FETCH TASKS ------------------------------
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get("/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = Array.isArray(res.data.data) ? res.data.data : [];
      setTasks(list);
      list.forEach(sendTaskToSW);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        setError("Không thể tải danh sách công việc");
      }
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return navigate("/login");
    fetchTasks();
  }, [token, fetchTasks, navigate]);

  // ------------------------------ ADD TASK ------------------------------
  const handleAdd = async (data) => {
    try {
      const res = await axios.post("/tasks", data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newTask = res.data.data;
      setTasks([newTask, ...tasks]);
      sendTaskToSW(newTask);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể thêm công việc");
    }
  };

  // ------------------------------ TOGGLE DONE ------------------------------
  const handleToggle = async (id, completed) => {
    try {
      const res = await axios.patch(
        `/tasks/${id}`,
        { completed: !completed },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = res.data.data;
      setTasks(tasks.map((t) => (t._id === id ? updated : t)));
      sendTaskToSW(updated);
    } catch (err) {
      console.error(err);
      alert("Không thể cập nhật trạng thái");
    }
  };

  // ------------------------------ EDIT TASK ------------------------------
  const handleEdit = async (id, data) => {
    try {
      const res = await axios.patch(`/tasks/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updated = res.data.data;
      setTasks(tasks.map((t) => (t._id === id ? updated : t)));
      sendTaskToSW(updated);
    } catch (err) {
      console.error(err);
      alert("Không thể cập nhật công việc");
    }
  };

  // ------------------------------ DELETE TASK ------------------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa?")) return;

    try {
      await axios.delete(`/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTasks(tasks.filter((t) => t._id !== id));
    } catch (err) {
      console.error(err);
      alert("Không thể xóa công việc");
    }
  };

  // --------------------------- LOGOUT ---------------------------
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // --------------------------- FILTER ---------------------------
  const filteredTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
      .filter((t) => {
        if (filter === "all") return true;
        if (filter === "completed") return t.completed;
        if (filter === "incomplete") return !t.completed;
        if (filter === "withDate") return t.dueDate != null;
        if (filter === "overdue")
          return t.dueDate && new Date(t.dueDate) < now && !t.completed;
        return true;
      });
  }, [tasks, search, filter]);

  // --------------------------- SORT ---------------------------
  const sortedTasks = useMemo(() => {
    let arr = [...filteredTasks];

    if (sort === "date") {
      arr.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    } else if (sort === "name") {
      arr.sort((a, b) =>
        a.title.localeCompare(b.title, "vi", { sensitivity: "base" })
      );
    }

    return arr;
  }, [filteredTasks, sort]);

  // ------------------------------ UI ------------------------------
  if (loading) return <div className="todo-container">Đang tải...</div>;

  return (
    <div className="todo-container">
      <div className="header">
        <h2>Danh sách công việc</h2>
        <div className="header-actions">
          <button onClick={toggleTheme}>{darkMode ? "🌞" : "🌙"}</button>
          <button onClick={handleLogout}>Đăng xuất</button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* FORM CONTROL */}
      <div className="form-card">
        <div className="search-row-compact">
          <input
            type="text"
            placeholder="🔍 Tìm công việc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input-compact"
          />
        </div>

        <div className="controls-row-compact">
          <div className="filter-buttons-compact">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tất cả</button>
            <button className={filter === "completed" ? "active" : ""} onClick={() => setFilter("completed")}>Hoàn thành</button>
            <button className={filter === "incomplete" ? "active" : ""} onClick={() => setFilter("incomplete")}>Chưa xong</button>
            <button className={filter === "withDate" ? "active" : ""} onClick={() => setFilter("withDate")}>Có ngày</button>
            <button className={filter === "overdue" ? "active" : ""} onClick={() => setFilter("overdue")}>Trễ hạn</button>
          </div>

          <div className="sort-container-compact">
            <span>Sắp xếp:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="sort-select-compact"
            >
              <option value="none">Mặc định</option>
              <option value="date">Ngày gần nhất</option>
              <option value="name">Tên A → Z</option>
            </select>
          </div>
        </div>

        <TaskForm onAdd={handleAdd} />
      </div>

      {/* TASK LIST */}
      {sortedTasks.length === 0 ? (
        <div className="empty-state">Không có công việc nào</div>
      ) : (
        <TaskList
          tasks={sortedTasks}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEdit={handleEdit}
          search={search}
        />
      )}

      {/* CALENDAR */}
      <CalendarView tasks={tasks} />
    </div>
  );
}
