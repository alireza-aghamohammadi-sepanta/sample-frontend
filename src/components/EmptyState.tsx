import React from 'react';
import { FilterStatus } from '../types/todo';

export interface EmptyStateProps {
  filter?: FilterStatus;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ filter, message }) => {
  let defaultMessage = 'No tasks found.';
  if (filter === 'active') {
    defaultMessage = 'No active tasks found. No tasks match the selected filter.';
  } else if (filter === 'completed') {
    defaultMessage = 'No completed tasks found. No tasks match the selected filter.';
  } else {
    defaultMessage = 'No tasks found.';
  }

  return (
    <div
      data-testid="empty-state"
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px dashed #ccc',
        color: '#666',
        margin: '1rem 0',
      }}
    >
      <p style={{ fontSize: '1.1rem', margin: 0 }}>
        {message || defaultMessage}
      </p>
    </div>
  );
};

export default EmptyState;
