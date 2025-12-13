import { useState, useEffect, useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import ProjectSidebar from "../../components/ProjectSidebar"; // Sửa đường dẫn
import CreateProjectModal from "../../components/CreateProjectModal"; // Sửa đường dẫn
import axios from "../../api/axios"; // Sửa đường dẫn
import { useTheme } from "../../hooks/useTheme"; // Sửa đường dẫn

export default function TodoLayout() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await axios.get("/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(res.data.data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setProjectsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchProjects();
  }, [token, fetchProjects]);

  // Create project
  const handleCreateProject = async (projectData) => {
    try {
      const res = await axios.post("/projects", projectData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newProject = { ...res.data.data, taskCount: 0 };
      setProjects((prev) => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      alert(err.response?.data?.message || "Không thể tạo dự án");
      throw err;
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Bạn có chắc muốn xóa dự án này?")) return;

    try {
      await axios.delete(`/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects((prev) => prev.filter((p) => p._id !== projectId));
      if (selectedProject === projectId) setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa dự án");
      throw err;
    }
  };

  // Navigation
  const navigation = [
    { path: "/tasks", label: "Tasks", icon: "📝" },
    { path: "/advanced-tasks", label: "Advanced Tasks", icon: "🚀" }, // THÊM DÒNG NÀY
    { path: "/add-task", label: "Add Task", icon: "➕" },
    { path: "/calendar", label: "Calendar", icon: "📅" },
    { path: "/analytics", label: "Analytics", icon: "📊" }, // Thêm analytics
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const currentProject = projects.find((p) => p._id === selectedProject);

  return (
    <div className="todo-layout">
      {/* Project Sidebar */}
      <ProjectSidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        onCreateProject={() => setShowProjectModal(true)}
        onDeleteProject={handleDeleteProject}
        loading={projectsLoading}
      />

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="todo-header">
          <div className="header-title">
            <h2>
              {currentProject ? (
                <>
                  <span
                    className="project-color-badge small"
                    style={{ backgroundColor: currentProject.color }}
                  ></span>
                  {currentProject.name}
                </>
              ) : (
                "📝 Todo App"
              )}
            </h2>
          </div>

          <div className="header-actions">
            <button onClick={toggleTheme} className="theme-toggle">
              {darkMode ? "🌞" : "🌙"}
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="todo-nav">
          {navigation.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${
                location.pathname === item.path ? "active" : ""
              }`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Page Content */}
        <div className="page-content">
          <Outlet
            context={{
              projects,
              selectedProject,
              currentProject,
              fetchProjects,
            }}
          />
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
}
