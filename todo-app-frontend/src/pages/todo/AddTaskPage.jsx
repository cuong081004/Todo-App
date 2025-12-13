import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import TaskForm from "../../components/TaskForm"; // Sửa đường dẫn
import axios from "../../api/axios"; // Sửa đường dẫn

export default function AddTaskPage() {
  const { selectedProject, currentProject, fetchProjects } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleAddTask = async (taskData) => {
    setLoading(true);
    setError("");

    try {
      const taskWithProject = {
        ...taskData,
        projectId: selectedProject || null,
      };

      await axios.post("/tasks", taskWithProject, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh projects to update task counts
      await fetchProjects();
      
      // Navigate back to tasks page
      navigate("/tasks");
    } catch (err) {
      setError(err.response?.data?.message || "Không thể thêm công việc");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-task-page">
      <div className="page-header">
        <h1>➕ Thêm Công Việc Mới</h1>
        <p>Tạo công việc mới với đầy đủ thông tin</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-container">
        <TaskForm 
          onAdd={handleAddTask}
          currentProject={currentProject}
          loading={loading}
        />
        
        <div className="quick-actions">
          <button 
            onClick={() => navigate("/tasks")}
            className="back-btn"
          >
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    </div>
  );
}