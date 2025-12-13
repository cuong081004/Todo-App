import { useState } from "react";

const PRIORITY_CONFIG = {
  low: { label: "📉 Thấp", color: "#28a745" },
  medium: { label: "📊 Trung bình", color: "#ffc107" },
  high: { label: "📈 Cao", color: "#fd7e14" },
  urgent: { label: "🚨 Khẩn cấp", color: "#dc3545" }
};

const STATUS_CONFIG = {
  todo: { label: "📝 Cần làm", color: "#6c757d" },
  in_progress: { label: "🔄 Đang làm", color: "#17a2b8" },
  review: { label: "👀 Cần review", color: "#6f42c1" },
  done: { label: "✅ Hoàn thành", color: "#28a745" }
};

export default function TaskDetailModal({ 
  task, 
  onClose, 
  onEdit, 
  onDelete, 
  onChecklistToggle 
}) {
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    checklist: true,
    tags: true,
    dates: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa đặt";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatTime = (timeObj) => {
    if (!timeObj || !timeObj.value) return null;
    const units = { minutes: "phút", hours: "giờ", days: "ngày" };
    return `${timeObj.value} ${units[timeObj.unit]}`;
  };

  const calculateProgress = () => {
    if (task.checklist && task.checklist.length > 0) {
      const completed = task.checklist.filter(item => item.completed).length;
      return (completed / task.checklist.length) * 100;
    }
    return task.completed ? 100 : 0;
  };

  const isOverdue = () => {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Chi Tiết Task</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="task-detail-content">
          {/* Header */}
          <div className="task-detail-header">
            <div className="task-title-section">
              <h3 className="task-title">{task.title}</h3>
              <div className="task-meta-badges">
                <span 
                  className="priority-badge" 
                  style={{ 
                    backgroundColor: PRIORITY_CONFIG[task.priority]?.color + '20',
                    color: PRIORITY_CONFIG[task.priority]?.color,
                    border: `1px solid ${PRIORITY_CONFIG[task.priority]?.color}`
                  }}
                >
                  {PRIORITY_CONFIG[task.priority]?.label}
                </span>
                <span 
                  className="status-badge"
                  style={{ 
                    backgroundColor: STATUS_CONFIG[task.status]?.color + '20',
                    color: STATUS_CONFIG[task.status]?.color,
                    border: `1px solid ${STATUS_CONFIG[task.status]?.color}`
                  }}
                >
                  {STATUS_CONFIG[task.status]?.label}
                </span>
                {task.completed && <span className="completed-badge">✅ Hoàn thành</span>}
                {isOverdue() && <span className="overdue-badge">⏰ Trễ hạn</span>}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {(task.checklist && task.checklist.length > 0) && (
            <div className="progress-section">
              <div className="progress-info">
                <span>Tiến độ: {task.checklist.filter(item => item.completed).length}/{task.checklist.length}</span>
                <span>{calculateProgress().toFixed(0)}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Collapsible Sections */}
          <div className="detail-sections">
            {/* Description */}
            <div className="detail-section">
              <div className="section-header" onClick={() => toggleSection('description')}>
                <h4>📄 Mô tả</h4>
                <span className="toggle-icon">
                  {expandedSections.description ? '▼' : '▶'}
                </span>
              </div>
              {expandedSections.description && (
                <div className="section-content">
                  {task.description ? (
                    <p className="task-description">{task.description}</p>
                  ) : (
                    <p className="no-data">Không có mô tả</p>
                  )}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="detail-section">
              <div className="section-header" onClick={() => toggleSection('dates')}>
                <h4>📅 Thời gian</h4>
                <span className="toggle-icon">
                  {expandedSections.dates ? '▼' : '▶'}
                </span>
              </div>
              {expandedSections.dates && (
                <div className="section-content">
                  <div className="date-grid">
                    <div className="date-item">
                      <strong>Bắt đầu:</strong>
                      <span>{formatDate(task.startDate)}</span>
                    </div>
                    <div className="date-item">
                      <strong>Hạn hoàn thành:</strong>
                      <span className={isOverdue() ? 'overdue-text' : ''}>
                        {formatDate(task.dueDate)}
                      </span>
                    </div>
                    {task.estimatedTime && (
                      <div className="date-item">
                        <strong>Ước tính:</strong>
                        <span>{formatTime(task.estimatedTime)}</span>
                      </div>
                    )}
                    {task.actualTime && (
                      <div className="date-item">
                        <strong>Thực tế:</strong>
                        <span>{formatTime(task.actualTime)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Checklist */}
            {task.checklist && task.checklist.length > 0 && (
              <div className="detail-section">
                <div className="section-header" onClick={() => toggleSection('checklist')}>
                  <h4>✅ Checklist ({task.checklist.filter(item => item.completed).length}/{task.checklist.length})</h4>
                  <span className="toggle-icon">
                    {expandedSections.checklist ? '▼' : '▶'}
                  </span>
                </div>
                {expandedSections.checklist && (
                  <div className="section-content">
                    <div className="checklist-items">
                      {task.checklist.map((item, index) => (
                        <label key={index} className="checklist-item">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => onChecklistToggle(task._id, index)}
                          />
                          <span className={item.completed ? "completed" : ""}>
                            {item.text}
                          </span>
                          {item.completedAt && (
                            <span className="completed-time">
                              ({new Date(item.completedAt).toLocaleDateString('vi-VN')})
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="detail-section">
                <div className="section-header" onClick={() => toggleSection('tags')}>
                  <h4>🏷️ Tags</h4>
                  <span className="toggle-icon">
                    {expandedSections.tags ? '▼' : '▶'}
                  </span>
                </div>
                {expandedSections.tags && (
                  <div className="section-content">
                    <div className="tags-container">
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

          {/* Metadata */}
          <div className="task-metadata">
            <div className="metadata-item">
              <strong>Ngày tạo:</strong>
              <span>{formatDate(task.createdAt)}</span>
            </div>
            <div className="metadata-item">
              <strong>Lần cập nhật cuối:</strong>
              <span>{formatDate(task.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button 
            onClick={() => onEdit(task)}
            className="edit-btn"
          >
            ✏️ Chỉnh sửa
          </button>
          <button 
            onClick={() => onDelete(task._id)}
            className="delete-btn"
          >
            🗑️ Xóa
          </button>
          <button 
            onClick={onClose}
            className="cancel-btn"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}