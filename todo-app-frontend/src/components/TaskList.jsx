import { useState } from "react";

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

  // THÊM: Hàm highlight text (cho cả title và tags)
  function highlightText(text, search) {
    if (!search || !text) return text;

    const regex = new RegExp(`(${search})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} style={{ backgroundColor: "yellow", padding: "0 2px" }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  // THÊM: Hàm kiểm tra tag có match với search không
  const isTagMatchSearch = (tag, search) => {
    if (!search) return false;
    return tag.name.toLowerCase().includes(search.toLowerCase());
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date();
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
              />
              
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="edit-date"
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
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => setEditTags(prev => prev.filter((_, i) => i !== index))}
                        className="remove-edit-tag-btn"
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
                >
                  Lưu
                </button>
                <button 
                  onClick={cancelEditing}
                  className="cancel-btn"
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
                    {isOverdue(task) && <span className="overdue-badge">Trễ hạn</span>}
                  </div>

                  {/* TAGS - CẢI THIỆN: highlight tags khi tìm kiếm */}
                  {task.tags?.length > 0 && (
                    <div className="task-tags">
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
                  aria-label="Sửa"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => onDelete(task._id)}
                  className="delete-btn"
                  aria-label="Xóa"
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