import React from 'react';
import { FilterStatus } from '../types/todo';

export interface TaskFilterProps {
  currentFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
}

export const TaskFilter: React.FC<TaskFilterProps> = ({
  currentFilter,
  onFilterChange,
}) => {
  const tabs: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <div
      aria-label="Filter tasks"
      style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}
    >
      {tabs.map((tab) => {
        const isActive = currentFilter === tab.value;
        return (
          <button
            key={tab.value}
            aria-pressed={isActive}
            data-testid={`filter-${tab.value}`}
            onClick={() => onFilterChange(tab.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: isActive ? '2px solid #0056b3' : '1px solid #ccc',
              backgroundColor: isActive ? '#007bff' : '#f8f9fa',
              color: isActive ? '#fff' : '#333',
              fontWeight: isActive ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default TaskFilter;
