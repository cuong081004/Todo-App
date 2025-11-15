import { useState } from "react";

export default function TaskList({ tasks, onToggle, onDelete, onEdit, search }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const startEditing = (task) => {
    setEditingId(task._id);
    setEditTitle(task.title);
    setEditDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
  };

  const saveEdit = (id) => {
    onEdit(id, {
      title: editTitle,
      dueDate: editDueDate,
    });
    setEditingId(null);
  };

  function highlightText(text, search) {
    if (!search) return text;

    const regex = new RegExp(`(${search})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} style={{ backgroundColor: "yellow" }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  return (
    <ul style={{ padding: 0 }}>
      {tasks.map((task) => (
        <li key={task._id} style={{ marginBottom: "10px" }}>
          {editingId === task._id ? (
            <div>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />

              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />

              <button onClick={() => saveEdit(task._id)}>Lưu</button>
              <button onClick={() => setEditingId(null)}>Hủy</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  cursor: "pointer",
                  textDecoration: task.completed ? "line-through" : "",
                }}
                onClick={() => onToggle(task._id, task.completed)}
              >
                {highlightText(task.title, search)}
                {task.dueDate && (
                  <small style={{ marginLeft: 8, color: "#555" }}>
                    ({new Date(task.dueDate).toLocaleDateString("vi-VN")})
                  </small>
                )}
              </span>

              <button onClick={() => startEditing(task)}>Sửa</button>
              <button onClick={() => onDelete(task._id)}>Xóa</button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
