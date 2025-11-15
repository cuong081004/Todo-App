import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useState } from 'react';

// Hàm chuẩn hoá ngày (YYYY-MM-DD)
const formatDate = (d) => {
  const date = new Date(d);
  return date.toISOString().split('T')[0];
};

export default function CalendarView({ tasks }) {
  const [date, setDate] = useState(new Date());

  // Lọc task theo ngày được chọn
  const tasksForDay = tasks.filter(
    (t) => t.dueDate && formatDate(t.dueDate) === formatDate(date)
  );

  return (
    <div className="calendar-view">
      <Calendar
        onChange={setDate}
        value={date}
        locale="vi-VN"
        tileClassName={({ date }) => {
          // Nếu ngày này có task → trả về class CSS "has-task"
          const hasTask = tasks.some(
            (t) => t.dueDate && formatDate(t.dueDate) === formatDate(date)
          );
          return hasTask ? 'has-task' : '';
        }}
      />

      <h3 style={{ marginTop: '15px' }}>
        Công việc ngày {date.toLocaleDateString('vi-VN')}:
      </h3>

      {tasksForDay.length > 0 ? (
        <ul>
          {tasksForDay.map((t) => (
            <li key={t._id}>
              {t.title} {t.completed ? '✅' : '❌'}
            </li>
          ))}
        </ul>
      ) : (
        <p>Không có công việc</p>
      )}
    </div>
  );
}
