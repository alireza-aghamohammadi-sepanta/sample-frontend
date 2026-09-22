import React from 'react';
import { Todo } from '../types/todo';

export interface TaskListProps {
  todos: Todo[];
}

export const TaskList: React.FC<TaskListProps> = ({ todos }) => {
  return (
    <div
      data-testid="task-list"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      {todos.map((todo) => {
        const isCompleted = todo.is_completed;
        return (
          <div
            key={todo.id}
            data-testid={`todo-item-${todo.id}`}
            style={{
              padding: '1rem',
              borderRadius: '6px',
              border: '1px solid #e0e0e0',
              backgroundColor: isCompleted ? '#fafafa' : '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  color: isCompleted ? '#888' : '#222',
                }}
              >
                {todo.title}
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: isCompleted ? '#e6f4ea' : '#e8f0fe',
                  color: isCompleted ? '#137333' : '#1a73e8',
                  fontWeight: 500,
                }}
              >
                {isCompleted ? 'Completed' : 'Active'}
              </span>
            </div>
            {todo.description && (
              <p
                style={{
                  margin: '0.25rem 0 0 0',
                  color: '#666',
                  fontSize: '0.9rem',
                }}
              >
                {todo.description}
              </p>
            )}
            <div
              style={{
                fontSize: '0.75rem',
                color: '#999',
                marginTop: '0.25rem',
              }}
            >
              Created: {new Date(todo.created_at).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskList;
