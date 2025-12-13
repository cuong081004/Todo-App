import { useState } from "react";

export default function ProjectSidebar({ 
  projects, 
  selectedProject, 
  onSelectProject, 
  onCreateProject,
  onDeleteProject, // THÊM PROP MỚI
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
  onCancelDelete 
}) {
  return (
    <div 
      className={`project-item ${isSelected ? 'active' : ''}`}
      onClick={onClick}
    >
      <span 
        className="project-color" 
        style={{backgroundColor: project.color}}
        title={project.name}
      ></span>
      <span className="project-name">{project.name}</span>
      <span className="task-count">{project.taskCount || 0}</span>
      
      {project.isFavorite && <span className="favorite-icon">⭐</span>}
      
      {/* Nút xóa project */}
      {!showDeleteConfirm ? (
        <button 
          className="delete-project-btn"
          onClick={(e) => onDelete(project._id, e)}
          title="Xóa dự án"
        >
          🗑️
        </button>
      ) : (
        <div className="delete-confirm">
          <button 
            className="confirm-delete-btn"
            onClick={() => onConfirmDelete(project._id)}
            title="Xác nhận xóa"
          >
            ✓
          </button>
          <button 
            className="cancel-delete-btn"
            onClick={onCancelDelete}
            title="Hủy"
          >
            ✗
          </button>
        </div>
      )}
    </div>
  );
}