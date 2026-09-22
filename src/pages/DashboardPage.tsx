import React, { useEffect, useState, useMemo } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Todo, FilterStatus } from '../types/todo';
import TaskFilter from '../components/TaskFilter';
import TaskList from '../components/TaskList';
import EmptyState from '../components/EmptyState';
import CreateTaskModal from '../components/CreateTaskModal';

export const DashboardPage: React.FC = () => {
  const { logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchTodos = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await client.get<Todo[]>('/todos');
        if (isMounted) {
          const list = Array.isArray(data) ? data : [];
          // Ensure chronological ordering by created_at ascending
          const sorted = [...list].sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setTodos(sorted);
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
    setTodos((prev) => [newTask, ...prev]);
  };

  const handleToggleTask = (updatedTodo: Todo) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
    );
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
          <TaskList todos={filteredTodos} onToggle={handleToggleTask} />
        )}
      </main>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
};

export default DashboardPage;
