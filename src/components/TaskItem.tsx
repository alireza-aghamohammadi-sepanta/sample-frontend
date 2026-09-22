import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Todo } from '../types/todo';

export interface TaskItemProps {
  todo: Todo;
  onToggle?: (updatedTodo: Todo) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ todo, onToggle }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    setOptimisticCompleted(null);
  }, [todo.is_completed]);

  const isCompleted =
    optimisticCompleted !== null ? optimisticCompleted : todo.is_completed;

  const handleToggle = async () => {
    if (isUpdating) return;
    const nextCompleted = !isCompleted;
    setOptimisticCompleted(nextCompleted);
    setIsUpdating(true);

    try {
      const updated = await client.patch<Todo>(`/todos/${todo.id}`, {
        is_completed: nextCompleted,
      });
      if (onToggle) {
        onToggle(updated);
      }
    } catch (err) {
      // Revert optimistic update on failure
      setOptimisticCompleted(todo.is_completed);
      console.error('Failed to update task completion:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="checkbox"
            id={`checkbox-${todo.id}`}
            data-testid={`todo-checkbox-${todo.id}`}
            aria-label={`Toggle task "${todo.title}"`}
            checked={isCompleted}
            onChange={handleToggle}
            disabled={isUpdating}
            style={{
              width: '1.1rem',
              height: '1.1rem',
              cursor: isUpdating ? 'wait' : 'pointer',
            }}
          />
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
        </div>
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
            paddingLeft: '1.85rem',
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
          paddingLeft: '1.85rem',
        }}
      >
        Created: {new Date(todo.created_at).toLocaleString()}
      </div>
    </div>
  );
};

export default TaskItem;
