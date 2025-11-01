export default function TaskList({ tasks, onToggle, onDelete }) {
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task._id}>
          <span
            style={{
              textDecoration: task.completed ? 'line-through' : 'none',
              cursor: 'pointer',
            }}
            onClick={() => onToggle(task._id, task.completed)}
          >
            {task.title}
          </span>
          <button onClick={() => onDelete(task._id)}>❌</button>
        </li>
      ))}
    </ul>
  );
}
