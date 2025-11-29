import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useState, useMemo } from "react";
import "./CalendarView.css";

// Hàm format ngày để hiển thị
const formatDisplayDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Hàm so sánh ngày không phụ thuộc timezone
const isSameDate = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export default function CalendarView({ tasks }) {
  const [date, setDate] = useState(new Date());

  // Lọc task theo ngày được chọn
  const tasksForDay = useMemo(
    () =>
      tasks.filter(
        (t) => t.dueDate && isSameDate(t.dueDate, date)
      ),
    [tasks, date]
  );

  const handleDateChange = (newDate) => {
    setDate(newDate);
  };

  // Hàm kiểm tra ngày có task (cho tileClassName)
  const getTileClassName = ({ date: tileDate, view }) => {
    const classes = [];

    if (view !== "month") return classes;

    // Ngày hiện tại
    const today = new Date();
    if (
      tileDate.getDate() === today.getDate() &&
      tileDate.getMonth() === today.getMonth() &&
      tileDate.getFullYear() === today.getFullYear()
    ) {
      classes.push("current-day");
    }

    // Ngày được chọn (selected date)
    if (
      tileDate.getDate() === date.getDate() &&
      tileDate.getMonth() === date.getMonth() &&
      tileDate.getFullYear() === date.getFullYear()
    ) {
      classes.push("selected-day");
    }

    // Ngày có task
    const hasTask = tasks.some(
      (t) => t.dueDate && isSameDate(t.dueDate, tileDate)
    );
    if (hasTask) {
      classes.push("has-task");
    }

    return classes.join(" ");
  };

  return (
    <div className="calendar-container">
      <div className="calendar-card">
        <h3 className="calendar-title">📅 Lịch công việc</h3>

        <div className="calendar-wrapper">
          <Calendar
            onChange={handleDateChange}
            value={date}
            locale="vi-VN"
            className="custom-calendar"
            tileClassName={getTileClassName}
          />
        </div>

        <div className="calendar-details">
          <h4 className="selected-date">
            Công việc ngày {formatDisplayDate(date)}:
          </h4>

          {tasksForDay.length > 0 ? (
            <ul className="task-list-for-day">
              {tasksForDay.map((t) => (
                <li key={t._id} className="task-day-item">
                  <span
                    className={`task-status ${
                      t.completed ? "completed" : "pending"
                    }`}
                  >
                    {t.completed ? "✅" : "⏳"}
                  </span>
                  <span className="task-title-day">{t.title}</span>
                  {t.dueDate && (
                    <span className="task-date-small">
                      ({formatDisplayDate(new Date(t.dueDate))})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-tasks-message">Không có công việc nào</p>
          )}
        </div>
      </div>
    </div>
  );
}