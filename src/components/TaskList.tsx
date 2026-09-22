import React from 'react';
import { Todo } from '../types/todo';
import TaskItem from './TaskItem';

export interface TaskListProps {
  todos: Todo[];
  onToggle?: (updatedTodo: Todo) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ todos, onToggle }) => {
  return (
    <div
      data-testid="task-list"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      {todos.map((todo) => (
        <TaskItem key={todo.id} todo={todo} onToggle={onToggle} />
      ))}
    </div>
  );
};

export default TaskList;
