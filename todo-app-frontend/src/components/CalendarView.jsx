import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useState } from 'react';

export default function CalendarView({ tasks }) {
  const [date, setDate] = useState(new Date());

  // 👉 Chuẩn hóa ngày theo định dạng YYYY-MM-DD (loại bỏ phần giờ)
  const formatDate = (d) => {
    const date = new Date(d);
    // Nếu muốn bù múi giờ VN (+7), bỏ comment dòng dưới:
    // date.setHours(date.getHours() + 7);
    return date.toISOString().split('T')[0];
  };

  // Lọc công việc theo ngày được chọn
  const tasksForDay = tasks.filter(
    (t) => t.dueDate && formatDate(t.dueDate) === formatDate(date)
  );

  return (
    <div className="calendar-view">
      <Calendar onChange={setDate} value={date} locale="vi-VN" />
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
