import TagColorPicker from "./TagColorPicker";
import { useState } from "react";

export default function TaskForm({ onAdd, currentProject }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#74b9ff");
  const [tags, setTags] = useState([]); // THAY ĐỔI: mảng tags thay vì 1 tag
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }

    setIsSubmitting(true);

    try {
      let processedDueDate = null;

      if (dueDate) {
        const dt = new Date(dueDate);
        if (!isNaN(dt.getTime())) {
          processedDueDate = dt.toISOString();
        }
      }

      await onAdd({
        title: title.trim(),
        dueDate: processedDueDate,
        tags: [...tags], // SỬA: gửi mảng tags
      });

      // Reset form
      setTitle("");
      setDueDate("");
      setTagName("");
      setTagColor("#74b9ff");
      setTags([]);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể thêm công việc");
    } finally {
      setIsSubmitting(false);
    }
  };

  // THÊM: Hàm thêm tag vào mảng
  const handleAddTag = () => {
    if (!tagName.trim()) return;

    const newTag = {
      name: tagName.trim(),
      color: tagColor
    };

    setTags(prev => [...prev, newTag]);
    setTagName("");
    setTagColor("#74b9ff");
  };

  // THÊM: Hàm xóa tag
  const handleRemoveTag = (indexToRemove) => {
    setTags(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // THÊM: Hàm xử lý Enter để thêm tag
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`task-form-compact ${isSubmitting ? 'form-loading' : ''}`}>
      {error && <div className="form-error-compact">{error}</div>}

      {currentProject && (
        <div className="current-project-banner">
          <span 
            className="project-color-badge"
            style={{backgroundColor: currentProject.color}}
          ></span>
          <span>Đang thêm vào: <strong>{currentProject.name}</strong></span>
        </div>
      )}

      <input
        type="text"
        placeholder="✏️ Thêm công việc mới..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        disabled={isSubmitting}
        className="task-input-compact"
      />

      <div className="form-row-responsive">
        <div className="input-group">
          <label>⏰ Deadline:</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isSubmitting}
            className="date-input-compact"
          />
        </div>

        <div className="input-group">
          <label>🏷 Thêm tag:</label>
          <div className="tag-input-group">
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyPress={handleTagKeyPress}
              maxLength={50}
              disabled={isSubmitting}
              className="tag-input-compact"
              placeholder="Nhập tên tag..."
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={isSubmitting || !tagName.trim()}
              className="add-tag-btn"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Hiển thị tags đã thêm */}
      {tags.length > 0 && (
        <div className="added-tags-section">
          <strong>📌 Tags đã thêm:</strong>
          <div className="added-tags-list">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="added-tag"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(index)}
                  className="remove-tag-btn"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="color-picker-section-compact">
        <strong>🎨 Chọn màu tag:</strong>
        <TagColorPicker selected={tagColor} onSelect={setTagColor} disabled={isSubmitting} />
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting} 
        className={`submit-btn-compact ${isSubmitting ? 'button-loading' : ''}`}
      >
        {isSubmitting ? "Đang thêm..." : "➕ Thêm công việc"}
      </button>
    </form>
  );
}