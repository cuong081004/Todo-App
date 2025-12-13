import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import AdvancedTaskForm from "../../components/AdvancedTaskForm";
import AdvancedTaskList from "../../components/AdvancedTaskList";
import TaskDetailModal from "../../components/TaskDetailModal";
import axios from "../../api/axios";

export default function AdvancedTaskPage() {
  const { selectedProject, currentProject, fetchProjects } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("list");
  const [formLoading, setFormLoading] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const token = localStorage.getItem("token");

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/advanced-tasks/advanced", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          projectId: selectedProject || undefined,
        },
      });
      setTasks(res.data?.data ?? []);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Không thể tải danh sách công việc";
      setError(errorMessage);
      console.error("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedProject]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Đồng bộ dữ liệu khi có task update từ TaskList
  useEffect(() => {
    const handleTaskUpdated = async (event) => {
      const updatedTaskId = event.detail?.taskId;
      if (updatedTaskId) {
        console.log('🔄 AdvancedTaskPage nhận task update:', updatedTaskId);
        
        // Refresh task list
        await fetchTasks();
        
        // Nếu đang xem task đó trong modal, cập nhật
        if (selectedTask && selectedTask._id === updatedTaskId) {
          try {
            const res = await axios.get(`/advanced-tasks/advanced`, {
              headers: { Authorization: `Bearer ${token}` },
              params: {
                search: updatedTaskId,
                limit: 1
              }
            });
            if (res.data.data[0]) {
              setSelectedTask(res.data.data[0]);
            }
          } catch (err) {
            console.error('Không thể fetch task chi tiết:', err);
          }
        }
      }
    };

    window.addEventListener('taskUpdated', handleTaskUpdated);
    
    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdated);
    };
  }, [token, selectedTask, fetchTasks]);

  // Add new task
  const handleAddTask = async (taskData) => {
    setFormLoading(true);
    setError("");
    try {
      const taskWithProject = {
        ...taskData,
        projectId: selectedProject || null,
      };

      await axios.post("/advanced-tasks", taskWithProject, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchTasks();
      await fetchProjects();
      setView("list");
      setError("");
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Không thể thêm công việc";
      setError(errorMessage);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  // Xem chi tiết task
  const handleViewDetail = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  // Mở modal chỉnh sửa
  const handleEdit = (task) => {
    console.log("✏️ Editing task:", task._id);
    setEditingTask(task);
    setView("form");
  };

  // Đóng modal chi tiết
  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  // Cập nhật task sau khi chỉnh sửa
  const handleTaskUpdate = async (updatedTask) => {
    try {
      const taskId = editingTask?._id;
      
      console.log("🔄 Updating task with ID:", taskId);
      
      if (!taskId) {
        throw new Error("Task ID is missing");
      }

      const res = await axios.patch(
        `/advanced-tasks/${taskId}`,
        updatedTask,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh tasks để lấy dữ liệu mới
      await fetchTasks();
      
      // Cập nhật selectedTask nếu đang mở modal
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask(res.data.data);
      }
      
      // Đóng form chỉnh sửa
      setEditingTask(null);
      setView("list");
      
      await fetchProjects();
      
      return res.data.data;
    } catch (err) {
      console.error("Update task error:", err);
      console.error("Error details:", err.response?.data);
      
      let errorMessage = "Không thể cập nhật task";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message === "Task ID is missing") {
        errorMessage = "Thiếu ID task";
      }
      
      throw new Error(errorMessage);
    }
  };

  // Hủy chỉnh sửa
  const handleCancelEdit = () => {
    setEditingTask(null);
    setView("list");
  };

  // Toggle task completion với xử lý checklist
  const handleToggle = async (id, completed) => {
    try {
      const task = tasks.find(t => t._id === id);
      if (!task) return;
      
      const newCompleted = !completed;
      
      // Nếu task có checklist và tất cả đã hoàn thành, thì task hoàn thành
      let shouldComplete = newCompleted;
      if (task.checklist && task.checklist.length > 0) {
        const allChecklistCompleted = task.checklist.every(item => item.completed);
        shouldComplete = allChecklistCompleted ? true : newCompleted;
      }
      
      const res = await axios.patch(
        `/advanced-tasks/${id}`,
        { 
          completed: shouldComplete,
          status: shouldComplete ? "done" : "todo" 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // QUAN TRỌNG: Gọi fetchTasks để lấy dữ liệu mới nhất từ server
      await fetchTasks();
      
      // Cập nhật selectedTask nếu đang mở modal
      if (selectedTask && selectedTask._id === id) {
        setSelectedTask(res.data.data);
      }
      
      // Gửi event để calendar refresh
      const detail = {
        type: 'advancedTaskUpdated',
        taskId: id,
        completed: shouldComplete,
        timestamp: new Date().toISOString()
      };
      
      window.dispatchEvent(new CustomEvent('refreshCalendar', { detail }));
      window.dispatchEvent(new CustomEvent('taskUpdated', { detail }));
      
    } catch (err) {
      console.error("Toggle task error:", err);
      const errorMessage = err.response?.data?.message || "Không thể cập nhật trạng thái";
      alert(errorMessage);
    }
  };

  // Delete task
  const handleDelete = async (id) => {
    const taskToDelete = tasks.find(t => t._id === id);
    
    if (!taskToDelete) {
      alert("Không tìm thấy task để xóa");
      return;
    }
    
    if (!window.confirm(`Bạn có chắc muốn xóa task "${taskToDelete.title}"?`)) return;
    
    const originalTasks = [...tasks];
      
    try {
      // Optimistic update
      setTasks(prev => prev.filter((t) => t._id !== id));
      
      // Gọi API xóa
      await axios.delete(`/advanced-tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      await fetchProjects();
      
      // Đóng modal nếu đang xem task bị xóa
      if (selectedTask && selectedTask._id === id) {
        handleCloseDetail();
      }
      
      // Hiển thị thông báo thành công
      setError("");
    } catch (err) {
      console.error("Delete task error:", err);
      // Rollback optimistic update
      setTasks(originalTasks);
      const errorMessage = err.response?.data?.message || "Không thể xóa task";
      alert(errorMessage);
    }
  };

  // Xóa task từ modal chi tiết
  const handleDeleteFromModal = async (id) => {
    await handleDelete(id);
    handleCloseDetail();
  };

  // Toggle checklist item với đồng bộ hoàn thành task
  const handleChecklistToggle = async (taskId, checklistIndex) => {
    try {
      const task = tasks.find((t) => t._id === taskId);
      if (!task || !task.checklist || !task.checklist[checklistIndex]) {
        throw new Error("Checklist item không tồn tại");
      }

      const completed = !task.checklist[checklistIndex].completed;

      // Gọi API cập nhật checklist item
      await axios.patch(
        `/advanced-tasks/${taskId}/checklist`,
        { checklistIndex, completed },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // QUAN TRỌNG: Refresh tasks để lấy dữ liệu mới
      await fetchTasks();

      // Gửi event để calendar cập nhật
      const detail = {
        type: 'taskChecklistUpdated',
        taskId,
        completed,
        timestamp: new Date().toISOString()
      };
      
      window.dispatchEvent(new CustomEvent('refreshCalendar', { detail }));
      window.dispatchEvent(new CustomEvent('taskUpdated', { detail }));
      
    } catch (err) {
      console.error("Toggle checklist error:", err);
      const errorMessage = err.response?.data?.message || "Không thể cập nhật checklist";
      alert(errorMessage);
    }
  };

  // Mark all checklist items as completed/uncompleted
  const handleMarkAllChecklist = async (taskId) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (!task || !task.checklist || task.checklist.length === 0) return;
      
      const allCurrentlyCompleted = task.checklist.every(item => item.completed);
      const newCompletedState = !allCurrentlyCompleted;
      
      // Gọi API để cập nhật tất cả checklist items
      for (let i = 0; i < task.checklist.length; i++) {
        await axios.patch(
          `/advanced-tasks/${taskId}/checklist`,
          { checklistIndex: i, completed: newCompletedState },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      // Cập nhật task status nếu cần
      await axios.patch(
        `/advanced-tasks/${taskId}`,
        { 
          completed: newCompletedState,
          status: newCompletedState ? 'done' : 'todo'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // QUAN TRỌNG: Refresh tasks để lấy dữ liệu mới
      await fetchTasks();
      
      // Gửi event
      const detail = {
        type: 'taskAllChecklistUpdated',
        taskId,
        completed: newCompletedState,
        timestamp: new Date().toISOString()
      };
      
      window.dispatchEvent(new CustomEvent('refreshCalendar', { detail }));
      window.dispatchEvent(new CustomEvent('taskUpdated', { detail }));
      
    } catch (error) {
      console.error('Mark all checklist error:', error);
      // Rollback optimistic update
      await fetchTasks();
    }
  };

  // Clear error khi chuyển view
  const handleViewChange = (newView) => {
    setError("");
    setView(newView);
    if (newView === "list") {
      setEditingTask(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="advanced-task-page">
      <div className="page-header">
        <h1>🚀 Quản lý Task Nâng Cao</h1>
        <p>Quản lý công việc với đầy đủ tính năng chuyên nghiệp</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button 
            onClick={() => setError("")} 
            className="close-error-btn"
            style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* View Toggle */}
      <div className="view-toggle">
        <button
          className={view === "list" ? "active" : ""}
          onClick={() => handleViewChange("list")}
        >
          📋 Danh sách Task
        </button>
        <button
          className={view === "form" ? "active" : ""}
          onClick={() => handleViewChange("form")}
        >
          {editingTask ? "✏️ Chỉnh Sửa Task" : "➕ Tạo Task Mới"}
        </button>
      </div>

      {/* Current Project Info */}
      {currentProject && (
        <div className="current-project-info">
          <span
            className="project-color-badge"
            style={{ backgroundColor: currentProject.color }}
          ></span>
          <span>
            Đang xem: <strong>{currentProject.name}</strong>
          </span>
          <span className="task-count">({tasks.length} tasks)</span>
        </div>
      )}

      {/* Content */}
      {view === "form" ? (
        <div className="form-section">
          <AdvancedTaskForm
            onAdd={editingTask ? handleTaskUpdate : handleAddTask}
            currentProject={currentProject}
            loading={formLoading}
            editingTask={editingTask}
            onCancel={editingTask ? handleCancelEdit : undefined}
          />
        </div>
      ) : (
        <div className="list-section">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>Chưa có task nào</h3>
              <p>Hãy tạo task đầu tiên để bắt đầu quản lý công việc!</p>
              <button
                onClick={() => handleViewChange("form")}
                className="create-first-task-btn"
              >
                🚀 Tạo Task Đầu Tiên
              </button>
            </div>
          ) : (
            <AdvancedTaskList
              tasks={tasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onViewDetail={handleViewDetail}
              onChecklistToggle={handleChecklistToggle}
              onMarkAllChecklist={handleMarkAllChecklist}
            />
          )}
        </div>
      )}

      {/* Modal chi tiết task */}
      {showDetailModal && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={handleCloseDetail}
          onEdit={handleEdit}
          onDelete={handleDeleteFromModal}
          onChecklistToggle={handleChecklistToggle}
        />
      )}
    </div>
  );
}