import { useState, useEffect } from "react";

export default function UserProfileTab({ tasks, projects }) {
  const [userInfo, setUserInfo] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy thông tin user từ localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUserInfo(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
        setUserInfo({ username: "Người dùng" });
      }
    } else {
      setUserInfo({ username: "Người dùng" });
    }
    
    calculateUserStats();
  }, [tasks, projects]);

  // Hàm format username thành tên hiển thị
  const formatDisplayName = (username) => {
    if (!username) return "Người dùng";
    
    // Xóa ký tự đặc biệt và số
    let displayName = username.replace(/[^a-zA-ZÀ-ỹ\s]/g, '');
    
    // Viết hoa chữ cái đầu
    displayName = displayName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Nếu username chỉ có chữ số hoặc ký tự đặc biệt
    if (displayName.trim() === '') {
      return "Người dùng";
    }
    
    return displayName;
  };

  // Hàm lấy chữ cái đầu cho avatar
  const getAvatarInitial = (username) => {
    if (!username) return "👤";
    
    // Lấy chữ cái đầu tiên
    const firstChar = username.charAt(0).toUpperCase();
    
    // Kiểm tra xem có phải chữ cái không
    if (/[A-ZÀ-Ỹ]/.test(firstChar)) {
      return firstChar;
    }
    
    return "👤";
  };

  // Hàm tạo trạng thái thành viên dựa trên username
  const getMemberStatus = (username) => {
    if (!username) return "Thành viên mới";
    
    const length = username.length;
    if (length < 5) return "Thành viên mới";
    if (length < 8) return "Thành viên tích cực";
    if (length < 12) return "Thành viên lâu năm";
    return "Thành viên VIP";
  };

  const calculateUserStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && !t.completed
    ).length;
    
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Tính streak (số ngày liên tiếp hoàn thành task)
    const today = new Date();
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(today.getDate() - i);
      return date.toDateString();
    }).reverse();

    const streak = last7Days.filter(day => {
      return tasks.some(task => 
        task.completed && 
        task.updatedAt && 
        new Date(task.updatedAt).toDateString() === day
      );
    }).length;

    setUserStats({
      totalTasks,
      completedTasks,
      overdueTasks,
      completionRate,
      streak,
      totalProjects: projects.length,
      productivityScore: Math.round(completionRate * 0.7 + (100 - (overdueTasks / totalTasks * 100 || 0)) * 0.3)
    });
    setLoading(false);
  };

  if (loading || !userInfo) return <div className="loading-spinner">Đang tải thông tin...</div>;

  return (
    <div className="user-profile-tab">
      <div className="profile-header">
        <div className="avatar-section">
          <div className="avatar-large">
            {getAvatarInitial(userInfo.username)}
          </div>
          <div className="user-info">
            <h2>{formatDisplayName(userInfo.username)}</h2>
            <p className="member-since">{getMemberStatus(userInfo.username)}</p>
            <p className="username-display">
              <small>Tên đăng nhập: {userInfo.username}</small>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="user-stats-grid">
        <div className="user-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{userStats.totalTasks}</h3>
            <p>Tổng công việc</p>
          </div>
        </div>
        
        <div className="user-stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{userStats.completedTasks}</h3>
            <p>Đã hoàn thành</p>
          </div>
        </div>
        
        <div className="user-stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <h3>{userStats.streak}</h3>
            <p>Ngày liên tiếp</p>
          </div>
        </div>
        
        <div className="user-stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{userStats.productivityScore}</h3>
            <p>Điểm năng suất</p>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="progress-section">
        <h3>📈 Tiến độ tổng quan</h3>
        <div className="progress-cards">
          <div className="progress-card">
            <div className="progress-header">
              <span>Tỷ lệ hoàn thành</span>
              <span>{userStats.completionRate.toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${userStats.completionRate}%` }}
              ></div>
            </div>
          </div>
          
          <div className="progress-card">
            <div className="progress-header">
              <span>Công việc trễ hạn</span>
              <span>{userStats.overdueTasks}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill error" 
                style={{ 
                  width: `${userStats.totalTasks > 0 ? (userStats.overdueTasks / userStats.totalTasks) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="insights-section">
        <h3>💡 Gợi ý cá nhân</h3>
        <div className="insights-list">
          {userStats.completionRate < 50 && (
            <div className="insight-item warning">
              <span>📋</span>
              <p>Hãy tập trung hoàn thành nhiều task hơn! Tỷ lệ hoàn thành của bạn đang thấp.</p>
            </div>
          )}
          
          {userStats.overdueTasks > 0 && (
            <div className="insight-item error">
              <span>⏰</span>
              <p>Bạn có {userStats.overdueTasks} task trễ hạn. Hãy ưu tiên giải quyết chúng!</p>
            </div>
          )}
          
          {userStats.streak >= 3 && (
            <div className="insight-item success">
              <span>🔥</span>
              <p>Xuất sắc! Bạn đã duy trì được {userStats.streak} ngày liên tiếp hoàn thành task.</p>
            </div>
          )}
          
          {userStats.completionRate >= 80 && (
            <div className="insight-item success">
              <span>🎉</span>
              <p>Tuyệt vời! Bạn đang làm việc rất hiệu quả với {userStats.completionRate.toFixed(1)}% task hoàn thành.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}