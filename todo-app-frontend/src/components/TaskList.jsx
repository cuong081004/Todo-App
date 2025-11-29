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
  const [editError, setEditError] = useState("");

  const startEditing = (task) => {
    setEditingId(task._id);
    setEditTitle(task.title);
    setEditDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setEditError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDueDate("");
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
      });
      setEditingId(null);
      setEditError("");
    } catch (error) {
      console.error('Edit error:', error);
      setEditError(error.response?.data?.message || "Không thể lưu thay đổi");
    }
  };

  function highlightText(text, search) {
    if (!search) return text;

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
              {/* MAIN CONTENT - THIẾT KẾ MỚI */}
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

                  {/* TAGS */}
                  {task.tags?.length > 0 && (
                    <div className="task-tags">
                      {task.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="task-tag"
                          style={{
                            backgroundColor: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
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