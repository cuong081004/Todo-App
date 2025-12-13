import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import "./CalendarView.css";
import axios from "../api/axios";

const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});

  // State cho auto-refresh
  const [lastUpdate, setLastUpdate] = useState(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [refreshNotification, setRefreshNotification] = useState(null);

  const token = localStorage.getItem("token");

  // Refs for detecting clicks outside
  const pickerRef = useRef(null);
  const monthYearBtnRef = useRef(null);

  // Month names in Vietnamese (full version)
  const months = [
    { id: 1, name: "Tháng 1", shortName: "Thg 1" },
    { id: 2, name: "Tháng 2", shortName: "Thg 2" },
    { id: 3, name: "Tháng 3", shortName: "Thg 3" },
    { id: 4, name: "Tháng 4", shortName: "Thg 4" },
    { id: 5, name: "Tháng 5", shortName: "Thg 5" },
    { id: 6, name: "Tháng 6", shortName: "Thg 6" },
    { id: 7, name: "Tháng 7", shortName: "Thg 7" },
    { id: 8, name: "Tháng 8", shortName: "Thg 8" },
    { id: 9, name: "Tháng 9", shortName: "Thg 9" },
    { id: 10, name: "Tháng 10", shortName: "Thg 10" },
    { id: 11, name: "Tháng 11", shortName: "Thg 11" },
    { id: 12, name: "Tháng 12", shortName: "Thg 12" },
  ];

  // Dynamic years: từ năm hiện tại -5 đến +5
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const yearsArray = [];
    // Từ 5 năm trước đến 5 năm sau
    for (let i = -5; i <= 5; i++) {
      yearsArray.push(current + i);
    }
    return yearsArray;
  }, []);

  // Helper function để lấy date string (YYYY-MM-DD) với timezone đúng
  const getDateString = (date, useLocal = true) => {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";

      if (useLocal) {
        // Sử dụng local date components để tạo string không có timezone issues
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      } else {
        // Sử dụng UTC (cách cũ - chỉ dùng cho debug)
        return d.toISOString().split("T")[0];
      }
    } catch (error) {
      console.error("Error getting date string:", error);
      return "";
    }
  };

  // Thêm hàm normalize date chính xác hơn
  const normalizeDateForComparison = (date) => {
    if (!date) return null;
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;

      // Tạo date mới từ year, month, day của date gốc
      // Sử dụng local time để loại bỏ timezone issues
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    } catch (error) {
      console.error("Error normalizing date:", error);
      return null;
    }
  };

  // ========== CẢI THIỆN: Fetch tasks với cache busting ==========
  const fetchTasksForMonth = useCallback(
    async (month, year) => {
      setLoading(true);
      try {
        const cacheBuster = Date.now(); // Thêm timestamp để tránh cache
        console.log(
          `🔄 Fetching calendar tasks for ${month}/${year} (cache: ${cacheBuster})`
        );

        const res = await axios.get("/advanced-tasks/calendar/recurring", {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            month,
            year,
            _: cacheBuster, // Thêm param cache busting
          },
        });

        console.log(
          "📅 Calendar tasks loaded:",
          res.data?.data?.length || 0,
          "tasks",
          `(cache bust: ${cacheBuster})`
        );

        // Debug: log một vài task để kiểm tra timezone
        if (res.data?.data && res.data.data.length > 0) {
          console.log("📋 Sample task structure:");
          res.data.data.slice(0, 3).forEach((task, index) => {
            if (task.dueDate) {
              const taskDate = normalizeDateForComparison(task.dueDate);
              console.log(`Task ${index}: "${task.title}"`, {
                dueDate: task.dueDate,
                dueDateNormalized: getDateString(taskDate, true),
                completed: task.completed,
                status: task.status,
                isRecurringInstance: task.isRecurringInstance,
              });
            }
          });
        }

        setTasks(res.data?.data || []);
        setLastUpdate(new Date().toISOString());
      } catch (error) {
        console.error("Failed to fetch calendar tasks:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // Initial fetch
  useEffect(() => {
    fetchTasksForMonth(currentMonth, currentYear);
  }, [fetchTasksForMonth, currentMonth, currentYear]);

  // ========== QUAN TRỌNG: Event listeners để đồng bộ với TaskList ==========
  useEffect(() => {
    const handleTaskUpdate = (event) => {
      console.log("📬 Calendar received update event:", event.detail);

      // Hiển thị thông báo refresh
      if (event.detail?.taskTitle) {
        const action = event.detail.completed ? "hoàn thành" : "bỏ hoàn thành";
        setRefreshNotification({
          message: `✅ "${event.detail.taskTitle}" đã được ${action}`,
          type: "success",
          timestamp: new Date(),
        });

        // Tự động ẩn thông báo sau 3 giây
        setTimeout(() => {
          setRefreshNotification(null);
        }, 3000);
      }

      // Tăng forceRefresh để trigger re-render
      setForceRefresh((prev) => prev + 1);
      setLastUpdate(new Date().toISOString());

      // Refresh data ngay lập tức (với delay nhỏ để đảm bảo server đã update)
      setTimeout(() => {
        console.log("🔄 Calendar refreshing due to task update");
        fetchTasksForMonth(currentMonth, currentYear);
      }, 500);
    };

    const handleRefreshCalendar = (event) => {
      console.log("🔄 Calendar received refresh event:", event.detail);
      setForceRefresh((prev) => prev + 1);

      // Refresh với cache busting
      setTimeout(() => {
        fetchTasksForMonth(currentMonth, currentYear);
      }, 300);
    };

    const handleTaskSync = (event) => {
      console.log("🔄 Calendar received sync event:", event.detail);

      // Hiển thị thông báo tùy theo loại sync
      if (event.detail?.type === "recurringInstanceUpdated") {
        setRefreshNotification({
          message: `🔄 Đang đồng bộ recurring instance...`,
          type: "info",
          timestamp: new Date(),
        });
      }

      setForceRefresh((prev) => prev + 1);

      // Refresh sau 1 giây để đảm bảo
      setTimeout(() => {
        fetchTasksForMonth(currentMonth, currentYear);
      }, 1000);
    };

    // Đăng ký event listeners
    window.addEventListener("taskUpdated", handleTaskUpdate);
    window.addEventListener("refreshCalendar", handleRefreshCalendar);
    window.addEventListener("taskSync", handleTaskSync);

    return () => {
      window.removeEventListener("taskUpdated", handleTaskUpdate);
      window.removeEventListener("refreshCalendar", handleRefreshCalendar);
      window.removeEventListener("taskSync", handleTaskSync);
    };
  }, [fetchTasksForMonth, currentMonth, currentYear]);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        monthYearBtnRef.current &&
        !monthYearBtnRef.current.contains(event.target)
      ) {
        setShowMonthYearPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ========== Thêm forceRefresh vào dependency để tự động refresh ==========
  useEffect(() => {
    if (forceRefresh > 0) {
      console.log(`🔄 Calendar force refresh #${forceRefresh}`);
      // Không cần fetch lại ở đây vì đã có trong event handlers
    }
  }, [forceRefresh]);

  // Handle date selection
  const handleDateSelect = (date) => {
    console.log("📅 Date selected:", date.toLocaleDateString("vi-VN"));

    setSelectedDate(date);

    // Update month/year if needed
    const selectedMonth = date.getMonth() + 1;
    const selectedYear = date.getFullYear();

    if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
      setCurrentMonth(selectedMonth);
      setCurrentYear(selectedYear);
      fetchTasksForMonth(selectedMonth, selectedYear);
    }
  };

  // Toggle task expansion
  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;

    if (newMonth < 1) {
      newMonth = 12;
      newYear = currentYear - 1;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);

    // Update selectedDate
    const newSelectedDate = new Date(
      newYear,
      newMonth - 1,
      Math.min(selectedDate.getDate(), new Date(newYear, newMonth, 0).getDate())
    );

    setSelectedDate(newSelectedDate);
    fetchTasksForMonth(newMonth, newYear);
  };

  const goToNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear = currentYear + 1;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);

    // Update selectedDate
    const newSelectedDate = new Date(
      newYear,
      newMonth - 1,
      Math.min(selectedDate.getDate(), new Date(newYear, newMonth, 0).getDate())
    );

    setSelectedDate(newSelectedDate);
    fetchTasksForMonth(newMonth, newYear);
  };

  // Select month and year
  const selectMonth = (monthId) => {
    setCurrentMonth(monthId);
    setShowMonthYearPicker(false);

    // Update selectedDate
    const newSelectedDate = new Date(
      currentYear,
      monthId - 1,
      Math.min(
        selectedDate.getDate(),
        new Date(currentYear, monthId, 0).getDate()
      )
    );

    setSelectedDate(newSelectedDate);
    fetchTasksForMonth(monthId, currentYear);
  };

  const selectYear = (year) => {
    setCurrentYear(year);
    setShowMonthYearPicker(false);

    // Update selectedDate
    const newSelectedDate = new Date(
      year,
      currentMonth - 1,
      Math.min(
        selectedDate.getDate(),
        new Date(year, currentMonth, 0).getDate()
      )
    );

    setSelectedDate(newSelectedDate);
    fetchTasksForMonth(currentMonth, year);
  };

  // Go to today với local time đúng
  const goToToday = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    console.log("📅 goToToday:", getDateString(today, true));

    setSelectedDate(today);
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
    fetchTasksForMonth(today.getMonth() + 1, today.getFullYear());
  };

  // Go to previous/next year
  const goToPreviousYear = () => {
    const newYear = currentYear - 1;
    setCurrentYear(newYear);

    // Update selectedDate
    const newSelectedDate = new Date(
      newYear,
      currentMonth - 1,
      Math.min(
        selectedDate.getDate(),
        new Date(newYear, currentMonth, 0).getDate()
      )
    );

    setSelectedDate(newSelectedDate);
    fetchTasksForMonth(currentMonth, newYear);
  };

  const goToNextYear = () => {
    const newYear = currentYear + 1;
    setCurrentYear(newYear);

    // Update selectedDate
    const newSelectedDate = new Date(
      newYear,
      currentMonth - 1,
      Math.min(
        selectedDate.getDate(),
        new Date(newYear, currentMonth, 0).getDate()
      )
    );

    setSelectedDate(newSelectedDate);
    fetchTasksForMonth(currentMonth, newYear);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const monthTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = normalizeDateForComparison(task.dueDate);
      if (!taskDate) return false;

      return (
        taskDate.getMonth() + 1 === currentMonth &&
        taskDate.getFullYear() === currentYear
      );
    });

    const completed = monthTasks.filter((t) => t.completed).length;
    const overdue = monthTasks.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      const taskDate = normalizeDateForComparison(t.dueDate);
      const today = normalizeDateForComparison(new Date());
      return taskDate && today && taskDate < today;
    }).length;
    const recurring = monthTasks.filter((t) => t.recurring?.isRecurring).length;

    return {
      total: monthTasks.length,
      completed,
      overdue,
      recurring,
      completionRate:
        monthTasks.length > 0
          ? Math.round((completed / monthTasks.length) * 100)
          : 0,
    };
  }, [tasks, currentMonth, currentYear]);

  // Get tasks for selected date
  const tasksForSelectedDate = useMemo(() => {
    if (!selectedDate || tasks.length === 0) return [];

    const normalizedSelectedDate = normalizeDateForComparison(selectedDate);
    if (!normalizedSelectedDate) return [];

    const selectedDateStr = getDateString(normalizedSelectedDate, true);

    console.log("🔍 Filtering tasks for selected date:", {
      selectedDate: selectedDateStr,
      selectedDateLocal: normalizedSelectedDate.toLocaleDateString("vi-VN"),
      totalTasks: tasks.length,
    });

    const filteredTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;

      try {
        // Normalize task date để so sánh
        const taskDate = normalizeDateForComparison(task.dueDate);
        if (!taskDate) return false;

        const taskDateStr = getDateString(taskDate, true);

        // DEBUG: Log matching process
        const matches = taskDateStr === selectedDateStr;
        if (matches) {
          console.log(`✅ Task "${task.title}" matches:`, {
            taskDateStr,
            selectedDateStr,
            completed: task.completed,
            isRecurringInstance: task.isRecurringInstance,
          });
        }

        return matches;
      } catch (error) {
        console.error(`Error comparing dates for task ${task._id}:`, error);
        return false;
      }
    });

    console.log(
      `✅ Found ${filteredTasks.length} tasks for ${selectedDateStr}`
    );

    // Log all matching tasks for debugging
    filteredTasks.forEach((task, index) => {
      console.log(`Task ${index + 1}: "${task.title}"`, {
        id: task._id,
        completed: task.completed,
        dueDate: task.dueDate,
        status: task.status,
        isRecurringInstance: task.isRecurringInstance,
      });
    });

    return filteredTasks;
  }, [tasks, selectedDate]);

  // Get tasks for hover date
  const tasksForHoverDate = useMemo(() => {
    if (!hoverDate) return [];

    const hoverDateStr = getDateString(hoverDate, true);

    return tasks.filter((task) => {
      if (!task.dueDate) return false;

      try {
        const taskDate = normalizeDateForComparison(task.dueDate);
        if (!taskDate) return false;

        const taskDateStr = getDateString(taskDate, true);
        return taskDateStr === hoverDateStr;
      } catch (error) {
        console.log("Error checking task date:", error);
        return false;
      }
    });
  }, [tasks, hoverDate]);

  // Enhanced tile content với logic mới
  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;

    const dateStr = getDateString(date, true);

    const dayTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;

      try {
        const taskDate = normalizeDateForComparison(task.dueDate);
        if (!taskDate) return false;

        const taskDateStr = getDateString(taskDate, true);
        return taskDateStr === dateStr;
      } catch (error) {
        console.log("Error checking task date:", error);
        return false;
      }
    });

    if (dayTasks.length === 0) return null;

    const completedCount = dayTasks.filter((t) => t.completed).length;
    const overdueCount = dayTasks.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      const taskDate = normalizeDateForComparison(t.dueDate);
      const today = normalizeDateForComparison(new Date());
      return taskDate && today && taskDate < today;
    }).length;

    return (
      <div className="day-indicators-enhanced">
        <div className="task-dots-container-enhanced">
          {dayTasks.map((task, index) => {
            let className = "task-indicator-dot-enhanced";
            if (task.completed) className += " completed";
            else if (
              task.dueDate &&
              new Date(task.dueDate) < new Date() &&
              !task.completed
            )
              className += " overdue";
            else if (task.recurring?.isRecurring) className += " recurring";
            else className += " regular";

            return (
              <span
                key={index}
                className={className}
                title={`${task.title}${task.completed ? " (Hoàn thành)" : ""}`}
              />
            );
          })}
        </div>
        <div className="day-task-stats">
          <span className="task-count-badge-mini">{dayTasks.length}</span>
          {completedCount > 0 && (
            <span className="completed-count-badge">{completedCount}✓</span>
          )}
          {overdueCount > 0 && (
            <span className="overdue-count-badge">{overdueCount}!</span>
          )}
        </div>
      </div>
    );
  };

  // Enhanced tile class names với logic mới
  const getTileClassName = ({ date, view }) => {
    if (view !== "month") return "";

    const classes = [];

    const dateStr = getDateString(date, true);
    const todayStr = getDateString(
      normalizeDateForComparison(new Date()),
      true
    );
    const selectedDateStr = getDateString(
      normalizeDateForComparison(selectedDate),
      true
    );

    // Today - STRONG HIGHLIGHT
    if (dateStr === todayStr) {
      classes.push("today-highlight");
    }

    // Selected date - STRONG HIGHLIGHT
    if (dateStr === selectedDateStr) {
      classes.push("selected-highlight");
    }

    // Hover effect
    if (hoverDate) {
      const hoverDateStr = getDateString(
        normalizeDateForComparison(hoverDate),
        true
      );
      if (dateStr === hoverDateStr) {
        classes.push("date-hover");
      }
    }

    // Check if has tasks
    const hasTasks = tasks.some((task) => {
      if (!task.dueDate) return false;

      try {
        const taskDate = normalizeDateForComparison(task.dueDate);
        if (!taskDate) return false;

        const taskDateStr = getDateString(taskDate, true);
        return taskDateStr === dateStr;
      } catch (error) {
        console.log("Error checking task date:", error);
        return false;
      }
    });

    if (hasTasks) {
      classes.push("has-tasks");

      const dayTasks = tasks.filter((task) => {
        if (!task.dueDate) return false;

        try {
          const taskDate = normalizeDateForComparison(task.dueDate);
          if (!taskDate) return false;

          const taskDateStr = getDateString(taskDate, true);
          return taskDateStr === dateStr;
        } catch (error) {
          console.log("Error checking task date:", error);
          return false;
        }
      });

      const allCompleted = dayTasks.every((t) => t.completed);
      const hasRecurring = dayTasks.some((t) => t.recurring?.isRecurring);
      const hasOverdue = dayTasks.some((t) => {
        if (!t.dueDate || t.completed) return false;
        const taskDate = normalizeDateForComparison(t.dueDate);
        const today = normalizeDateForComparison(new Date());
        return taskDate && today && taskDate < today;
      });

      if (allCompleted) classes.push("all-completed");
      if (hasRecurring) classes.push("has-recurring");
      if (hasOverdue) classes.push("has-overdue");
    }

    return classes.join(" ");
  };

  // Handle date hover
  const handleDateHover = (date) => {
    setHoverDate(date);
  };

  // Handle date leave
  const handleDateLeave = () => {
    setHoverDate(null);
  };

  // Get current month name
  const getCurrentMonthName = () => {
    return months.find((m) => m.id === currentMonth)?.shortName || "Tháng";
  };

  // Handle active start date change in calendar
  const handleActiveStartDateChange = ({ activeStartDate }) => {
    if (activeStartDate) {
      const newMonth = activeStartDate.getMonth() + 1;
      const newYear = activeStartDate.getFullYear();
      if (newMonth !== currentMonth || newYear !== currentYear) {
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);

        // Update selectedDate
        const newSelectedDate = new Date(
          newYear,
          newMonth - 1,
          Math.min(
            selectedDate.getDate(),
            new Date(newYear, newMonth, 0).getDate()
          )
        );

        setSelectedDate(newSelectedDate);
        fetchTasksForMonth(newMonth, newYear);
      }
    }
  };

  // Format time for display
  const formatTime = (timeObj) => {
    if (!timeObj || !timeObj.value) return "";
    const units = { minutes: "phút", hours: "giờ", days: "ngày" };
    return `${timeObj.value} ${units[timeObj.unit]}`;
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "#dc3545";
      case "high":
        return "#fd7e14";
      case "medium":
        return "#ffc107";
      case "low":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  // Get priority label
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case "urgent":
        return "🚨 Khẩn cấp";
      case "high":
        return "📈 Cao";
      case "medium":
        return "📊 Trung bình";
      case "low":
        return "📉 Thấp";
      default:
        return "📊 Trung bình";
    }
  };

  // Get status label
  const getStatusLabel = (status, completed) => {
    if (completed) return "✅ Hoàn thành";
    switch (status) {
      case "todo":
        return "📝 Cần làm";
      case "in_progress":
        return "🔄 Đang làm";
      case "review":
        return "👀 Cần review";
      case "done":
        return "✅ Hoàn thành";
      default:
        return "📝 Cần làm";
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";

      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      console.log("Error checking task date:", error);
      return "";
    }
  };

  // Create test task for today
  const _createTestTaskForToday = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const testTask = {
        title: "Test Task Today",
        dueDate: today.toISOString(),
        tags: [{ name: "test", color: "#ff7675" }],
        description: "Test task created for debugging calendar",
      };

      const res = await axios.post("/tasks", testTask, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchTasksForMonth(currentMonth, currentYear);
      console.log("✅ Test task created for today:", res.data);
      alert("✅ Test task created successfully!");
    } catch (error) {
      console.error("❌ Failed to create test task:", error);
      alert("❌ Failed to create test task");
    }
  };

  // Create test task for tomorrow
  const _createTestTaskForTomorrow = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const testTask = {
        title: "Test Task Tomorrow",
        dueDate: tomorrow.toISOString(),
        tags: [{ name: "test", color: "#74b9ff" }],
        description: "Test task for tomorrow",
      };

      const res = await axios.post("/tasks", testTask, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchTasksForMonth(currentMonth, currentYear);
      console.log("✅ Test task created for tomorrow:", res.data);
      alert("✅ Test task for tomorrow created successfully!");
    } catch (error) {
      console.error("❌ Failed to create test task:", error);
      alert("❌ Failed to create test task");
    }
  };

  // Manual refresh function
  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh triggered");
    setForceRefresh((prev) => prev + 1);
    fetchTasksForMonth(currentMonth, currentYear);

    setRefreshNotification({
      message: "🔄 Đang làm mới dữ liệu...",
      type: "info",
      timestamp: new Date(),
    });

    setTimeout(() => {
      setRefreshNotification(null);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="calendar-container">
        <div className="calendar-card">
          <div className="calendar-loading">
            <div className="loading-spinner"></div>
            <p>Đang tải lịch...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-card">
        {/* Refresh Notification */}
        {refreshNotification && (
          <div
            className={`refresh-notification ${refreshNotification.type}`}
            style={{
              marginBottom: "20px",
              padding: "12px 16px",
              borderRadius: "8px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "600",
              animation: "fadeInOut 3s ease-in-out",
              backgroundColor:
                refreshNotification.type === "success"
                  ? "rgba(40, 167, 69, 0.1)"
                  : refreshNotification.type === "info"
                  ? "rgba(0, 123, 255, 0.1)"
                  : "rgba(255, 193, 7, 0.1)",
              border: `1px solid ${
                refreshNotification.type === "success"
                  ? "rgba(40, 167, 69, 0.3)"
                  : refreshNotification.type === "info"
                  ? "rgba(0, 123, 255, 0.3)"
                  : "rgba(255, 193, 7, 0.3)"
              }`,
              color:
                refreshNotification.type === "success"
                  ? "#28a745"
                  : refreshNotification.type === "info"
                  ? "#007bff"
                  : "#ffc107",
            }}
          >
            {refreshNotification.message}
          </div>
        )}

        {/* Refresh Indicator */}
        {lastUpdate && (
          <div
            className="refresh-indicator"
            style={{
              textAlign: "center",
              marginBottom: "10px",
              fontSize: "12px",
              color: "#28a745",
              backgroundColor: "rgba(40, 167, 69, 0.1)",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid rgba(40, 167, 69, 0.3)",
            }}
          >
            🔄 Cập nhật lúc: {new Date(lastUpdate).toLocaleTimeString("vi-VN")}
            <button
              onClick={handleManualRefresh}
              style={{
                marginLeft: "10px",
                padding: "4px 8px",
                background: "transparent",
                border: "1px solid #28a745",
                borderRadius: "4px",
                color: "#28a745",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Làm mới
            </button>
          </div>
        )}

        {/* MINIMAL HEADER */}
        <div className="calendar-header-minimal">
          <div className="stats-row-animated">
            <div className="stat-card hover-lift">
              <div className="stat-number animate-count">{stats.total}</div>
              <div className="stat-label">Tổng task</div>
            </div>
            <div className="stat-card hover-lift">
              <div
                className="stat-number animate-count"
                style={{ color: "var(--success)" }}
              >
                {stats.completed}
              </div>
              <div className="stat-label">Hoàn thành</div>
            </div>
            <div className="stat-card hover-lift">
              <div
                className="stat-number animate-count"
                style={{ color: "var(--error)" }}
              >
                {stats.overdue}
              </div>
              <div className="stat-label">Trễ hạn</div>
            </div>
            <div className="stat-card hover-lift">
              <div
                className="stat-number animate-count"
                style={{ color: "#6c5ce7" }}
              >
                {stats.recurring}
              </div>
              <div className="stat-label">Lặp lại</div>
            </div>
          </div>
        </div>

        {/* ENHANCED CALENDAR CONTROLS */}
        <div className="calendar-controls-enhanced">
          <div className="control-group-left">
            <button className="today-btn" onClick={goToToday}>
              <span>📅</span> Hôm nay
            </button>
            <button
              onClick={goToPreviousYear}
              className="nav-btn year-nav-btn"
              title="Năm trước"
            >
              «
            </button>
          </div>

          <div className="control-group-center">
            <button
              onClick={goToPreviousMonth}
              className="nav-btn prev-btn"
              title="Tháng trước"
            >
              ‹
            </button>

            <div className="month-year-selectors">
              <div className="selector-wrapper">
                <button
                  ref={monthYearBtnRef}
                  onClick={() => setShowMonthYearPicker(!showMonthYearPicker)}
                  className="month-year-btn"
                >
                  {getCurrentMonthName()} {currentYear} ▼
                </button>
              </div>
            </div>

            <button
              onClick={goToNextMonth}
              className="nav-btn next-btn"
              title="Tháng sau"
            >
              ›
            </button>
          </div>

          <div className="control-group-right">
            <button
              onClick={goToNextYear}
              className="nav-btn year-nav-btn"
              title="Năm sau"
            >
              »
            </button>
          </div>
        </div>

        {/* MONTH/YEAR PICKER POPUP */}
        {showMonthYearPicker && (
          <div className="month-year-picker-popup" ref={pickerRef}>
            <div className="picker-header">
              <div className="picker-title">Chọn tháng và năm</div>
              <button
                className="picker-close-btn"
                onClick={() => setShowMonthYearPicker(false)}
              >
                ×
              </button>
            </div>

            <div className="picker-content">
              {/* Years Section */}
              <div className="years-section">
                <div className="years-grid">
                  {years.map((year) => (
                    <button
                      key={year}
                      className={`year-item ${
                        currentYear === year ? "active" : ""
                      }`}
                      onClick={() => selectYear(year)}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Months Section */}
              <div className="months-section">
                <div className="months-grid">
                  {months.map((month) => (
                    <button
                      key={month.id}
                      className={`month-item ${
                        currentMonth === month.id ? "active" : ""
                      }`}
                      onClick={() => selectMonth(month.id)}
                    >
                      {month.shortName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ENHANCED CALENDAR */}
        <div className="calendar-wrapper-animated">
          <Calendar
            onChange={handleDateSelect}
            value={selectedDate}
            className="calendar-modern"
            tileClassName={getTileClassName}
            tileContent={tileContent}
            showNavigation={false}
            onActiveStartDateChange={handleActiveStartDateChange}
            formatShortWeekday={(locale, date) => {
              const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
              return weekdays[date.getDay()];
            }}
            onClickDay={handleDateSelect}
            onMouseOver={(value) => {
              if (value instanceof Date) {
                handleDateHover(value);
              }
            }}
            onMouseOut={handleDateLeave}
          />
        </div>

        {/* HOVER DATE INFO */}
        {hoverDate && tasksForHoverDate.length > 0 && (
          <div className="hover-date-info">
            <div className="hover-date-header">
              <span className="hover-date-day">{hoverDate.getDate()}</span>
              <span className="hover-date-text">
                {hoverDate.toLocaleDateString("vi-VN", { weekday: "short" })}
              </span>
            </div>
            <div className="hover-tasks-count">
              {tasksForHoverDate.length} công việc
            </div>
          </div>
        )}

        {/* SELECTED DATE SIDEBAR */}
        <div className="tasks-sidebar-slide">
          <div className="selected-date-animated">
            <div className="date-large">{selectedDate.getDate()}</div>
            <div className="weekday-animated">
              {selectedDate.toLocaleDateString("vi-VN", { weekday: "long" })}
            </div>
            <div className="month-year">
              {selectedDate.toLocaleDateString("vi-VN", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          {tasksForSelectedDate.length > 0 ? (
            <div className="tasks-list-animated">
              <div className="task-summary">
                <div className="summary-item">
                  <span className="summary-label">Hoàn thành:</span>
                  <span className="summary-value completed-count">
                    {tasksForSelectedDate.filter((t) => t.completed).length}/
                    {tasksForSelectedDate.length}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Chưa hoàn thành:</span>
                  <span className="summary-value overdue-count">
                    {tasksForSelectedDate.filter((t) => !t.completed).length}
                  </span>
                </div>
              </div>

              <div className="tasks-header">
                <h4>Công việc trong ngày ({tasksForSelectedDate.length})</h4>
              </div>

              {tasksForSelectedDate.map((task, index) => (
                <div
                  key={task._id}
                  className={`task-card-modern ${
                    task.completed ? "completed" : ""
                  } ${expandedTasks[task._id] ? "expanded" : ""}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="task-header-modern">
                    <div
                      className={`task-checkbox ${
                        task.completed ? "checked" : ""
                      }`}
                      title={
                        task.completed ? "Đã hoàn thành" : "Chưa hoàn thành"
                      }
                    >
                      {task.completed ? "✓" : ""}
                    </div>
                    <div className="task-title-modern">
                      <h4 className="task-title-text">{task.title}</h4>
                      {task.recurring?.isRecurring && (
                        <span className="recurring-badge" title="Task lặp lại">
                          {" "}
                          🔄 Lặp lại
                        </span>
                      )}
                      {task.dueDate &&
                        new Date(task.dueDate) < new Date() &&
                        !task.completed && (
                          <span
                            className="overdue-indicator"
                            title="Task trễ hạn"
                          >
                            {" "}
                            ⚠️ Trễ hạn
                          </span>
                        )}
                    </div>
                    <button
                      className="expand-btn"
                      onClick={() => toggleTaskExpansion(task._id)}
                      title={expandedTasks[task._id] ? "Thu gọn" : "Mở rộng"}
                    >
                      {expandedTasks[task._id] ? "▲" : "▼"}
                    </button>
                  </div>

                  <div className="task-meta-modern">
                    <span
                      className="priority-badge"
                      style={{
                        backgroundColor: getPriorityColor(task.priority) + "20",
                        color: getPriorityColor(task.priority),
                        border: `1px solid ${getPriorityColor(task.priority)}`,
                      }}
                    >
                      {getPriorityLabel(task.priority)}
                    </span>

                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: task.completed
                          ? "#28a74520"
                          : "#6c757d20",
                        color: task.completed ? "#28a745" : "#6c757d",
                        border: `1px solid ${
                          task.completed ? "#28a745" : "#6c757d"
                        }`,
                      }}
                    >
                      {getStatusLabel(task.status, task.completed)}
                    </span>

                    {task.dueDate && (
                      <span className="time-badge">
                        ⏰{" "}
                        {new Date(task.dueDate).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}

                    {task.estimatedTime?.value && (
                      <span className="time-badge" title="Thời gian ước tính">
                        ⏱️ {formatTime(task.estimatedTime)}
                      </span>
                    )}
                  </div>

                  {/* Task Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="task-tags-section">
                      <div className="task-tags-mini">
                        {task.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="task-tag-mini"
                            style={{ backgroundColor: tag.color }}
                            title={tag.name}
                            aria-label={`Tag: ${tag.name}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expanded Task Details */}
                  {expandedTasks[task._id] && (
                    <div className="task-details-expanded">
                      {task.description && (
                        <div className="detail-section">
                          <strong>📄 Mô tả:</strong>
                          <p className="task-description">{task.description}</p>
                        </div>
                      )}

                      <div className="detail-grid">
                        {task.startDate && (
                          <div className="detail-item">
                            <strong>📅 Bắt đầu:</strong>
                            <span>{formatDate(task.startDate)}</span>
                          </div>
                        )}

                        {task.dueDate && (
                          <div className="detail-item">
                            <strong>⏰ Deadline:</strong>
                            <span
                              className={
                                task.dueDate &&
                                new Date(task.dueDate) < new Date() &&
                                !task.completed
                                  ? "overdue"
                                  : ""
                              }
                            >
                              {formatDate(task.dueDate)}
                              {task.dueDate &&
                                new Date(task.dueDate) < new Date() &&
                                !task.completed &&
                                " ⚠️"}
                            </span>
                          </div>
                        )}

                        {task.actualTime?.value && (
                          <div className="detail-item">
                            <strong>⏰ Thực tế:</strong>
                            <span>{formatTime(task.actualTime)}</span>
                          </div>
                        )}
                      </div>

                      {/* Checklist */}
                      {task.checklist && task.checklist.length > 0 && (
                        <div className="detail-section">
                          <strong>
                            ✅ Checklist (
                            {
                              task.checklist.filter((item) => item.completed)
                                .length
                            }
                            /{task.checklist.length}):
                          </strong>
                          <div className="checklist-items">
                            {task.checklist.map((item, idx) => (
                              <div key={idx} className="checklist-item">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  readOnly
                                />
                                <span
                                  className={item.completed ? "completed" : ""}
                                >
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Task Footer */}
                  <div className="task-footer">
                    <div className="task-progress">
                      {task.checklist && task.checklist.length > 0 ? (
                        <>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${
                                  (task.checklist.filter(
                                    (item) => item.completed
                                  ).length /
                                    task.checklist.length) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {
                              task.checklist.filter((item) => item.completed)
                                .length
                            }
                            /{task.checklist.length}
                          </span>
                        </>
                      ) : (
                        <span className="progress-text">
                          {task.completed ? "✅ Hoàn thành" : "⏳ Đang chờ"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-tasks-animated">
              <div className="empty-icon">📅</div>
              <h3>Không có công việc</h3>
              <p>
                Không có công việc nào cho ngày{" "}
                {selectedDate.toLocaleDateString("vi-VN")}
              </p>
              <div className="empty-subtext">
                {tasks.length > 0 ? (
                  <span>
                    Có {tasks.length} công việc trong tháng này, nhưng không có
                    vào ngày này.
                  </span>
                ) : (
                  <span>Hãy tạo công việc mới để bắt đầu!</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
