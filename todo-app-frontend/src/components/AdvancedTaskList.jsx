import { useState } from "react";

const PRIORITY_CONFIG = {
  low: {
    label: "📉 Thấp",
    color: "#28a745",
    bgColor: "rgba(40, 167, 69, 0.1)",
  },
  medium: {
    label: "📊 Trung bình",
    color: "#ffc107",
    bgColor: "rgba(255, 193, 7, 0.1)",
  },
  high: {
    label: "📈 Cao",
    color: "#fd7e14",
    bgColor: "rgba(253, 126, 20, 0.1)",
  },
  urgent: {
    label: "🚨 Khẩn cấp",
    color: "#dc3545",
    bgColor: "rgba(220, 53, 69, 0.1)",
  },
};

const STATUS_CONFIG = {
  todo: {
    label: "📝 Todo",
    color: "#6c757d",
    bgColor: "rgba(108, 117, 125, 0.1)",
  },
  in_progress: {
    label: "🔄 In Progress",
    color: "#17a2b8",
    bgColor: "rgba(23, 162, 184, 0.1)",
  },
  review: {
    label: "👀 Review",
    color: "#6f42c1",
    bgColor: "rgba(111, 66, 193, 0.1)",
  },
  done: {
    label: "✅ Done",
    color: "#28a745",
    bgColor: "rgba(40, 167, 69, 0.1)",
  },
};

export default function AdvancedTaskList({
  tasks,
  onToggle,
  onDelete,
  onEdit,
  onViewDetail, // THÊM PROP NÀY
  onChecklistToggle,
}) {
  const [expandedTask, setExpandedTask] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'board'

  const toggleExpand = (taskId) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  const handleChecklistToggle = (taskId, checklistIndex) => {
    onChecklistToggle(taskId, checklistIndex);
  };

  const formatTime = (timeObj) => {
    if (!timeObj || timeObj.value === undefined || timeObj.value === null)
      return null;
    const units = { minutes: "phút", hours: "giờ", days: "ngày" };
    return `${timeObj.value} ${units[timeObj.unit] || timeObj.unit}`;
  };

  const calculateProgress = (task) => {
    if (task.checklist && task.checklist.length > 0) {
      const completed = task.checklist.filter((item) => item.completed).length;
      return (completed / task.checklist.length) * 100;
    }
    return task.completed ? 100 : 0;
  };

  // Board View
  if (viewMode === "board") {
    return (
      <div className="task-board-view">
        <div className="board-header">
          <h3>📋 Task Board</h3>
          <button onClick={() => setViewMode("list")}>📄 List View</button>
        </div>
        <div className="board-columns">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className="board-column">
              <div
                className="column-header"
                style={{ borderLeftColor: config.color }}
              >
                <h4>{config.label}</h4>
                <span className="task-count">
                  {tasks.filter((t) => t.status === status).length}
                </span>
              </div>
              <div className="column-tasks">
                {tasks
                  .filter((task) => task.status === status)
                  .map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onToggle={onToggle}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onViewDetail={onViewDetail} // THÊM VÀO TASK CARD
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="advanced-task-list">
      <div className="view-controls">
        <h3>📋 Advanced Tasks</h3>
        <div className="view-buttons">
          <button
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            📄 List
          </button>
          <button
            className={viewMode === "board" ? "active" : ""}
            onClick={() => setViewMode("board")}
          >
            🏗️ Board
          </button>
        </div>
      </div>

      <div className="tasks-container">
        {tasks.map((task) => (
          <div
            key={task._id}
            className={`advanced-task-item ${
              task.completed ? "completed" : ""
            }`}
          >
            {/* Task Header */}
            <div className="task-header">
              <div className="task-main-info">
                <div
                  className="task-checkbox"
                  onClick={() => onToggle(task._id, task.completed)}
                >
                  {task.completed ? "✅" : "⭕"}
                </div>

                <div className="task-title-section">
                  <h4 className="task-title">{task.title}</h4>
                  <div className="task-meta">
                    <span className={`priority-badge ${task.priority}`}>
                      {PRIORITY_CONFIG[task.priority]?.label}
                    </span>
                    <span className={`status-badge ${task.status}`}>
                      {STATUS_CONFIG[task.status]?.label}
                    </span>
                    {task.estimatedTime && task.estimatedTime.value && (
                      <span className="time-estimate">
                        ⏱️ {formatTime(task.estimatedTime)}
                      </span>
                    )}

                    {task.actualTime && task.actualTime.value && (
                      <span className="time-actual">
                        ⏰ {formatTime(task.actualTime)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="task-actions">
                <button onClick={() => toggleExpand(task._id)}>
                  {expandedTask === task._id ? "📕" : "📖"}
                </button>
                <button onClick={() => onEdit(task)}>✏️</button>
                <button onClick={() => onDelete(task._id)}>🗑️</button>
              </div>
            </div>

            {/* Progress Bar */}
            {task.checklist && task.checklist.length > 0 && (
              <div className="progress-section">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${calculateProgress(task)}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {task.checklist.filter((item) => item.completed).length}/
                  {task.checklist.length} completed
                </span>
              </div>
            )}

            {/* Expanded Details */}
            {expandedTask === task._id && (
              <div className="task-details">
                {task.description && (
                  <div className="detail-section">
                    <strong>📄 Mô tả:</strong>
                    <p>{task.description}</p>
                  </div>
                )}

                {/* Dates */}
                <div className="detail-row">
                  {task.startDate && (
                    <div className="detail-item">
                      <strong>📅 Bắt đầu:</strong>
                      <span>
                        {new Date(task.startDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="detail-item">
                      <strong>⏰ Deadline:</strong>
                      <span
                        className={
                          task.isOverdue && !task.completed ? "overdue" : ""
                        }
                      >
                        {new Date(task.dueDate).toLocaleDateString("vi-VN")}
                        {task.isOverdue && !task.completed && " (Trễ hạn)"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Checklist */}
                {task.checklist && task.checklist.length > 0 && (
                  <div className="detail-section">
                    <strong>✅ Checklist:</strong>
                    <div className="checklist">
                      {task.checklist.map((item, index) => (
                        <label key={index} className="checklist-item">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() =>
                              handleChecklistToggle(task._id, index)
                            }
                          />
                          <span className={item.completed ? "completed" : ""}>
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div className="detail-section">
                    <strong>🏷️ Tags:</strong>
                    <div className="tags">
                      {task.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="tag"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Board Card Component - CẬP NHẬT THÊM onViewDetail
function TaskCard({ task, onToggle, onEdit, onDelete}) {
  return (
    <div className="task-card">
      <div className="card-header">
        <div
          className="card-checkbox"
          onClick={() => onToggle(task._id, task.completed)}
        >
          {task.completed ? "✅" : "⭕"}
        </div>
        <div
          className="card-priority"
          style={{
            backgroundColor: PRIORITY_CONFIG[task.priority]?.bgColor,
            color: PRIORITY_CONFIG[task.priority]?.color,
          }}
        >
          {PRIORITY_CONFIG[task.priority]?.label}
        </div>
      </div>

      <h5 className="card-title">{task.title}</h5>

      {task.dueDate && (
        <div className="card-due-date">
          📅 {new Date(task.dueDate).toLocaleDateString("vi-VN")}
        </div>
      )}

      <div className="card-actions">
        <button onClick={() => onEdit(task)}>✏️</button>
        <button onClick={() => onDelete(task._id)}>🗑️</button>
      </div>
    </div>
  );
}
