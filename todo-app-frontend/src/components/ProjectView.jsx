export default function ProjectView({ project, tasks, onAddTask }) {
  if (!project) {
    return <AllTasksView tasks={tasks} onAddTask={onAddTask} />;
  }

  return (
    <div className="project-view">
      <div className="project-header">
        <div 
          className="project-color-badge"
          style={{backgroundColor: project.color}}
        ></div>
        <div className="project-info">
          <h2>{project.name}</h2>
          {project.description && (
            <p className="project-description">{project.description}</p>
          )}
        </div>
        <div className="project-stats">
          <span className="task-count-badge">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <div className="project-content">
        {/* QUAN TRỌNG: CHỈ truyền onAddTask, KHÔNG thêm projectId ở đây */}
        <TaskList tasks={tasks} onAddTask={onAddTask} />
      </div>
    </div>
  );
}

function AllTasksView({ tasks, onAddTask }) {
  return (
    <div className="all-tasks-view">
      <div className="view-header">
        <h2>📝 Tất cả công việc</h2>
        <div className="view-stats">
          <span className="task-count-badge">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <div className="view-content">
        <TaskList tasks={tasks} onAddTask={onAddTask} />
      </div>
    </div>
  );
}

// Simple TaskList component for project view
function TaskList({ tasks, onAddTask }) {
  if (tasks.length === 0) {
    return (
      <div className="empty-project">
        <div className="empty-icon">📭</div>
        <h3>Chưa có công việc nào</h3>
        <p>Thêm công việc mới để bắt đầu</p>
        {onAddTask && (
          <button 
            onClick={() => onAddTask({ title: "Công việc mới" })}
            className="add-first-task-btn"
          >
            ➕ Thêm công việc đầu tiên
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="project-task-list">
      <p className="task-list-note">
        Hiển thị {tasks.length} công việc
      </p>
      {onAddTask && (
        <div className="add-task-section">
          <button 
            onClick={() => onAddTask({ title: "Công việc mới" })}
            className="add-another-task-btn"
          >
            ➕ Thêm công việc khác
          </button>
        </div>
      )}
    </div>
  );
}