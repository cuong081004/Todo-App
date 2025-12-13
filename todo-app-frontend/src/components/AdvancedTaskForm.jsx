import { useState, useEffect } from "react";
import TagColorPicker from "./TagColorPicker";

const PRIORITIES = [
  { value: "low", label: "📉 Thấp", color: "#28a745" },
  { value: "medium", label: "📊 Trung bình", color: "#ffc107" },
  { value: "high", label: "📈 Cao", color: "#fd7e14" },
  { value: "urgent", label: "🚨 Khẩn cấp", color: "#dc3545" },
];

const STATUSES = [
  { value: "todo", label: "📝 Cần làm", color: "#6c757d" },
  { value: "in_progress", label: "🔄 Đang làm", color: "#17a2b8" },
  { value: "review", label: "👀 Cần review", color: "#6f42c1" },
  { value: "done", label: "✅ Hoàn thành", color: "#28a745" },
];

export default function AdvancedTaskForm({ 
  onAdd, 
  currentProject, 
  loading = false, 
  editingTask = null,
  onCancel 
}) {
  // State với giá trị mặc định an toàn
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    startDate: "",
    priority: "medium",
    status: "todo",
    estimatedTime: { value: "", unit: "hours" },
    actualTime: { value: "", unit: "hours" },
    tags: [],
    checklist: [],
    recurring: {
      isRecurring: false,
      pattern: "weekly",
      interval: 1,
      endDate: ""
    },
    projectId: null
  });

  const [newTag, setNewTag] = useState({ name: "", color: "#74b9ff" });
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [errors, setErrors] = useState({});

  // Khởi tạo form với dữ liệu task khi chỉnh sửa - ĐÃ SỬA
  useEffect(() => {
    if (editingTask) {
      console.log("📝 Initializing form with task data:", editingTask);
      console.log("🆔 Task ID:", editingTask._id);
      
      // Xử lý đặc biệt cho estimatedTime và actualTime
      const safeEstimatedValue = editingTask.estimatedTime?.value !== undefined && 
                               editingTask.estimatedTime?.value !== null ? 
                               String(editingTask.estimatedTime.value) : "";
      
      const safeActualValue = editingTask.actualTime?.value !== undefined && 
                             editingTask.actualTime?.value !== null ? 
                             String(editingTask.actualTime.value) : "";
      
      // Xử lý đặc biệt cho recurring
      let processedRecurring = {
        isRecurring: false,
        pattern: "weekly",
        interval: 1,
        endDate: ""
      };
      
      if (editingTask.recurring && editingTask.recurring.isRecurring) {
        const interval = editingTask.recurring.interval;
        processedRecurring = {
          isRecurring: true,
          pattern: editingTask.recurring.pattern || "weekly",
          interval: interval ? 
                   (typeof interval === 'number' ? interval : parseInt(interval) || 1) : 1,
          endDate: editingTask.recurring.endDate ? 
                   new Date(editingTask.recurring.endDate).toISOString().split('T')[0] : ""
        };
      }
      
      setFormData({
        title: editingTask.title || "",
        description: editingTask.description || "",
        dueDate: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : "",
        startDate: editingTask.startDate ? new Date(editingTask.startDate).toISOString().split('T')[0] : "",
        priority: editingTask.priority || "medium",
        status: editingTask.status || "todo",
        estimatedTime: {
          value: safeEstimatedValue,
          unit: editingTask.estimatedTime?.unit || "hours"
        },
        actualTime: {
          value: safeActualValue,
          unit: editingTask.actualTime?.unit || "hours"
        },
        tags: editingTask.tags || [],
        checklist: editingTask.checklist || [],
        recurring: processedRecurring,
        projectId: editingTask.projectId || null
      });
    } else if (currentProject) {
      // Nếu tạo mới và có project được chọn
      setFormData(prev => ({
        ...prev,
        projectId: currentProject._id
      }));
    }
  }, [editingTask, currentProject]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error khi user bắt đầu nhập
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // SỬA: Xử lý time change an toàn hơn
  const handleTimeChange = (type, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: field === 'value' ? 
          (value === "" ? "" : String(Math.max(0, parseInt(value) || 0))) : 
          value
      }
    }));
  };

  const handleAddTag = () => {
    if (newTag.name.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, { ...newTag, name: newTag.name.trim() }]
      }));
      setNewTag({ name: "", color: "#74b9ff" });
    }
  };

  const handleRemoveTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormData(prev => ({
        ...prev,
        checklist: [...prev.checklist, { 
          text: newChecklistItem.trim(), 
          completed: false 
        }]
      }));
      setNewChecklistItem("");
    }
  };

  const handleRemoveChecklistItem = (index) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }));
  };

  const handleToggleChecklistItem = (index) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.map((item, i) => 
        i === index ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  // SỬA: Validate form với recurring
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Tiêu đề là bắt buộc";
    }
    
    if (formData.dueDate && new Date(formData.dueDate) < new Date()) {
      newErrors.dueDate = "Hạn hoàn thành không thể trong quá khứ";
    }
    
    if (formData.startDate && formData.dueDate) {
      if (new Date(formData.startDate) > new Date(formData.dueDate)) {
        newErrors.startDate = "Ngày bắt đầu không thể sau ngày hết hạn";
      }
    }

    if (formData.estimatedTime.value && formData.estimatedTime.value < 0) {
      newErrors.estimatedTime = "Thời gian ước tính không thể âm";
    }

    if (formData.actualTime.value && formData.actualTime.value < 0) {
      newErrors.actualTime = "Thời gian thực tế không thể âm";
    }

    // Validate recurring
    if (formData.recurring.isRecurring) {
      const interval = formData.recurring.interval;
      if (!interval || isNaN(parseInt(interval)) || parseInt(interval) < 1) {
        newErrors.recurringInterval = "Khoảng cách phải là số lớn hơn 0";
      }
      
      if (formData.recurring.endDate && formData.recurring.endDate.trim() !== "") {
        const endDate = new Date(formData.recurring.endDate);
        if (isNaN(endDate.getTime())) {
          newErrors.recurringEndDate = "Ngày kết thúc không hợp lệ";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // DEBUG: Log để kiểm tra
      console.log("🚀 SUBMIT STARTED", {
        editingTask: editingTask,
        hasTaskId: !!editingTask?._id,
        formData: formData
      });

      // Chuẩn bị dữ liệu để gửi
      const submitData = {
        ...formData,
        // KHÔNG gửi _id trong body khi dùng PATCH với URL params
        _id: undefined,
        // Xử lý dates
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        // Xử lý estimatedTime
        estimatedTime: formData.estimatedTime.value ? {
          value: parseInt(formData.estimatedTime.value) || 0,
          unit: formData.estimatedTime.unit || "hours"
        } : null,
        // Xử lý actualTime
        actualTime: formData.actualTime.value ? {
          value: parseInt(formData.actualTime.value) || 0,
          unit: formData.actualTime.unit || "hours"
        } : null,
        // Xử lý recurring - QUAN TRỌNG: Đảm bảo interval là số
        recurring: formData.recurring.isRecurring ? {
          ...formData.recurring,
          interval: parseInt(formData.recurring.interval) || 1,
          endDate: formData.recurring.endDate ? new Date(formData.recurring.endDate).toISOString() : null
        } : { isRecurring: false }
      };

      console.log("📤 Submitting form data:", submitData);
      console.log("📝 Editing task ID:", editingTask?._id);

      await onAdd(submitData);
      
      // Reset form sau khi submit thành công (chỉ khi không phải đang edit)
      if (!editingTask) {
        setFormData({
          title: "",
          description: "",
          dueDate: "",
          startDate: "",
          priority: "medium",
          status: "todo",
          estimatedTime: { value: "", unit: "hours" },
          actualTime: { value: "", unit: "hours" },
          tags: [],
          checklist: [],
          recurring: {
            isRecurring: false,
            pattern: "weekly",
            interval: 1,
            endDate: ""
          },
          projectId: currentProject?._id || null
        });
        // Reset tag và checklist inputs
        setNewTag({ name: "", color: "#74b9ff" });
        setNewChecklistItem("");
      }
    } catch (error) {
      console.error("Submit error:", error);
      throw error;
    }
  };

  // SỬA: Xử lý recurring change an toàn
  const handleRecurringChange = (field, value) => {
    console.log(`🔄 Changing recurring.${field} to:`, value, "type:", typeof value);
    
    setFormData(prev => {
      const newRecurring = { ...prev.recurring };
      
      if (field === 'interval') {
        // Đảm bảo interval luôn là số hợp lệ
        if (value === "" || value === null || value === undefined) {
          newRecurring[field] = 1;
        } else {
          const numValue = parseInt(value);
          newRecurring[field] = isNaN(numValue) ? 1 : Math.max(1, numValue);
        }
      } else if (field === 'endDate') {
        newRecurring[field] = value || "";
      } else {
        newRecurring[field] = value;
      }
      
      return { ...prev, recurring: newRecurring };
    });
    
    // Clear error nếu có
    if (errors[`recurring${field.charAt(0).toUpperCase() + field.slice(1)}`]) {
      setErrors(prev => ({ 
        ...prev, 
        [`recurring${field.charAt(0).toUpperCase() + field.slice(1)}`]: "" 
      }));
    }
  };

  // SỬA: Toggle recurring với reset an toàn
  const toggleRecurring = () => {
    setFormData(prev => ({
      ...prev,
      recurring: {
        ...prev.recurring,
        isRecurring: !prev.recurring.isRecurring,
        // Reset về giá trị mặc định an toàn
        interval: 1,
        pattern: "weekly",
        endDate: prev.recurring.isRecurring ? "" : prev.recurring.endDate
      }
    }));
    
    // Clear recurring errors
    setErrors(prev => ({
      ...prev,
      recurringInterval: "",
      recurringEndDate: ""
    }));
  };

  // Hàm helper để format giá trị hiển thị an toàn
  const safeDisplayValue = (value) => {
    if (value === undefined || value === null) return "";
    return String(value);
  };

  return (
    <div className="advanced-task-form">
      <div className="form-header">
        <h2>{editingTask ? "✏️ Chỉnh Sửa Task" : "➕ Tạo Task Mới"}</h2>
        {editingTask && (
          <p className="edit-notice">Đang chỉnh sửa: <strong>{editingTask.title}</strong></p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="task-form">
        {/* Basic Information */}
        <div className="form-section">
          <h3>📝 Thông tin cơ bản</h3>
          
          <div className="form-group">
            <label htmlFor="title">Tiêu đề *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={errors.title ? "error" : ""}
              placeholder="Nhập tiêu đề task..."
              disabled={loading}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Mô tả</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Mô tả chi tiết task..."
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Ngày bắt đầu</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={errors.startDate ? "error" : ""}
                disabled={loading}
              />
              {errors.startDate && <span className="error-text">{errors.startDate}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="dueDate">Hạn hoàn thành</label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className={errors.dueDate ? "error" : ""}
                disabled={loading}
              />
              {errors.dueDate && <span className="error-text">{errors.dueDate}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Độ ưu tiên</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                disabled={loading}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Trạng thái</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={loading}
              >
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Time Tracking */}
        <div className="form-section">
          <h3>⏱️ Theo dõi thời gian</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Thời gian dự kiến</label>
              <div className="time-input-group">
                <input
                  type="number"
                  placeholder="Số lượng"
                  value={safeDisplayValue(formData.estimatedTime.value)}
                  onChange={(e) => handleTimeChange('estimatedTime', 'value', e.target.value)}
                  className={errors.estimatedTime ? "error" : ""}
                  min="0"
                  disabled={loading}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value && parseInt(value) < 0) {
                      handleTimeChange('estimatedTime', 'value', "0");
                    }
                  }}
                />
                <select
                  value={formData.estimatedTime.unit}
                  onChange={(e) => handleTimeChange('estimatedTime', 'unit', e.target.value)}
                  disabled={loading}
                >
                  <option value="minutes">Phút</option>
                  <option value="hours">Giờ</option>
                  <option value="days">Ngày</option>
                </select>
              </div>
              {errors.estimatedTime && <span className="error-text">{errors.estimatedTime}</span>}
            </div>

            <div className="form-group">
              <label>Thời gian thực tế</label>
              <div className="time-input-group">
                <input
                  type="number"
                  placeholder="Số lượng"
                  value={safeDisplayValue(formData.actualTime.value)}
                  onChange={(e) => handleTimeChange('actualTime', 'value', e.target.value)}
                  className={errors.actualTime ? "error" : ""}
                  min="0"
                  disabled={loading}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value && parseInt(value) < 0) {
                      handleTimeChange('actualTime', 'value', "0");
                    }
                  }}
                />
                <select
                  value={formData.actualTime.unit}
                  onChange={(e) => handleTimeChange('actualTime', 'unit', e.target.value)}
                  disabled={loading}
                >
                  <option value="minutes">Phút</option>
                  <option value="hours">Giờ</option>
                  <option value="days">Ngày</option>
                </select>
              </div>
              {errors.actualTime && <span className="error-text">{errors.actualTime}</span>}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="form-section">
          <h3>🏷️ Tags</h3>
          <div className="tags-input">
            <div className="tag-input-group">
              <input
                type="text"
                placeholder="Tên tag..."
                value={newTag.name}
                onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                disabled={loading}
              />
              <input
                type="color"
                value={newTag.color}
                onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                disabled={loading}
              />
              <button 
                type="button" 
                onClick={handleAddTag} 
                className="add-btn"
                disabled={loading || !newTag.name.trim()}
              >
                Thêm
              </button>
            </div>
            
            <div className="tags-list">
              {formData.tags.map((tag, index) => (
                <span key={index} className="tag" style={{ backgroundColor: tag.color }}>
                  {tag.name}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveTag(index)}
                    className="remove-tag-btn"
                    disabled={loading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="form-section">
          <h3>✅ Checklist</h3>
          <div className="checklist-input">
            <div className="checklist-input-group">
              <input
                type="text"
                placeholder="Mục checklist..."
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                disabled={loading}
              />
              <button 
                type="button" 
                onClick={handleAddChecklistItem} 
                className="add-btn"
                disabled={loading || !newChecklistItem.trim()}
              >
                Thêm
              </button>
            </div>
            
            <div className="checklist-items">
              {formData.checklist.map((item, index) => (
                <div key={index} className="checklist-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklistItem(index)}
                      disabled={loading}
                    />
                    <span className={item.completed ? "completed" : ""}>
                      {item.text}
                    </span>
                  </label>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveChecklistItem(index)}
                    className="remove-btn"
                    disabled={loading}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recurring - ĐÃ SỬA */}
        <div className="form-section">
          <h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.recurring.isRecurring}
                onChange={toggleRecurring}
                disabled={loading}
              />
              🔄 Task lặp lại
            </label>
          </h3>
          
          {formData.recurring.isRecurring && (
            <div className="recurring-options">
              <div className="form-row">
                <div className="form-group">
                  <label>Chu kỳ</label>
                  <select
                    value={formData.recurring.pattern || "weekly"}
                    onChange={(e) => handleRecurringChange('pattern', e.target.value)}
                    disabled={loading}
                  >
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="monthly">Hàng tháng</option>
                    <option value="yearly">Hàng năm</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Khoảng cách *</label>
                  <input
                    type="number"
                    min="1"
                    value={safeDisplayValue(formData.recurring.interval)}
                    onChange={(e) => {
                      console.log("🔢 Interval input change:", e.target.value);
                      handleRecurringChange('interval', e.target.value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (!value || parseInt(value) < 1) {
                        handleRecurringChange('interval', 1);
                      }
                    }}
                    disabled={loading}
                    className={errors.recurringInterval ? "error" : ""}
                  />
                  {errors.recurringInterval && (
                    <span className="error-text">{errors.recurringInterval}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Ngày kết thúc lặp lại (tuỳ chọn)</label>
                <input
                  type="date"
                  value={formData.recurring.endDate || ""}
                  onChange={(e) => handleRecurringChange('endDate', e.target.value)}
                  disabled={loading}
                  className={errors.recurringEndDate ? "error" : ""}
                />
                {errors.recurringEndDate && (
                  <span className="error-text">{errors.recurringEndDate}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          {editingTask && (
            <button 
              type="button" 
              onClick={onCancel}
              className="cancel-btn"
              disabled={loading}
            >
              Hủy
            </button>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className="submit-btn"
          >
            {loading ? "⏳ Đang xử lý..." : (editingTask ? "💾 Cập nhật Task" : "🚀 Tạo Task")}
          </button>
        </div>
      </form>
    </div>
  );
}