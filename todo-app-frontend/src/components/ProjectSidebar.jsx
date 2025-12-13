import { useState } from "react";

export default function ProjectSidebar({ 
  projects, 
  selectedProject, 
  onSelectProject, 
  onCreateProject,
  onDeleteProject,
  taskCount 
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const handleDeleteClick = (projectId, e) => {
    e.stopPropagation(); // Ngăn chặn sự kiện click trên project item
    setShowDeleteConfirm(projectId);
  };

  const confirmDelete = async (projectId) => {
    try {
      await onDeleteProject(projectId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  // Hàm tính màu chữ tương phản dựa trên màu nền
  const getContrastColor = (hexColor) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
    
    try {
      // Convert hex to RGB
      const r = parseInt(hexColor.substr(1, 2), 16);
      const g = parseInt(hexColor.substr(3, 2), 16);
      const b = parseInt(hexColor.substr(5, 2), 16);
      
      // Tính độ sáng
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      // Trả về màu trắng hoặc đen dựa trên độ sáng
      return brightness > 128 ? '#000000' : '#FFFFFF';
    } catch (error) {
      console.error("Error calculating contrast color:", error);
      return '#ffffff';
    }
  };

  return (
    <div className={`project-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h3>📁 Dự án</h3>
        <div className="header-actions">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="collapse-btn"
            title={isCollapsed ? "Mở rộng" : "Thu gọn"}
          >
            {isCollapsed ? "›" : "‹"}
          </button>
          <button 
            onClick={onCreateProject}
            className="add-project-btn"
            title="Tạo dự án mới"
          >
            +
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="project-list">
          <div 
            className={`project-item ${!selectedProject ? 'active' : ''}`}
            onClick={() => onSelectProject(null)}
            style={!selectedProject ? {
              backgroundColor: 'var(--button-bg)',
              color: 'white',
              borderColor: 'var(--button-bg)'
            } : {}}
          >
            <span className="project-color all-tasks">📝</span>
            <span className="project-name">Tất cả task</span>
            <span className="task-count">{taskCount}</span>
          </div>
          
          {projects.map(project => (
            <ProjectItem 
              key={project._id}
              project={project}
              isSelected={selectedProject === project._id}
              onClick={() => onSelectProject(project._id)}
              onDelete={handleDeleteClick}
              showDeleteConfirm={showDeleteConfirm === project._id}
              onConfirmDelete={confirmDelete}
              onCancelDelete={cancelDelete}
              getContrastColor={getContrastColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectItem({ 
  project, 
  isSelected, 
  onClick, 
  onDelete, 
  showDeleteConfirm,
  onConfirmDelete,
  onCancelDelete,
  getContrastColor
}) {
  const projectColor = project.color || '#74b9ff';
  const contrastColor = getContrastColor(projectColor);
  const isDarkColor = contrastColor === '#FFFFFF';

  return (
    <div 
      className={`project-item ${isSelected ? 'active' : ''} ${isDarkColor ? 'dark-bg' : 'light-bg'}`}
      onClick={onClick}
      style={
        isSelected ? {
          backgroundColor: projectColor,
          color: contrastColor,
          borderColor: projectColor,
          boxShadow: `0 4px 12px ${projectColor}40`
        } : {
          borderLeftColor: projectColor,
          borderLeftWidth: '4px'
        }
      }
    >
      <span 
        className="project-color" 
        style={{
          backgroundColor: projectColor,
          borderColor: isSelected ? contrastColor : 'var(--border)',
          boxShadow: isSelected ? `0 0 0 2px ${contrastColor}40` : 'none'
        }}
        title={project.name}
      >
        {project.isFavorite && !showDeleteConfirm && (
          <span className="favorite-badge" style={{ color: contrastColor }}>
            ★
          </span>
        )}
      </span>
      
      <span className="project-name">{project.name}</span>
      <span className="task-count" style={
        isSelected ? {
          backgroundColor: `${contrastColor}20`,
          color: contrastColor
        } : {}
      }>
        {project.taskCount || 0}
      </span>
      
      {/* Nút xóa project */}
      {!showDeleteConfirm ? (
        <button 
          className="delete-project-btn"
          onClick={(e) => onDelete(project._id, e)}
          title="Xóa dự án"
          style={isSelected ? { color: contrastColor } : {}}
        >
          🗑️
        </button>
      ) : (
        <div className="delete-confirm">
          <button 
            className="confirm-delete-btn"
            onClick={() => onConfirmDelete(project._id)}
            title="Xác nhận xóa"
            style={isSelected ? { color: contrastColor } : {}}
          >
            ✓
          </button>
          <button 
            className="cancel-delete-btn"
            onClick={onCancelDelete}
            title="Hủy"
            style={isSelected ? { color: contrastColor } : {}}
          >
            ✗
          </button>
        </div>
      )}
    </div>
  );
}