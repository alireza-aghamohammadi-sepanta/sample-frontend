import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { TOKEN_KEY } from '../src/api/client';
import DashboardPage from '../src/pages/DashboardPage';
import { AuthProvider } from '../src/context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { Todo } from '../src/types/todo';

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

describe('Dashboard Deadline-Aware Ordering Preservation (T4 / AC-1 & AC-2)', () => {
  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'test-auth-token');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const deadlineSortedTodos: Todo[] = [
    {
      id: 'task-active-soon',
      user_id: 'user-1',
      title: 'Active Task Due Soon',
      description: null,
      due_date: '2026-10-10T12:00:00.000Z',
      is_completed: false,
      created_at: '2026-01-05T10:00:00.000Z',
      updated_at: '2026-01-05T10:00:00.000Z',
      assets: [],
    },
    {
      id: 'task-active-later',
      user_id: 'user-1',
      title: 'Active Task Due Later',
      description: null,
      due_date: '2026-10-20T12:00:00.000Z',
      is_completed: false,
      created_at: '2026-01-02T10:00:00.000Z',
      updated_at: '2026-01-02T10:00:00.000Z',
      assets: [],
    },
    {
      id: 'task-active-undated',
      user_id: 'user-1',
      title: 'Active Task Undated',
      description: null,
      due_date: null,
      is_completed: false,
      created_at: '2026-01-03T10:00:00.000Z',
      updated_at: '2026-01-03T10:00:00.000Z',
      assets: [],
    },
    {
      id: 'task-completed-old',
      user_id: 'user-1',
      title: 'Completed Task Early Created',
      description: null,
      due_date: '2026-10-01T12:00:00.000Z',
      is_completed: true,
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
      assets: [],
    },
    {
      id: 'task-completed-new',
      user_id: 'user-1',
      title: 'Completed Task Late Created',
      description: null,
      due_date: null,
      is_completed: true,
      created_at: '2026-01-04T10:00:00.000Z',
      updated_at: '2026-01-04T10:00:00.000Z',
      assets: [],
    },
  ];

  it('preserves backend deadline ordering on initial fetch without overriding by created_at', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => deadlineSortedTodos,
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('Active Task Due Soon')).toBeInTheDocument();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
    expect(titles).toEqual([
      'Active Task Due Soon',
      'Active Task Due Later',
      'Active Task Undated',
      'Completed Task Early Created',
      'Completed Task Late Created',
    ]);
  });

  it('maintains deadline-aware ordering when a new task with deadline is created', async () => {
    const initialList: Todo[] = [
      {
        id: 't-1',
        user_id: 'u-1',
        title: 'Task Due Oct 10',
        description: null,
        due_date: '2026-10-10',
        is_completed: false,
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-01-01T10:00:00.000Z',
        assets: [],
      },
      {
        id: 't-2',
        user_id: 'u-1',
        title: 'Task Due Oct 25',
        description: null,
        due_date: '2026-10-25',
        is_completed: false,
        created_at: '2026-01-02T10:00:00.000Z',
        updated_at: '2026-01-02T10:00:00.000Z',
        assets: [],
      },
      {
        id: 't-3',
        user_id: 'u-1',
        title: 'Task Completed',
        description: null,
        due_date: null,
        is_completed: true,
        created_at: '2026-01-03T10:00:00.000Z',
        updated_at: '2026-01-03T10:00:00.000Z',
        assets: [],
      },
    ];

    const newTask: Todo = {
      id: 't-new',
      user_id: 'u-1',
      title: 'Task Due Oct 15',
      description: null,
      due_date: '2026-10-15',
      is_completed: false,
      created_at: '2026-01-04T10:00:00.000Z',
      updated_at: '2026-01-04T10:00:00.000Z',
      assets: [],
    };

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/todos') && init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => [...initialList],
        });
      }
      if (urlStr.endsWith('/todos') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => newTask,
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('Task Due Oct 10')).toBeInTheDocument();

    const openBtn = screen.getByRole('button', { name: /create task/i });
    await userEvent.click(openBtn);

    const modal = screen.getByRole('dialog');
    const titleInput = within(modal).getByLabelText(/title/i);
    const dateInput = within(modal).getByLabelText(/due date/i);
    const submitBtn = within(modal).getByRole('button', { name: /create task/i });

    await userEvent.type(titleInput, 'Task Due Oct 15');
    fireEvent.change(dateInput, { target: { value: '2026-10-15' } });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(await screen.findByText('Task Due Oct 15')).toBeInTheDocument();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
    // Oct 15 belongs between Oct 10 and Oct 25, completed remains at bottom
    expect(titles).toEqual([
      'Task Due Oct 10',
      'Task Due Oct 15',
      'Task Due Oct 25',
      'Task Completed',
    ]);
  });

  it('maintains deadline-aware ordering when an undated task is created', async () => {
    const initialList: Todo[] = [
      {
        id: 't-1',
        user_id: 'u-1',
        title: 'Task Due Oct 10',
        description: null,
        due_date: '2026-10-10',
        is_completed: false,
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-01-01T10:00:00.000Z',
        assets: [],
      },
      {
        id: 't-2',
        user_id: 'u-1',
        title: 'Task Completed',
        description: null,
        due_date: null,
        is_completed: true,
        created_at: '2026-01-02T10:00:00.000Z',
        updated_at: '2026-01-02T10:00:00.000Z',
        assets: [],
      },
    ];

    const newTask: Todo = {
      id: 't-undated',
      user_id: 'u-1',
      title: 'New Undated Task',
      description: null,
      due_date: null,
      is_completed: false,
      created_at: '2026-01-03T10:00:00.000Z',
      updated_at: '2026-01-03T10:00:00.000Z',
      assets: [],
    };

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/todos') && init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => [...initialList],
        });
      }
      if (urlStr.endsWith('/todos') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => newTask,
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('Task Due Oct 10')).toBeInTheDocument();

    const openBtn = screen.getByRole('button', { name: /create task/i });
    await userEvent.click(openBtn);

    const modal = screen.getByRole('dialog');
    const titleInput = within(modal).getByLabelText(/title/i);
    const submitBtn = within(modal).getByRole('button', { name: /create task/i });

    await userEvent.type(titleInput, 'New Undated Task');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(await screen.findByText('New Undated Task')).toBeInTheDocument();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
    // Undated task must follow active tasks with deadlines, before completed tasks
    expect(titles).toEqual([
      'Task Due Oct 10',
      'New Undated Task',
      'Task Completed',
    ]);
  });

  it('maintains ordering when an active task is marked completed, moving it to bottom', async () => {
    const initialList: Todo[] = [
      {
        id: 't-1',
        user_id: 'u-1',
        title: 'Task 1 Due Soon',
        description: null,
        due_date: '2026-10-10',
        is_completed: false,
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-01-01T10:00:00.000Z',
        assets: [],
      },
      {
        id: 't-2',
        user_id: 'u-1',
        title: 'Task 2 Due Later',
        description: null,
        due_date: '2026-10-20',
        is_completed: false,
        created_at: '2026-01-02T10:00:00.000Z',
        updated_at: '2026-01-02T10:00:00.000Z',
        assets: [],
      },
      {
        id: 't-3',
        user_id: 'u-1',
        title: 'Task 3 Completed',
        description: null,
        due_date: null,
        is_completed: true,
        created_at: '2026-01-03T10:00:00.000Z',
        updated_at: '2026-01-03T10:00:00.000Z',
        assets: [],
      },
    ];

    const completedT1: Todo = {
      ...initialList[0],
      is_completed: true,
      updated_at: '2026-01-04T10:00:00.000Z',
    };

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/todos') && init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => [...initialList],
        });
      }
      if (urlStr.endsWith('/todos/t-1') && init?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => completedT1,
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('Task 1 Due Soon')).toBeInTheDocument();

    const t1Item = screen.getByTestId('todo-item-t-1');
    const checkbox = t1Item.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await userEvent.click(checkbox);

    await waitFor(() => {
      const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
      // Task 2 should now be first, Task 1 moved down to completed section
      expect(titles[0]).toBe('Task 2 Due Later');
    });

    const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
    expect(titles).toEqual([
      'Task 2 Due Later',
      'Task 1 Due Soon',
      'Task 3 Completed',
    ]);
  });

  it('maintains ordering when completed task is marked active, moving it to active position', async () => {
    const initialList: Todo[] = [
      {
        id: 't-active',
        user_id: 'u-1',
        title: 'Task Active Due Oct 20',
        description: null,
        due_date: '2026-10-20',
        is_completed: false,
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-01-01T10:00:00.000Z',
        assets: [],
      },
      {
        id: 't-completed',
        user_id: 'u-1',
        title: 'Task Reactivated Due Oct 10',
        description: null,
        due_date: '2026-10-10',
        is_completed: true,
        created_at: '2026-01-02T10:00:00.000Z',
        updated_at: '2026-01-02T10:00:00.000Z',
        assets: [],
      },
    ];

    const reactivated: Todo = {
      ...initialList[1],
      is_completed: false,
      updated_at: '2026-01-04T10:00:00.000Z',
    };

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/todos') && init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => [...initialList],
        });
      }
      if (urlStr.endsWith('/todos/t-completed') && init?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => reactivated,
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('Task Reactivated Due Oct 10')).toBeInTheDocument();

    const completedItem = screen.getByTestId('todo-item-t-completed');
    const checkbox = completedItem.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await userEvent.click(checkbox);

    await waitFor(() => {
      const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
      expect(titles[0]).toBe('Task Reactivated Due Oct 10');
    });

    const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
    expect(titles).toEqual([
      'Task Reactivated Due Oct 10',
      'Task Active Due Oct 20',
    ]);
  });

  it('maintains ordering when task deadline is updated via edit', async () => {
    const initialList: Todo[] = [
      {
        id: 't-1',
        user_id: 'u-1',
        title: 'Task A (Due Oct 15)',
        description: null,
        due_date: '2026-10-15',
        is_completed: false,
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-01-01T10:00:00.000Z',
        assets: [],
      },
      {
        id: 't-2',
        user_id: 'u-1',
        title: 'Task B (Due Oct 25 initially)',
        description: null,
        due_date: '2026-10-25',
        is_completed: false,
        created_at: '2026-01-02T10:00:00.000Z',
        updated_at: '2026-01-02T10:00:00.000Z',
        assets: [],
      },
    ];

    const updatedT2: Todo = {
      ...initialList[1],
      due_date: '2026-10-05', // Now earlier than Task A (Oct 15)
      updated_at: '2026-01-03T10:00:00.000Z',
    };

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/todos') && init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => [...initialList],
        });
      }
      if (urlStr.endsWith('/todos/t-2') && init?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => updatedT2,
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('Task B (Due Oct 25 initially)')).toBeInTheDocument();

    const t2Item = screen.getByTestId('todo-item-t-2');
    const editBtn = within(t2Item).getByRole('button', { name: /edit/i });
    await userEvent.click(editBtn);

    const modal = screen.getByRole('dialog');
    const dateInput = within(modal).getByLabelText(/due date/i);
    const saveBtn = within(modal).getByRole('button', { name: /save changes|save|update/i });

    fireEvent.change(dateInput, { target: { value: '2026-10-05' } });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
    // Task B should now be first because its due date (Oct 5) is earlier than Task A (Oct 15)
    expect(titles).toEqual([
      'Task B (Due Oct 25 initially)',
      'Task A (Due Oct 15)',
    ]);
  });
});
