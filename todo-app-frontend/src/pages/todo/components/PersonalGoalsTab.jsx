import { useState } from "react";

export default function PersonalGoalsTab({ tasks }) {
  const [goals, setGoals] = useState([
    {
      id: 1,
      title: "Hoàn thành 20 task tháng này",
      target: 20,
      current: tasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        const now = new Date();
        return taskDate.getMonth() === now.getMonth() && 
               taskDate.getFullYear() === now.getFullYear() &&
               t.completed;
      }).length,
      type: "monthly_tasks",
      period: "monthly"
    },
    {
      id: 2,
      title: "Giảm task trễ hạn dưới 5%",
      target: 5,
      current: tasks.length > 0 ? 
        (tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length / tasks.length) * 100 : 0,
      type: "overdue_rate",
      period: "ongoing"
    },
    {
      id: 3,
      title: "Duy trì streak 7 ngày",
      target: 7,
      current: calculateCurrentStreak(tasks),
      type: "streak",
      period: "weekly"
    }
  ]);

  const [editingGoal, setEditingGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({
    title: "",
    target: 10,
    type: "custom",
    period: "monthly"
  });
  const [showAddForm, setShowAddForm] = useState(false);

  function calculateCurrentStreak(tasks) {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const hasCompletedTask = tasks.some(task => 
        task.completed && 
        task.updatedAt && 
        new Date(task.updatedAt).toDateString() === date.toDateString()
      );
      
      if (hasCompletedTask) {
        streak++;
      } else if (i === 0) {
        // Hôm nay chưa có task hoàn thành, streak bị break
        break;
      }
    }
    
    return streak;
  }

  const addNewGoal = () => {
    if (!newGoal.title.trim()) {
      alert("Vui lòng nhập tên mục tiêu!");
      return;
    }

    const goal = {
      id: Date.now(),
      title: newGoal.title.trim(),
      target: newGoal.target,
      current: 0,
      type: newGoal.type,
      period: newGoal.period
    };

    setGoals([...goals, goal]);
    setNewGoal({
      title: "",
      target: 10,
      type: "custom",
      period: "monthly"
    });
    setShowAddForm(false);
  };

  const updateGoal = (id, updates) => {
    setGoals(goals.map(goal => 
      goal.id === id ? { ...goal, ...updates } : goal
    ));
    setEditingGoal(null);
  };

  const deleteGoal = (id) => {
    if (window.confirm("Bạn có chắc muốn xóa mục tiêu này?")) {
      setGoals(goals.filter(goal => goal.id !== id));
    }
  };

  const startEditing = (goal) => {
    setEditingGoal({ ...goal });
  };

  const cancelEditing = () => {
    setEditingGoal(null);
  };

  const getProgressPercentage = (goal) => {
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  const getGoalStatus = (goal) => {
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
        {goals.map(goal => {
          const progress = getProgressPercentage(goal);
          const status = getGoalStatus(goal);
          
          return (
            <div key={goal.id} className={`goal-card ${status}`}>
              {/* Edit Mode */}
              {editingGoal?.id === goal.id ? (
                <div className="goal-edit-mode">
                  <input
                    type="text"
                    value={editingGoal.title}
                    onChange={(e) => setEditingGoal({...editingGoal, title: e.target.value})}
                    className="edit-input"
                  />
                  
                  <div className="edit-row">
                    <div className="edit-group">
                      <label>Mục tiêu:</label>
                      <input
                        type="number"
                        value={editingGoal.target}
                        onChange={(e) => setEditingGoal({...editingGoal, target: parseInt(e.target.value) || 0})}
                        min="1"
                        className="edit-number"
                      />
                    </div>
                    
                    <div className="edit-group">
                      <label>Hiện tại:</label>
                      <input
                        type="number"
                        value={editingGoal.current}
                        onChange={(e) => setEditingGoal({...editingGoal, current: parseInt(e.target.value) || 0})}
                        min="0"
                        className="edit-number"
                      />
                    </div>
                  </div>

                  <div className="edit-actions">
                    <button 
                      onClick={() => updateGoal(goal.id, editingGoal)}
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
                    <h4>{goal.title}</h4>
                    <div className="goal-actions">
                      <button 
                        onClick={() => startEditing(goal)}
                        className="edit-goal-btn"
                        title="Sửa mục tiêu"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => deleteGoal(goal.id)}
                        className="delete-goal-btn"
                        title="Xóa mục tiêu"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="goal-progress">
                    <div className="progress-info">
                      <span className="progress-text">
                        {goal.current}/{goal.target}
                      </span>
                      <span className="progress-percentage">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="goal-meta">
                    <span className="goal-type">{getGoalTypes().find(t => t.value === goal.type)?.label}</span>
                    <span className="goal-period">{getPeriods().find(p => p.value === goal.period)?.label}</span>
                  </div>
                  
                  <div className="goal-status">
                    {status === "completed" && (
                      <span className="status-badge completed">✅ Đã hoàn thành</span>
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
                {goals.filter(g => getGoalStatus(g) === "completed").length}
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