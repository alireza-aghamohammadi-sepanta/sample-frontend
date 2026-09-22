import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { TOKEN_KEY } from '../src/api/client';
import DashboardPage from '../src/pages/DashboardPage';
import { AuthProvider } from '../src/context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

const mockTodos = [
  {
    id: 'todo-1',
    user_id: 'user-1',
    title: 'First task (Active)',
    description: 'First task description',
    is_completed: false,
    created_at: '2026-01-01T10:00:00.000Z',
    updated_at: '2026-01-01T10:00:00.000Z',
    assets: [],
  },
  {
    id: 'todo-2',
    user_id: 'user-1',
    title: 'Second task (Completed)',
    description: 'Second task description',
    is_completed: true,
    created_at: '2026-01-02T12:00:00.000Z',
    updated_at: '2026-01-02T15:00:00.000Z',
    assets: [],
  },
  {
    id: 'todo-3',
    user_id: 'user-1',
    title: 'Third task (Active)',
    description: null,
    is_completed: false,
    created_at: '2026-01-03T09:00:00.000Z',
    updated_at: '2026-01-03T09:00:00.000Z',
    assets: [],
  },
];

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Task Dashboard, Chronological Listing, and Status Filtering', () => {
  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'test-auth-token');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // R2 AC-1: Chronological listing on load
  it('fetches tasks via GET /todos and renders them in chronological order on load', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockTodos,
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    // Verify GET /todos is called
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/todos$/),
        expect.objectContaining({ method: 'GET' })
      );
    });

    // Verify all items are rendered
    expect(await screen.findByText('First task (Active)')).toBeInTheDocument();
    expect(screen.getByText('Second task (Completed)')).toBeInTheDocument();
    expect(screen.getByText('Third task (Active)')).toBeInTheDocument();

    // Verify chronological order (first created appears first in DOM)
    const taskTitles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
    expect(taskTitles).toEqual([
      'First task (Active)',
      'Second task (Completed)',
      'Third task (Active)',
    ]);
  });

  // R2 AC-2: Filtering active tasks (sub-50ms client-side latency)
  it('filters active tasks in-memory when Active tab is selected', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockTodos,
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('First task (Active)')).toBeInTheDocument();
    expect(screen.getByText('Second task (Completed)')).toBeInTheDocument();

    const initialFetchCount = fetchMock.mock.calls.length;

    // Click "Active" tab
    const activeTab = screen.getByRole('button', { name: /^active$/i });
    await userEvent.click(activeTab);

    // Active tasks should remain visible, completed tasks should disappear
    expect(screen.getByText('First task (Active)')).toBeInTheDocument();
    expect(screen.getByText('Third task (Active)')).toBeInTheDocument();
    expect(screen.queryByText('Second task (Completed)')).not.toBeInTheDocument();

    // In-memory requirement: no additional network request made
    expect(fetchMock.mock.calls.length).toBe(initialFetchCount);
  });

  // R2 AC-3: Filtering completed tasks with strikethrough styling
  it('filters completed tasks and applies strikethrough styling to completed task titles', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockTodos,
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('First task (Active)')).toBeInTheDocument();

    // Click "Completed" tab
    const completedTab = screen.getByRole('button', { name: /^completed$/i });
    await userEvent.click(completedTab);

    // Only completed task should be displayed
    const completedTitle = screen.getByText('Second task (Completed)');
    expect(completedTitle).toBeInTheDocument();
    expect(screen.queryByText('First task (Active)')).not.toBeInTheDocument();
    expect(screen.queryByText('Third task (Active)')).not.toBeInTheDocument();

    // Strikethrough styling requirement on completed task titles
    expect(completedTitle).toHaveStyle({ textDecoration: 'line-through' });

    // Switch back to "All" tab to verify "All" tab works and strikethrough is maintained
    const allTab = screen.getByRole('button', { name: /^all$/i });
    await userEvent.click(allTab);

    expect(screen.getByText('First task (Active)')).toBeInTheDocument();
    expect(screen.getByText('Second task (Completed)')).toBeInTheDocument();
    expect(screen.getByText('Second task (Completed)')).toHaveStyle({
      textDecoration: 'line-through',
    });
    // Active task title should NOT have line-through
    expect(screen.getByText('First task (Active)')).not.toHaveStyle({
      textDecoration: 'line-through',
    });
  });

  // R2 AC-4: Dedicated empty state when no tasks match
  it('displays empty state view when no tasks exist or no tasks match the filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [
        {
          id: 'todo-1',
          user_id: 'user-1',
          title: 'Only Active Task',
          description: null,
          is_completed: false,
          created_at: '2026-01-01T10:00:00.000Z',
          updated_at: '2026-01-01T10:00:00.000Z',
          assets: [],
        },
      ],
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('Only Active Task')).toBeInTheDocument();

    // Switch to "Completed" tab where there are 0 matching tasks
    const completedTab = screen.getByRole('button', { name: /^completed$/i });
    await userEvent.click(completedTab);

    // Empty state should be visible
    expect(
      screen.getByText(/no tasks found|no tasks match|no completed tasks/i)
    ).toBeInTheDocument();

    // Switch to "Active" tab - task appears again, empty state disappears
    const activeTab = screen.getByRole('button', { name: /^active$/i });
    await userEvent.click(activeTab);
    expect(screen.getByText('Only Active Task')).toBeInTheDocument();
    expect(
      screen.queryByText(/no tasks found|no tasks match|no completed tasks/i)
    ).not.toBeInTheDocument();
  });

  // Entirely empty list on load
  it('displays empty state view when task list is completely empty on initial load', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [],
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(
      await screen.findByText(/no tasks found|no tasks match/i)
    ).toBeInTheDocument();
  });

  // Route integration with App
  it('renders DashboardPage at route / within ProtectedRoute in App', async () => {
    window.history.pushState({}, 'Dashboard', '/');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockTodos,
    });
    globalThis.fetch = fetchMock;

    render(<App />);

    expect(await screen.findByText('First task (Active)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
  });
});
