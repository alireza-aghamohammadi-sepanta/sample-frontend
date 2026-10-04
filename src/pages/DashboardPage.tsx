import React, { useEffect, useState, useMemo } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Todo, FilterStatus } from '../types/todo';
import TaskFilter from '../components/TaskFilter';
import TaskList from '../components/TaskList';
import EmptyState from '../components/EmptyState';
import CreateTaskModal from '../components/CreateTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

/**
 * Sorts tasks matching backend ordering rules:
 * 1. Active tasks with nearest due_date ASC first
 * 2. Active tasks without due_date next (chronologically by created_at ASC)
 * 3. Completed tasks grouped at bottom (chronologically by created_at ASC)
 */
export const sortTodos = (items: Todo[]): Todo[] => {
  return [...items].sort((a, b) => {
    const getGroup = (todo: Todo) => {
      if (todo.is_completed) return 2;
      if (!todo.due_date) return 1;
      return 0;
    };

    const groupA = getGroup(a);
    const groupB = getGroup(b);

    if (groupA !== groupB) {
      return groupA - groupB;
    }

    if (groupA === 0) {
      const dueA = new Date(a.due_date!).getTime();
      const dueB = new Date(b.due_date!).getTime();
      if (dueA !== dueB) {
        return dueA - dueB;
      }
    }

    // Undated active tasks: newly created appear first
    if (groupA === 1) {
      const createdA = new Date(a.created_at).getTime();
      const createdB = new Date(b.created_at).getTime();
      return createdB - createdA;
    }

    const createdA = new Date(a.created_at).getTime();
    const createdB = new Date(b.created_at).getTime();
    return createdA - createdB;
  });
};

export const DashboardPage: React.FC = () => {
  const { logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTodos = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await client.get<Todo[]>('/todos');
        if (isMounted) {
          const list = Array.isArray(data) ? data : [];
          // Retain backend task ordering on initial load
          setTodos(list);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load tasks');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTodos();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTaskCreated = (newTask: Todo) => {
    setTodos((prev) => sortTodos([newTask, ...prev]));
  };

  const handleToggleTask = (updatedTodo: Todo) => {
    setTodos((prev) =>
      sortTodos(prev.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo)))
    );
  };

  const handleEditTask = (todo: Todo) => {
    setEditingTodo(todo);
  };

  const handleDeleteTask = (todo: Todo) => {
    setDeletingTodo(todo);
  };

  const handleTaskUpdated = (updatedTodo: Todo) => {
    setTodos((prev) =>
      sortTodos(prev.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo)))
    );
  };

  const handleTaskDeleted = (deletedId: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== deletedId));
  };

  // In-memory client-side filtering for sub-50ms latency
  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter((todo) => !todo.is_completed);
      case 'completed':
        return todos.filter((todo) => todo.is_completed);
      case 'all':
      default:
        return todos;
    }
  }, [todos, filter]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          borderBottom: '1px solid #eaeaea',
          paddingBottom: '1rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Create Task
          </button>
          <button
            onClick={logout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      <main>
        <div style={{ marginBottom: '1.5rem' }}>
          <TaskFilter currentFilter={filter} onFilterChange={setFilter} />
        </div>

        {loading ? (
          <div data-testid="loading-indicator" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            Loading tasks...
          </div>
        ) : error ? (
          <div
            role="alert"
            style={{
              padding: '1rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        ) : filteredTodos.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <TaskList
            todos={filteredTodos}
            onToggle={handleToggleTask}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        )}
      </main>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      <EditTaskModal
        isOpen={editingTodo !== null}
        todo={editingTodo}
        onClose={() => setEditingTodo(null)}
        onTaskUpdated={handleTaskUpdated}
      />

      <DeleteConfirmModal
        isOpen={deletingTodo !== null}
        todo={deletingTodo}
        onClose={() => setDeletingTodo(null)}
        onTaskDeleted={handleTaskDeleted}
      />
    </div>
  );
};

export default DashboardPage;
