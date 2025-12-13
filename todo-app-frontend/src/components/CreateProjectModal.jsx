import { useState } from "react";

const COLORS = [
  "#74b9ff", "#ff7675", "#55efc4", "#ffeaa7",
  "#a29bfe", "#fab1a0", "#81ecec", "#fd79a8",
  "#636e72", "#fdcb6e"
];

export default function CreateProjectModal({ isOpen, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#74b9ff',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      await onCreate(formData);
      setFormData({ name: '', color: '#74b9ff', description: '' });
      onClose();
    } catch (error) {
      console.error('Create project error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content project-modal">
        <div className="modal-header">
          <h3>🎯 Tạo dự án mới</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên dự án *</label>
            <input
              type="text"
              placeholder="Nhập tên dự án..."
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Mô tả (tuỳ chọn)</label>
            <textarea
              placeholder="Mô tả về dự án..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              maxLength={500}
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label>Màu sắc</label>
            <div className="color-picker">
              {COLORS.map(color => (
                <div
                  key={color}
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{backgroundColor: color}}
                  onClick={() => setFormData({...formData, color})}
                  title={color}
                ></div>
              ))}
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose}
              className="cancel-btn"
              disabled={loading}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="create-btn"
              disabled={loading || !formData.name.trim()}
            >
              {loading ? "Đang tạo..." : "Tạo dự án"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}