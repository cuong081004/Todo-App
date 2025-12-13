import { useState, useEffect, useCallback } from "react";
import axios from "../../../api/axios";

export default function PersonalGoalsTab({ tasks }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({
    title: "",
    target: 10,
    type: "custom",
    period: "monthly",
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  // Fetch goals từ API
  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/goals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGoals(res.data?.data || []);
      setError("");
    } catch (err) {
      console.error("Failed to fetch goals:", err);
      setError("Không thể tải mục tiêu");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial fetch
  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Calculate dynamic goals
  const calculateDynamicGoals = useCallback(() => {
    const dynamicGoals = [];
    
    if (!tasks) return dynamicGoals;
    
    // Goal 1: Hoàn thành task tháng này
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthlyTasksCompleted = tasks.filter(t => {
      if (!t || !t.createdAt) return false;
      const taskDate = new Date(t.createdAt);
      return taskDate.getMonth() === thisMonth && 
             taskDate.getFullYear() === thisYear &&
             t.completed;
    }).length;
    
    dynamicGoals.push({
      id: "dynamic_monthly_tasks",
      title: "Hoàn thành 20 task tháng này",
      target: 20,
      current: monthlyTasksCompleted,
      type: "monthly_tasks",
      period: "monthly",
      isDynamic: true
    });

    // Goal 2: Tỷ lệ trễ hạn dưới 5%
    const totalTasks = tasks.length;
    const overdueTasks = tasks.filter(t => {
      if (!t) return false;
      return t.dueDate && 
             new Date(t.dueDate) < new Date() && 
             !t.completed;
    }).length;
    
    const overdueRate = totalTasks > 0 ? 
      (overdueTasks / totalTasks) * 100 : 0;
    
    dynamicGoals.push({
      id: "dynamic_overdue_rate",
      title: "Giảm task trễ hạn dưới 5%",
      target: 5,
      current: Math.round(overdueRate * 100) / 100, // Làm tròn 2 số thập phân
      type: "overdue_rate",
      period: "ongoing",
      isDynamic: true
    });

    // Goal 3: Streak 7 ngày
    const streak = calculateCurrentStreak(tasks);
    dynamicGoals.push({
      id: "dynamic_streak",
      title: "Duy trì streak 7 ngày",
      target: 7,
      current: streak,
      type: "streak",
      period: "weekly",
      isDynamic: true
    });

    return dynamicGoals;
  }, [tasks]);

  function calculateCurrentStreak(tasks) {
    if (!tasks || tasks.length === 0) return 0;
    
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const hasCompletedTask = tasks.some(task => {
        if (!task) return false;
        return task.completed && 
               task.updatedAt && 
               new Date(task.updatedAt).toDateString() === date.toDateString();
      });
      
      if (hasCompletedTask) {
        streak++;
      } else if (i === 0) {
        break;
      }
    }
    
    return streak;
  }

  // Kết hợp goals từ API và dynamic goals
  const allGoals = [...goals, ...calculateDynamicGoals()].filter(goal => goal != null);

  const addNewGoal = async () => {
    if (!newGoal.title.trim()) {
      alert("Vui lòng nhập tên mục tiêu!");
      return;
    }

    try {
      const res = await axios.post("/goals", newGoal, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGoals([...goals, res.data.data]);
      setNewGoal({
        title: "",
        target: 10,
        type: "custom",
        period: "monthly",
      });
      setShowAddForm(false);
      setError("");
    } catch (err) {
      console.error("Create goal error:", err);
      setError(err.response?.data?.message || "Không thể tạo mục tiêu");
    }
  };

  const updateGoal = async (id, updates) => {
    if (!id) return;
    
    try {
      const res = await axios.patch(`/goals/${id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGoals(goals.map(goal => 
        goal._id === id ? res.data.data : goal
      ));
      setEditingGoal(null);
      setError("");
    } catch (err) {
      console.error("Update goal error:", err);
      setError(err.response?.data?.message || "Không thể cập nhật mục tiêu");
    }
  };

  const deleteGoal = async (id) => {
    if (!id) return;
    
    if (!window.confirm("Bạn có chắc muốn xóa mục tiêu này?")) return;

    try {
      await axios.delete(`/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGoals(goals.filter(goal => goal._id !== id));
      setError("");
    } catch (err) {
      console.error("Delete goal error:", err);
      setError(err.response?.data?.message || "Không thể xóa mục tiêu");
    }
  };

  const startEditing = (goal) => {
    if (!goal || goal.isDynamic) {
      alert("Không thể chỉnh sửa mục tiêu hệ thống");
      return;
    }
    setEditingGoal({ ...goal });
  };

  const cancelEditing = () => {
    setEditingGoal(null);
  };

  const getProgressPercentage = (goal) => {
    if (!goal || !goal.target || goal.target === 0) return 0;
    
    const progress = Math.min((goal.current / goal.target) * 100, 100);
    return Math.round(progress * 10) / 10;
  };

  const getGoalStatus = (goal) => {
    if (!goal) return "started";
    
    const progress = getProgressPercentage(goal);
    if (progress >= 100) return "completed";
    if (progress >= 75) return "almost";
    if (progress >= 50) return "halfway";
    return "started";
  };

  const getGoalTypes = () => [
    { value: "monthly_tasks", label: "Task hàng tháng" },
    { value: "weekly_tasks", label: "Task hàng tuần" },
    { value: "overdue_rate", label: "Tỷ lệ trễ hạn" },
    { value: "streak", label: "Chuỗi ngày" },
    { value: "completion_rate", label: "Tỷ lệ hoàn thành" },
    { value: "custom", label: "Tuỳ chỉnh" }
  ];

  const getPeriods = () => [
    { value: "daily", label: "Hàng ngày" },
    { value: "weekly", label: "Hàng tuần" },
    { value: "monthly", label: "Hàng tháng" },
    { value: "yearly", label: "Hàng năm" },
    { value: "ongoing", label: "Liên tục" }
  ];

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Đang tải mục tiêu...</p>
      </div>
    );
  }

  return (
    <div className="personal-goals-tab">
      <div className="goals-header">
        <h3>🎯 Mục tiêu cá nhân</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="add-goal-btn"
        >
          {showAddForm ? "✕ Hủy" : "+ Thêm mục tiêu"}
        </button>
      </div>

      {error && (
        <div className="error-message" style={{ margin: "0 0 20px 0" }}>
          {error}
        </div>
      )}

      {/* Add Goal Form */}
      {showAddForm && (
        <div className="goal-form-card">
          <h4>➕ Thêm mục tiêu mới</h4>
          <div className="form-group">
            <label>Tên mục tiêu *</label>
            <input
              type="text"
              value={newGoal.title}
              onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
              placeholder="Nhập tên mục tiêu..."
              className="form-input"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Mục tiêu</label>
              <input
                type="number"
                value={newGoal.target}
                onChange={(e) => setNewGoal({...newGoal, target: parseInt(e.target.value) || 0})}
                min="1"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>Loại mục tiêu</label>
              <select
                value={newGoal.type}
                onChange={(e) => setNewGoal({...newGoal, type: e.target.value})}
                className="form-select"
              >
                {getGoalTypes().map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Chu kỳ</label>
            <select
              value={newGoal.period}
              onChange={(e) => setNewGoal({...newGoal, period: e.target.value})}
              className="form-select"
            >
              {getPeriods().map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button onClick={addNewGoal} className="save-btn">
              💾 Lưu mục tiêu
            </button>
            <button 
              onClick={() => setShowAddForm(false)} 
              className="cancel-btn"
            >
              ❌ Hủy
            </button>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      <div className="goals-grid">
        {allGoals.map(goal => {
          if (!goal) return null;
          
          const progress = getProgressPercentage(goal);
          const status = getGoalStatus(goal);
          const isDynamic = goal.isDynamic || false;
          
          return (
            <div key={goal._id || goal.id} className={`goal-card ${status} ${isDynamic ? 'dynamic' : ''}`}>
              {isDynamic && (
                <div className="dynamic-badge" title="Mục tiêu hệ thống">
                  🔄
                </div>
              )}
              
              {/* Edit Mode */}
              {editingGoal?._id === goal._id && !isDynamic ? (
                <div className="goal-edit-mode">
                  <input
                    type="text"
                    value={editingGoal.title || ""}
                    onChange={(e) => setEditingGoal({...editingGoal, title: e.target.value})}
                    className="edit-input"
                  />
                  
                  <div className="edit-row">
                    <div className="edit-group">
                      <label>Mục tiêu:</label>
                      <input
                        type="number"
                        value={editingGoal.target || 0}
                        onChange={(e) => setEditingGoal({...editingGoal, target: parseInt(e.target.value) || 0})}
                        min="1"
                        className="edit-number"
                      />
                    </div>
                    
                    <div className="edit-group">
                      <label>Hiện tại:</label>
                      <input
                        type="number"
                        value={editingGoal.current || 0}
                        onChange={(e) => setEditingGoal({...editingGoal, current: parseInt(e.target.value) || 0})}
                        min="0"
                        className="edit-number"
                      />
                    </div>
                  </div>

                  <div className="edit-actions">
                    <button 
                      onClick={() => updateGoal(goal._id, editingGoal)}
                      className="save-edit-btn"
                    >
                      💾 Lưu
                    </button>
                    <button 
                      onClick={cancelEditing}
                      className="cancel-edit-btn"
                    >
                      ❌ Hủy
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="goal-header">
                    <h4>{goal.title || "Mục tiêu không có tên"}</h4>
                    <div className="goal-actions">
                      {!isDynamic && (
                        <button 
                          onClick={() => startEditing(goal)}
                          className="edit-goal-btn"
                          title="Sửa mục tiêu"
                        >
                          ✏️
                        </button>
                      )}
                      {!isDynamic && (
                        <button 
                          onClick={() => deleteGoal(goal._id)}
                          className="delete-goal-btn"
                          title="Xóa mục tiêu"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="goal-progress">
                    <div className="progress-info">
                      <span className="progress-text">
                        {(goal.current || 0)}/{(goal.target || 0)}
                      </span>
                      <span className="progress-percentage">
                        {progress}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="goal-meta">
                    <span className="goal-type">
                      {getGoalTypes().find(t => t.value === goal.type)?.label || "Tuỳ chỉnh"}
                    </span>
                    <span className="goal-period">
                      {getPeriods().find(p => p.value === goal.period)?.label || "Hàng tháng"}
                    </span>
                  </div>
                  
                  <div className="goal-status">
                    {status === "completed" && (
                      <span className="status-badge completed">
                        {isDynamic ? "✅ Đạt được" : "✅ Đã hoàn thành"}
                      </span>
                    )}
                    {status === "almost" && (
                      <span className="status-badge almost">🎯 Sắp hoàn thành</span>
                    )}
                    {status === "halfway" && (
                      <span className="status-badge halfway">📈 Đang tiến triển</span>
                    )}
                    {status === "started" && (
                      <span className="status-badge started">🚀 Bắt đầu</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="empty-goals">
          <div className="empty-icon">🎯</div>
          <h4>Chưa có mục tiêu nào</h4>
          <p>Hãy thêm mục tiêu đầu tiên để bắt đầu theo dõi tiến độ!</p>
          <button 
            onClick={() => setShowAddForm(true)} 
            className="add-first-goal-btn"
          >
            + Thêm mục tiêu đầu tiên
          </button>
        </div>
      )}

      {/* Goal Statistics */}
      {goals.length > 0 && (
        <div className="goal-statistics">
          <h4>📊 Thống kê mục tiêu</h4>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-number">
                {goals.filter(g => g.completed).length}
              </div>
              <div className="stat-label">Đã hoàn thành</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {goals.length > 0 ? 
                  Math.round(goals.reduce((sum, goal) => sum + getProgressPercentage(goal), 0) / goals.length) : 0
                }%
              </div>
              <div className="stat-label">Tiến độ trung bình</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {goals.filter(g => getProgressPercentage(g) >= 75).length}
              </div>
              <div className="stat-label">Sắp hoàn thành</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{goals.length}</div>
              <div className="stat-label">Tổng mục tiêu</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}