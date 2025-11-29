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
      // FIX TRIỆT ĐỂ: Xử lý dueDate không phụ thuộc timezone
      let processedDueDate = null;
      if (dueDate) {
        // Tạo date object từ input (đã ở local time)
        const localDate = new Date(dueDate);
        
        // Tạo date mới với time 12:00:00 UTC để tránh timezone issues
        const utcDate = new Date(Date.UTC(
          localDate.getFullYear(),
          localDate.getMonth(),
          localDate.getDate(),
          12, 0, 0, 0 // 12:00:00 UTC
        ));
        
        processedDueDate = utcDate.toISOString();
      }

      await onAdd({
        title: title.trim(),
        dueDate: processedDueDate,
        tags,
      });

      // Reset form
      setTitle("");
      setDueDate("");
      setTagName("");
      setTagColor("#74b9ff");
      setError("");
    } catch (error) {
      console.error("Add task error:", error);
      setError(
        error.response?.data?.message ||
          "Không thể thêm công việc. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form-compact">
      {error && <div className="form-error-compact">{error}</div>}

      <input
        type="text"
        placeholder="✏️ Thêm công việc mới..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        disabled={loading}
        className="task-input-compact"
        aria-label="Tiêu đề công việc"
      />

      <div className="form-row-responsive">
        <div className="input-group">
          <label>📅 Ngày hạn:</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={loading}
            className="date-input-compact"
            aria-label="Ngày hạn"
          />
        </div>

        <div className="input-group">
          <label>🏷️ Tag:</label>
          <input
            type="text"
            placeholder="Tên tag..."
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            maxLength={50}
            disabled={loading}
            className="tag-input-compact"
            aria-label="Tên tag"
          />
        </div>
      </div>

      <div className="color-picker-section-compact">
        <strong>🎨 Chọn màu tag:</strong>
        <TagColorPicker
          selected={tagColor}
          onSelect={setTagColor}
          disabled={loading}
        />
      </div>

      <button type="submit" disabled={loading} className="submit-btn-compact">
        {loading ? (
          <>
            <span className="spinner-small"></span>
            Đang thêm...
          </>
        ) : (
          "➕ Thêm công việc"
        )}
      </button>
    </form>
  );
}