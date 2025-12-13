import { useState } from "react";

// Hàm escape regex để tránh lỗi khi search có ký tự đặc biệt
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Hàm escape HTML để tránh XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Hàm format recurring info
const formatRecurringInfo = (task) => {
  if (!task.isRecurringInstance) return null;
  
  const patterns = {
    daily: 'hàng ngày',
    weekly: 'hàng tuần',
    monthly: 'hàng tháng',
    yearly: 'hàng năm'
  };
  
  return `🔄 ${patterns[task.recurring?.pattern] || 'lặp lại'}`;
};

// Hàm format recurring pattern cho task gốc
const formatRecurringPattern = (task) => {
  if (!task.recurring?.isRecurring || task.isRecurringInstance) return null;
  
  const patterns = {
    daily: 'hàng ngày',
    weekly: 'hàng tuần',
    monthly: 'hàng tháng',
    yearly: 'hàng năm'
  };
  
  const interval = task.recurring.interval > 1 ? ` (mỗi ${task.recurring.interval} ${patterns[task.recurring.pattern]?.replace('hàng ', '')})` : '';
  return `🔄 ${patterns[task.recurring.pattern] || 'lặp lại'}${interval}`;
};

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onEdit,
  search,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTags, setEditTags] = useState([]);
  const [editError, setEditError] = useState("");

  const startEditing = (task) => {
    // KHÔNG cho phép edit recurring instances
    if (task.isRecurringInstance) {
      alert("Không thể chỉnh sửa recurring instances trực tiếp. Vui lòng chỉnh sửa task gốc.");
      return;
    }
    
    setEditingId(task._id);
    setEditTitle(task.title);
    setEditDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setEditTags(task.tags || []);
    setEditError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDueDate("");
    setEditTags([]);
    setEditError("");
  };

  const saveEdit = async (id) => {
    setEditError("");

    if (!editTitle.trim()) {
      setEditError("Tiêu đề không được để trống");
      return;
    }

    if (editTitle.length > 200) {
      setEditError("Tiêu đề không được vượt quá 200 ký tự");
      return;
    }

    try {
      await onEdit(id, {
        title: editTitle.trim(),
        dueDate: editDueDate || null,
        tags: editTags,
      });
      setEditingId(null);
      setEditError("");
    } catch (error) {
      console.error('Edit error:', error);
      setEditError(error.response?.data?.message || "Không thể lưu thay đổi");
    }
  };

  // Hàm highlight text an toàn
  function highlightText(text, search) {
    if (!search || !text) return escapeHtml(text);

    try {
      const escapedSearch = escapeRegex(search);
      const regex = new RegExp(`(${escapedSearch})`, "gi");
      
      const safeText = escapeHtml(text);
      const parts = safeText.split(regex);

      return parts.map((part, i) => {
        const safePart = escapeHtml(part);
        const escapedSearchLower = escapeHtml(search.toLowerCase());
        const partLower = escapeHtml(part.toLowerCase());
        
        return partLower === escapedSearchLower ? (
          <mark key={i} style={{ backgroundColor: "yellow", padding: "0 2px" }}>
            {safePart}
          </mark>
        ) : (
          safePart
        );
      });
    } catch (error) {
      console.error("Error in highlightText:", error);
      return escapeHtml(text);
    }
  }

  // Hàm kiểm tra tag có match với search không
  const isTagMatchSearch = (tag, search) => {
    if (!search || !tag || !tag.name) return false;
    
    try {
      const safeTagName = tag.name.toLowerCase();
      const safeSearch = search.toLowerCase();
      return safeTagName.includes(safeSearch);
    } catch (error) {
      console.error("Error in isTagMatchSearch:", error);
      return false;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date time:", error);
      return "";
    }
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.completed) return false;
    
    try {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      return dueDate < now;
    } catch (error) {
      console.error("Error checking overdue:", error);
      return false;
    }
  };

  // SỬA LỖI: Hàm xử lý toggle task - TRUYỀN CẢ TASK
  const handleToggle = (task) => {
    console.log("📤 TaskList: Toggling task:", {
      _id: task._id,
      title: task.title,
      isRecurringInstance: task.isRecurringInstance,
      originalTaskId: task.originalTaskId
    });
    
    if (canToggleTask(task)) {
      // QUAN TRỌNG: Truyền cả task object, không chỉ ID và completed
      onToggle(task);
    }
  };

  // Hàm xử lý delete task - TRUYỀN CẢ TASK
  const handleDelete = (task) => {
    if (canDeleteTask(task)) {
      onDelete(task);
    }
  };

  // Hàm kiểm tra task có thể chỉnh sửa không
  const canEditTask = (task) => {
    if (task.isRecurringInstance) return false;
    return true;
  };

  // Hàm kiểm tra task có thể xóa không
  const canDeleteTask = (task) => {
    if (task.isRecurringInstance) return false;
    return true;
  };

  // Hàm kiểm tra task có checkbox không
  const canToggleTask = (task) => {
    if (!task.isRecurringInstance && task.recurring?.isRecurring) return false; // Task gốc recurring không có checkbox
    if (task.isRecurringInstance) return true; // Instance có checkbox
    return true; // Task thường có checkbox
  };

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li 
          key={task._id} 
          className={`task-item ${task.completed ? "completed" : ""} ${isOverdue(task) ? "overdue" : ""} ${task.isRecurringInstance ? "recurring-instance" : ""} ${task.recurring?.isRecurring ? "recurring-original" : ""}`}
        >
          {/* EDIT MODE - Chỉ hiển thị cho non-instance tasks */}
          {editingId === task._id && canEditTask(task) ? (
            <div className="edit-mode">
              {editError && <div className="edit-error">{editError}</div>}
              
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={200}
                className="edit-input"
                autoFocus
                aria-label="Sửa tiêu đề task"
              />
              
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="edit-date"
                aria-label="Sửa ngày hết hạn"
              />

              {/* Edit tags section */}
              <div className="edit-tags-section">
                <strong>Tags:</strong>
                <div className="edit-tags-list">
                  {editTags.map((tag, index) => (
                    <span
                      key={index}
                      className="edit-tag"
                      style={{ backgroundColor: tag.color }}
                      title={tag.name}
                    >
                      {escapeHtml(tag.name)}
                      <button
                        type="button"
                        onClick={() => setEditTags(prev => prev.filter((_, i) => i !== index))}
                        className="remove-edit-tag-btn"
                        aria-label={`Xóa tag ${tag.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="edit-actions">
                <button 
                  onClick={() => saveEdit(task._id)}
                  className="save-btn"
                  aria-label="Lưu thay đổi"
                >
                  Lưu
                </button>
                <button 
                  onClick={cancelEditing}
                  className="cancel-btn"
                  aria-label="Hủy thay đổi"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* MAIN CONTENT */}
              <div className="task-main-content">
                {/* CHECKBOX - CHỈ CHO INSTANCES */}
                {canToggleTask(task) ? (
                  <div 
                    className={`task-checkbox ${task.completed ? "checked" : ""}`}
                    onClick={() => {
                      console.log("🔘 Clicking checkbox for task:", task._id);
                      handleToggle(task);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        console.log("⌨️ Enter key for task:", task._id);
                        handleToggle(task);
                      }
                    }}
                    aria-label={task.completed ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
                    aria-checked={task.completed}
                    title={task.isRecurringInstance ? "Đánh dấu instance này" : "Đánh dấu task"}
                  >
                    {task.completed ? "✓" : ""}
                  </div>
                ) : (
                  // Task gốc recurring - không có checkbox, thay bằng icon
                  <div 
                    className="task-original-icon"
                    title="Task gốc lặp lại - chỉnh sửa task gốc để thay đổi tất cả instances"
                  >
                    🔄
                  </div>
                )}
                
                {/* TEXT CONTENT */}
                <div className="task-text-content">
                  {/* Task Type Indicator */}
                  <div className="task-type-indicator">
                    {task.isRecurringInstance ? (
                      <span className="task-type-badge instance">📅 Instance</span>
                    ) : task.recurring?.isRecurring ? (
                      <span className="task-type-badge recurring">🔄 Recurring Gốc</span>
                    ) : null}
                  </div>
                  
                  <div className="task-title-row">
                    <span 
                      className="task-title"
                      onClick={() => {
                        if (canToggleTask(task)) {
                          console.log("📝 Clicking title for task:", task._id);
                          handleToggle(task);
                        }
                      }}
                      role={canToggleTask(task) ? "button" : undefined}
                      tabIndex={canToggleTask(task) ? 0 : undefined}
                      onKeyPress={(e) => {
                        if (canToggleTask(task) && e.key === 'Enter') {
                          console.log("⌨️ Enter on title for task:", task._id);
                          handleToggle(task);
                        }
                      }}
                      aria-label={`Task: ${task.title}. ${canToggleTask(task) ? `Click để ${task.completed ? 'đánh dấu chưa hoàn thành' : 'đánh dấu hoàn thành'}` : ''}`}
                    >
                      {highlightText(task.title, search)}
                    </span>
                  </div>

                  {/* Recurring Info */}
                  {task.isRecurringInstance && (
                    <div className="recurring-instance-info">
                      <div className="recurring-instance-details">
                        <span className="recurring-instance-date">
                          📅 {formatDate(task.instanceDate || task.dueDate)}
                        </span>
                        <span className="recurring-pattern">
                          {formatRecurringInfo(task)}
                        </span>
                      </div>
                      
                      {/* Original task link for recurring instances */}
                      {task.originalTaskId && (
                        <div className="original-task-info">
                          <span 
                            className="original-task-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`Đây là instance của task gốc ID: ${task.originalTaskId}\nChỉnh sửa task gốc để thay đổi tất cả instances.`);
                            }}
                            title="Xem task gốc"
                          >
                            🔗 Liên kết với task gốc
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Original Recurring Task Info */}
                  {task.recurring?.isRecurring && !task.isRecurringInstance && (
                    <div className="recurring-original-info">
                      <div className="recurring-original-details">
                        <span className="recurring-pattern">
                          {formatRecurringPattern(task)}
                        </span>
                        {task.recurring.completedInstances > 0 && (
                          <span className="completed-instances">
                            ✅ {task.recurring.completedInstances} instances đã hoàn thành
                          </span>
                        )}
                        {task.recurring.endDate && (
                          <span className="recurring-end-date">
                            📅 Kết thúc: {formatDate(task.recurring.endDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* META INFO */}
                  <div className="task-meta">
                    {task.dueDate && (
                      <span className="task-date">
                        {formatDateTime(task.dueDate)}
                      </span>
                    )}
                    {isOverdue(task) && (
                      <span 
                        className="overdue-badge"
                        aria-label="Task trễ hạn"
                      >
                        ⚠️ Trễ hạn
                      </span>
                    )}
                    
                    {/* Completion Status */}
                    {task.completed ? (
                      <span className="completed-status">
                        ✅ Hoàn thành
                      </span>
                    ) : (
                      <span className="pending-status">
                        ⏳ Chưa hoàn thành
                      </span>
                    )}
                  </div>

                  {/* TAGS */}
                  {task.tags?.length > 0 && (
                    <div className="task-tags" aria-label="Tags của task">
                      {task.tags.map((tag, i) => {
                        const isMatch = isTagMatchSearch(tag, search);
                        return (
                          <span
                            key={i}
                            className={`task-tag ${isMatch ? 'highlighted' : ''}`}
                            style={{
                              backgroundColor: tag.color,
                              border: isMatch ? '2px solid #ffd700' : '2px solid transparent',
                              boxShadow: isMatch ? '0 0 8px #ffd700' : '0 4px 12px rgba(0, 0, 0, 0.3)'
                            }}
                            title={tag.name}
                            aria-label={`Tag: ${tag.name}`}
                          >
                            {highlightText(tag.name, search)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIONS - CHỈ CHO TASK GỐC */}
              <div className="task-actions">
                {/* Edit button - CHỈ cho task gốc */}
                {canEditTask(task) && (
                  <button 
                    onClick={() => {
                      console.log("✏️ Editing task:", task._id);
                      startEditing(task);
                    }}
                    className="edit-btn"
                    aria-label="Sửa task"
                    title="Chỉnh sửa task"
                  >
                    ✏️
                  </button>
                )}
                
                {/* Delete button - CHỈ cho task gốc (không phải instance) */}
                {canDeleteTask(task) && (
                  <button 
                    onClick={() => {
                      console.log("🗑️ Deleting task:", task._id);
                      handleDelete(task);
                    }}
                    className="delete-btn"
                    aria-label="Xóa task"
                    title="Xóa task"
                  >
                    🗑️
                  </button>
                )}
                
                {/* Instance note - nếu là instance và không có actions */}
                {task.isRecurringInstance && (
                  <span 
                    className="instance-note"
                    title="Chỉnh sửa task gốc để thay đổi tất cả instances"
                  >
                    ✨
                  </span>
                )}
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}