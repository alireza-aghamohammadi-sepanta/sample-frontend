import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Todo } from '../types/todo';
import AttachmentChip from './AttachmentChip';

export interface TaskItemProps {
  todo: Todo;
  onToggle?: (updatedTodo: Todo) => void;
  onEdit?: (todo: Todo) => void;
  onDelete?: (todo: Todo) => void;
}

export function getLocalTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDueDateString(dueDate?: string | null): string | null {
  if (!dueDate) return null;
  const trimmed = dueDate.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    return trimmed.split('T')[0];
  }
  return trimmed.slice(0, 10);
}

export type DeadlineUrgency = 'overdue' | 'today' | 'upcoming' | null;

export function getDeadlineUrgency(
  dueDate?: string | null,
  isCompleted?: boolean,
  currentDateStr?: string
): DeadlineUrgency {
  if (isCompleted) {
    return null;
  }
  const dueStr = getDueDateString(dueDate);
  if (!dueStr) {
    return null;
  }
  const todayStr = currentDateStr || getLocalTodayString();
  if (dueStr < todayStr) {
    return 'overdue';
  }
  if (dueStr === todayStr) {
    return 'today';
  }
  return 'upcoming';
}

export const TaskItem: React.FC<TaskItemProps> = ({
  todo,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    setOptimisticCompleted(null);
  }, [todo.is_completed]);

  const isCompleted =
    optimisticCompleted !== null ? optimisticCompleted : todo.is_completed;

  const urgency = getDeadlineUrgency(todo.due_date, isCompleted);
  const dueStr = getDueDateString(todo.due_date);

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
          flexWrap: 'wrap',
          gap: '0.5rem',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isCompleted && urgency === 'overdue' && (
            <span
              data-testid={`deadline-badge-${todo.id}`}
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: '#fef2f2',
                color: '#DC2626',
                border: '1px solid #fecaca',
                fontWeight: 500,
              }}
            >
              Overdue
            </span>
          )}
          {!isCompleted && urgency === 'today' && (
            <span
              data-testid={`deadline-badge-${todo.id}`}
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: '#fffbeb',
                color: '#D97706',
                border: '1px solid #fde68a',
                fontWeight: 500,
              }}
            >
              Due Today
            </span>
          )}
          {!isCompleted && urgency === 'upcoming' && (
            <span
              data-testid={`deadline-badge-${todo.id}`}
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: '#f8fafc',
                color: '#64748B',
                border: '1px solid #e2e8f0',
                fontWeight: 500,
              }}
            >
              Due: {dueStr}
            </span>
          )}
          <span
            data-testid={`status-badge-${todo.id}`}
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: isCompleted ? '#ecfdf5' : '#e8f0fe',
              color: isCompleted ? '#059669' : '#1a73e8',
              border: isCompleted ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
              fontWeight: 500,
            }}
          >
            {isCompleted ? 'Completed' : 'Active'}
          </span>
          <button
            type="button"
            onClick={() => onEdit?.(todo)}
            data-testid={`edit-task-${todo.id}`}
            aria-label="Edit task"
            style={{
              padding: '0.25rem 0.6rem',
              fontSize: '0.8rem',
              backgroundColor: '#f1f3f5',
              color: '#495057',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(todo)}
            data-testid={`delete-task-${todo.id}`}
            aria-label="Delete task"
            style={{
              padding: '0.25rem 0.6rem',
              fontSize: '0.8rem',
              backgroundColor: '#fff5f5',
              color: '#e03131',
              border: '1px solid #ffc9c9',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Delete
          </button>
        </div>
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
      {todo.assets && todo.assets.length > 0 && (
        <div
          data-testid={`todo-assets-${todo.id}`}
          style={{
            paddingLeft: '1.85rem',
            marginTop: '0.35rem',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: '#666',
              marginBottom: '0.35rem',
            }}
          >
            {todo.assets.length} attached {todo.assets.length === 1 ? 'asset' : 'assets'}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            {todo.assets.map((asset) => (
              <AttachmentChip key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
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
