import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "../../api/axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import UserProfileTab from "./components/UserProfileTab";
import PersonalGoalsTab from "./components/PersonalGoalsTab";

export default function AnalyticsPage() {
  const { selectedProject, projects } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [timeRange, setTimeRange] = useState("week");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const token = localStorage.getItem("token");

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/tasks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTasks(res.data?.data ?? []);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [token]);

  // Filter tasks by project and time range
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      const projectMatch = !selectedProject || task.projectId === selectedProject;
      return projectMatch;
    });

    // Filter by time range
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    return filtered.filter(task => 
      !task.createdAt || new Date(task.createdAt) >= startDate
    );
  }, [tasks, selectedProject, timeRange]);

  // Completion statistics
  const completionStats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(task => task.completed).length;
    const incomplete = total - completed;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, incomplete, completionRate };
  }, [filteredTasks]);

  // Tasks by status for pie chart
  const statusData = useMemo(() => [
    { name: "Hoàn thành", value: completionStats.completed, color: "#28a745" },
    { name: "Chưa hoàn thành", value: completionStats.incomplete, color: "#ffc107" },
  ], [completionStats]);

  // Daily completion trend
  const dailyTrendData = useMemo(() => {
    const trend = {};
    const now = new Date();
    const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365;
    
    // Initialize dates
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trend[dateStr] = { date: dateStr, completed: 0, created: 0 };
    }

    // Count completions and creations by date
    filteredTasks.forEach(task => {
      if (task.createdAt) {
        const createdDate = new Date(task.createdAt).toISOString().split('T')[0];
        if (trend[createdDate]) {
          trend[createdDate].created++;
        }
      }
      
      if (task.completed && task.updatedAt) {
        const completedDate = new Date(task.updatedAt).toISOString().split('T')[0];
        if (trend[completedDate]) {
          trend[completedDate].completed++;
        }
      }
    });

    return Object.values(trend);
  }, [filteredTasks, timeRange]);

  // Tasks by project
  const projectData = useMemo(() => {
    const projectStats = {};
    
    filteredTasks.forEach(task => {
      const projectName = task.projectId ? "Có dự án" : "Không có dự án";
      if (!projectStats[projectName]) {
        projectStats[projectName] = { total: 0, completed: 0 };
      }
      projectStats[projectName].total++;
      if (task.completed) projectStats[projectName].completed++;
    });

    return Object.entries(projectStats).map(([name, stats]) => ({
      name,
      total: stats.total,
      completed: stats.completed,
      completionRate: (stats.completed / stats.total) * 100
    }));
  }, [filteredTasks]);

  // Overdue tasks
  const overdueStats = useMemo(() => {
    const now = new Date();
    return filteredTasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      !task.completed
    ).length;
  }, [filteredTasks]);

  const tabs = [
    { id: "overview", label: "Tổng quan", icon: "📊" },
    { id: "performance", label: "Hiệu suất", icon: "🚀" },
    { id: "profile", label: "Cá nhân", icon: "👤" },
    { id: "goals", label: "Mục tiêu", icon: "🎯" },
  ];

  if (loading) return <div className="loading-spinner">Đang tải thống kê...</div>;

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h1>📈 Trung tâm Phân tích & Cá nhân</h1>
        <p>Theo dõi hiệu suất và quản lý mục tiêu của bạn</p>
      </div>

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="overview-tab">
            {/* Time Range Selector */}
            <div className="time-range-selector">
              <label>Thời gian: </label>
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="time-range-select"
              >
                <option value="week">7 ngày</option>
                <option value="month">30 ngày</option>
                <option value="year">1 năm</option>
              </select>
            </div>

            {/* Summary Cards */}
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <h3>{completionStats.total}</h3>
                  <p>Tổng công việc</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <h3>{completionStats.completed}</h3>
                  <p>Đã hoàn thành</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-info">
                  <h3>{completionStats.completionRate.toFixed(1)}%</h3>
                  <p>Tỷ lệ hoàn thành</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">⏰</div>
                <div className="stat-info">
                  <h3>{overdueStats}</h3>
                  <p>Trễ hạn</p>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
              <div className="chart-card">
                <h3>📈 Xu Hướng Hoàn Thành</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#28a745" 
                      name="Hoàn thành"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="created" 
                      stroke="#007bff" 
                      name="Tạo mới"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>🥧 Phân Loại Trạng Thái</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>🏗️ Hiệu Suất Theo Dự Án</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Tổng số" fill="#8884d8" />
                    <Bar dataKey="completed" name="Đã hoàn thành" fill="#28a745" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card insights">
                <h3>💡 Thông Tin Chi Tiết</h3>
                <div className="insights-list">
                  <div className="insight-item">
                    <span className="insight-icon">⚡</span>
                    <div>
                      <strong>Tốc độ hoàn thành:</strong>
                      <p>{completionStats.completionRate > 70 ? "Xuất sắc" : 
                          completionStats.completionRate > 50 ? "Tốt" : 
                          completionStats.completionRate > 30 ? "Trung bình" : "Cần cải thiện"}</p>
                    </div>
                  </div>
                  
                  <div className="insight-item">
                    <span className="insight-icon">🎯</span>
                    <div>
                      <strong>Độ ưu tiên:</strong>
                      <p>{overdueStats > 0 ? `Có ${overdueStats} task cần xử lý ngay` : "Tất cả đều đúng hạn"}</p>
                    </div>
                  </div>
                  
                  <div className="insight-item">
                    <span className="insight-icon">📅</span>
                    <div>
                      <strong>Khuyến nghị:</strong>
                      <p>
                        {completionStats.completionRate < 30 ? "Tập trung hoàn thành task quan trọng trước" :
                         completionStats.completionRate < 60 ? "Tiếp tục duy trì nhịp độ hiện tại" :
                         "Bạn đang làm rất tốt! Tiếp tục phát huy"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === "performance" && (
          <div className="performance-tab">
            <div className="performance-header">
              <h2>🚀 Phân tích hiệu suất chi tiết</h2>
              <p>Đánh giá toàn diện về năng suất làm việc của bạn</p>
            </div>

            <div className="performance-metrics">
              <div className="metric-card">
                <h3>📊 Hiệu suất tổng quan</h3>
                <div className="metric-grid">
                  <div className="metric-item">
                    <span className="metric-label">Tỷ lệ hoàn thành</span>
                    <div className="metric-value">
                      <span className="value">{completionStats.completionRate.toFixed(1)}%</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${completionStats.completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="metric-item">
                    <span className="metric-label">Task/ngày</span>
                    <div className="metric-value">
                      <span className="value">
                        {(filteredTasks.length / (timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365)).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="metric-item">
                    <span className="metric-label">Độ chính xác</span>
                    <div className="metric-value">
                      <span className="value">
                        {filteredTasks.length > 0 ? 
                          (100 - (overdueStats / filteredTasks.length * 100)).toFixed(1) : 100
                        }%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <h3>📅 Phân tích theo thời gian</h3>
                <div className="time-analysis">
                  <p>Trong {timeRange === 'week' ? '7 ngày' : timeRange === 'month' ? '30 ngày' : '365 ngày'} qua:</p>
                  <ul>
                    <li>✅ <strong>{completionStats.completed}</strong> task hoàn thành</li>
                    <li>📝 <strong>{filteredTasks.length}</strong> task được tạo</li>
                    <li>⏰ <strong>{overdueStats}</strong> task trễ hạn</li>
                    <li>📈 Hiệu suất trung bình: <strong>{completionStats.completionRate.toFixed(1)}%</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <UserProfileTab tasks={tasks} projects={projects} />
        )}

        {/* GOALS TAB */}
        {activeTab === "goals" && (
          <PersonalGoalsTab tasks={tasks} />
        )}
      </div>
    </div>
  );
}