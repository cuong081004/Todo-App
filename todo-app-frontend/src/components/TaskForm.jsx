import { useState } from 'react';

export default function TaskForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(''); // Thêm state cho ngày

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Gửi cả title và dueDate lên component cha
    onAdd({
      title: title.trim(),
      dueDate: dueDate || null, // Nếu không chọn ngày → null
    });

    // Reset form
    setTitle('');
    setDueDate('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <input
        type="text"
        placeholder="Thêm công việc..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ flex: 1, padding: '8px', fontSize: '16px' }}
      />

      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        style={{ padding: '8px', fontSize: '16px' }}
      />

      <button
        type="submit"
        style={{
          padding: '8px 16px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Thêm
      </button>
    </form>
  );
}