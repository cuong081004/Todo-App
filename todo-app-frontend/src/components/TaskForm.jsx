import { useState } from "react";
import TagColorPicker from "./TagColorPicker";

export default function TaskForm({ onAdd }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#74b9ff");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề công việc");
      return;
    }

    if (title.length > 200) {
      setError("Tiêu đề không được vượt quá 200 ký tự");
      return;
    }

    const tags = tagName.trim()
      ? [{ name: tagName.trim(), color: tagColor }]
      : [];

    setLoading(true);

    try {
      await onAdd({
        title: title.trim(),
        dueDate: dueDate || null,
        tags,
      });

      // Reset form
      setTitle("");
      setDueDate("");
      setTagName("");
      setTagColor("#74b9ff");
      setError("");
    } catch (error) {
      console.error('Add task error:', error);
      setError(error.response?.data?.message || "Không thể thêm công việc. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      {error && <div className="form-error">{error}</div>}

      <input
        type="text"
        placeholder="Thêm công việc..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        disabled={loading}
        className="task-input"
        aria-label="Tiêu đề công việc"
      />

      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        disabled={loading}
        className="date-input"
        aria-label="Ngày hạn"
      />

      <input
        type="text"
        placeholder="Tên tag (VD: học, chơi, công việc)"
        value={tagName}
        onChange={(e) => setTagName(e.target.value)}
        maxLength={50}
        disabled={loading}
        className="tag-input"
        aria-label="Tên tag"
      />

      <div className="color-picker-section">
        <strong>Chọn màu tag:</strong>
        <TagColorPicker 
          selected={tagColor} 
          onSelect={setTagColor}
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="submit-btn"
      >
        {loading ? "Đang thêm..." : "Thêm"}
      </button>
    </form>
  );
}