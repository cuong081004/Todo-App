import { useState, useEffect, useCallback } from "react";
import CalendarView from "../../components/CalendarView"; // Sửa đường dẫn
import axios from "../../api/axios"; // Sửa đường dẫn

export default function CalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data?.data ?? []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (loading) return <div className="loading-spinner">Đang tải lịch...</div>;

  return (
    <div className="calendar-page">
      <div className="page-header">
        <h1>📅 Lịch Công Việc</h1>
        <p>Xem công việc của bạn theo lịch</p>
      </div>

      <CalendarView tasks={tasks} />
    </div>
  );
}