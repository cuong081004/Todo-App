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
  const [editTags, setEditTags] = useState([]); // THÊM: tags trong edit mode
  const [editError, setEditError] = useState("");

  const startEditing = (task) => {
    setEditingId(task._id);
    setEditTitle(task.title);
    setEditDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setEditTags(task.tags || []); // THÊM: khởi tạo tags khi edit
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
        tags: editTags, // THÊM: gửi tags khi edit
      });
      setEditingId(null);
      setEditError("");
    } catch (error) {
      console.error('Edit error:', error);
      setEditError(error.response?.data?.message || "Không thể lưu thay đổi");
    }
  };

  // SỬA: Hàm highlight text an toàn (cho cả title và tags)
  function highlightText(text, search) {
    if (!search || !text) return escapeHtml(text);

    try {
      // Escape search term để tránh lỗi regex
      const escapedSearch = escapeRegex(search);
      const regex = new RegExp(`(${escapedSearch})`, "gi");
      
      // Escape toàn bộ text trước khi xử lý
      const safeText = escapeHtml(text);
      const parts = safeText.split(regex);

      return parts.map((part, i) => {
        // So sánh đã escape để tránh XSS
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
      // Fallback: trả về text đã escape
      return escapeHtml(text);
    }
  }

  // SỬA: Hàm kiểm tra tag có match với search không (an toàn)
  const isTagMatchSearch = (tag, search) => {
    if (!search || !tag || !tag.name) return false;
    
    try {
      // Sử dụng includes thay vì regex để tránh lỗi
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

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li 
          key={task._id} 
          className={`task-item ${task.completed ? "completed" : ""} ${isOverdue(task) ? "overdue" : ""}`}
        >
          {/* EDIT MODE */}
          {editingId === task._id ? (
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

              {/* THÊM: Edit tags section */}
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
                {/* CHECKBOX */}
                <div 
                  className={`task-checkbox ${task.completed ? "checked" : ""}`}
                  onClick={() => onToggle(task._id, task.completed)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') onToggle(task._id, task.completed);
                  }}
                  aria-label={task.completed ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
                  aria-checked={task.completed}
                >
                  {task.completed ? "✓" : ""}
                </div>
                
                {/* TEXT CONTENT */}
                <div className="task-text-content">
                  <span 
                    className="task-title"
                    onClick={() => onToggle(task._id, task.completed)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') onToggle(task._id, task.completed);
                    }}
                    aria-label={`Task: ${task.title}. Click để ${task.completed ? 'đánh dấu chưa hoàn thành' : 'đánh dấu hoàn thành'}`}
                  >
                    {highlightText(task.title, search)}
                  </span>

                  {/* META INFO */}
                  <div className="task-meta">
                    {task.dueDate && (
                      <span className="task-date">
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                    {isOverdue(task) && (
                      <span 
                        className="overdue-badge"
                        aria-label="Task trễ hạn"
                      >
                        Trễ hạn
                      </span>
                    )}
                  </div>

                  {/* TAGS - CẢI THIỆN: highlight tags khi tìm kiếm */}
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

              {/* ACTIONS */}
              <div className="task-actions">
                <button 
                  onClick={() => startEditing(task)}
                  className="edit-btn"
                  aria-label="Sửa task"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => onDelete(task._id)}
                  className="delete-btn"
                  aria-label="Xóa task"
                >
                  🗑️
                </button>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}