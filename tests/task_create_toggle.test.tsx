import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOKEN_KEY } from '../src/api/client';
import DashboardPage from '../src/pages/DashboardPage';
import { AuthProvider } from '../src/context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import CreateTaskModal from '../src/components/CreateTaskModal';
import TaskItem from '../src/components/TaskItem';
import { Todo } from '../src/types/todo';

const initialTodos: Todo[] = [
  {
    id: 'todo-1',
    user_id: 'user-1',
    title: 'First active task',
    description: 'First active description',
    is_completed: false,
    created_at: '2026-01-01T10:00:00.000Z',
    updated_at: '2026-01-01T10:00:00.000Z',
    assets: [],
  },
  {
    id: 'todo-2',
    user_id: 'user-1',
    title: 'Second completed task',
    description: 'Second completed description',
    is_completed: true,
    created_at: '2026-01-02T12:00:00.000Z',
    updated_at: '2026-01-02T15:00:00.000Z',
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

describe('Task Creation and Completion Toggle (T3 / R3 & R4)', () => {
  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'test-auth-token');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // R3 AC-1: Valid task creation
  it('opens CreateTaskModal, submits valid task via POST /todos, closes modal, and prepends task to dashboard', async () => {
    const createdTodo: Todo = {
      id: 'todo-new-1',
      user_id: 'user-1',
      title: 'New Unique Task Title',
      description: 'A helpful description',
      is_completed: false,
      created_at: '2026-01-03T14:00:00.000Z',
      updated_at: '2026-01-03T14:00:00.000Z',
      assets: [],
    };

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/todos') && init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => [...initialTodos],
        });
      }
      if (urlStr.endsWith('/todos') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => createdTodo,
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    // Verify existing tasks loaded
    expect(await screen.findByText('First active task')).toBeInTheDocument();

    // Click "Create Task" button to open modal
    const openModalBtn = screen.getByRole('button', { name: /create task|new task|add task/i });
    await userEvent.click(openModalBtn);

    // Modal elements should be visible
    const modal = screen.getByRole('dialog');
    const modalTitle = within(modal).getByRole('heading', { name: /create task|new task/i });
    expect(modalTitle).toBeInTheDocument();

    const titleInput = within(modal).getByLabelText(/title/i);
    const descInput = within(modal).getByLabelText(/description/i);
    const submitBtn = within(modal).getByRole('button', { name: /create|submit|save/i });

    // Enter valid task information
    await userEvent.type(titleInput, 'New Unique Task Title');
    await userEvent.type(descInput, 'A helpful description');
    await userEvent.click(submitBtn);

    // Verify POST /todos was called with title and description
    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([callUrl, callInit]) =>
          String(callUrl).endsWith('/todos') && callInit?.method === 'POST'
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body);
      expect(body.title).toBe('New Unique Task Title');
      expect(body.description).toBe('A helpful description');
    });

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /create task|new task/i })).not.toBeInTheDocument();
    });

    // Newly created task should be displayed on dashboard
    expect(await screen.findByText('New Unique Task Title')).toBeInTheDocument();
    expect(screen.getByText('A helpful description')).toBeInTheDocument();

    // Verify newly created task is prepended (first in list)
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings[0]).toBe('New Unique Task Title');
  });

  // R3 AC-2: Invalid title validation blocking submission without API call
  it('blocks submission and displays inline errors when title is empty or exceeds character limits', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/todos') && init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => [...initialTodos],
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('First active task')).toBeInTheDocument();

    const openModalBtn = screen.getByRole('button', { name: /create task|new task|add task/i });
    await userEvent.click(openModalBtn);

    const modal = screen.getByRole('dialog');
    const titleInput = within(modal).getByLabelText(/title/i);
    const submitBtn = within(modal).getByRole('button', { name: /create|submit|save/i });

    // Case 1: Empty title - submit button disabled or submit attempt blocked
    expect(submitBtn).toBeDisabled();
    await userEvent.click(submitBtn);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').length).toBe(0);

    // Case 2: Whitespace-only title
    await userEvent.type(titleInput, '    ');
    expect(submitBtn).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').length).toBe(0);

    // Case 3: Title exceeding 255 characters
    const longTitle = 'a'.repeat(256);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, longTitle);
    expect(submitBtn).toBeDisabled();
    expect(within(modal).getByText(/title.*(?:255|too long|cannot exceed)/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').length).toBe(0);

    // Case 4: Description exceeding 1024 characters
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Valid Title');
    const descInput = within(modal).getByLabelText(/description/i);
    const longDesc = 'd'.repeat(1025);
    await userEvent.type(descInput, longDesc);
    expect(submitBtn).toBeDisabled();
    expect(within(modal).getByText(/description.*(?:1024|too long|cannot exceed)/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').length).toBe(0);
  });

  // R4 AC-1: Marking active task completed
  it('toggles active task to completed, issuing PATCH /todos/{id}, applying strikethrough, and updating filter views', async () => {
    const updatedTodo1: Todo = {
      ...initialTodos[0],
      is_completed: true,
      updated_at: '2026-01-03T15:00:00.000Z',
    };

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/todos') && init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => [...initialTodos],
        });
      }
      if (urlStr.endsWith('/todos/todo-1') && init?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => updatedTodo1,
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('First active task')).toBeInTheDocument();

    // Locate the checkbox for First active task
    const activeTaskItem = screen.getByTestId('todo-item-todo-1');
    const checkbox = activeTaskItem.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);

    // Initial styling: no strikethrough
    const titleHeading = screen.getByRole('heading', { name: 'First active task' });
    expect(titleHeading).not.toHaveStyle({ textDecoration: 'line-through' });

    // Click checkbox to complete task
    await userEvent.click(checkbox);

    // Verify PATCH request
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([callUrl, callInit]) =>
          String(callUrl).endsWith('/todos/todo-1') && callInit?.method === 'PATCH'
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall![1].body);
      expect(body.is_completed).toBe(true);
    });

    // Checkbox should be checked and strikethrough applied
    await waitFor(() => {
      expect(titleHeading).toHaveStyle({ textDecoration: 'line-through' });
    });
    expect(checkbox.checked).toBe(true);

    // Re-evaluates filter: Active filter view should exclude it
    const activeFilterBtn = screen.getByRole('button', { name: /^active$/i });
    await userEvent.click(activeFilterBtn);
    expect(screen.queryByText('First active task')).not.toBeInTheDocument();

    // Completed filter view should include it
    const completedFilterBtn = screen.getByRole('button', { name: /^completed$/i });
    await userEvent.click(completedFilterBtn);
    expect(screen.getByText('First active task')).toBeInTheDocument();
  });

  // R4 AC-2: Marking completed task active
  it('toggles completed task to active, issuing PATCH /todos/{id}, removing strikethrough, and updating filter views', async () => {
    const updatedTodo2: Todo = {
      ...initialTodos[1],
      is_completed: false,
      updated_at: '2026-01-03T16:00:00.000Z',
    };

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/todos') && init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => [...initialTodos],
        });
      }
      if (urlStr.endsWith('/todos/todo-2') && init?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => updatedTodo2,
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('Second completed task')).toBeInTheDocument();

    // Locate the checkbox for Second completed task
    const completedTaskItem = screen.getByTestId('todo-item-todo-2');
    const checkbox = completedTaskItem.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(true);

    // Initial styling: strikethrough
    const titleHeading = screen.getByRole('heading', { name: 'Second completed task' });
    expect(titleHeading).toHaveStyle({ textDecoration: 'line-through' });

    // Uncheck checkbox to mark active
    await userEvent.click(checkbox);

    // Verify PATCH request
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([callUrl, callInit]) =>
          String(callUrl).endsWith('/todos/todo-2') && callInit?.method === 'PATCH'
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall![1].body);
      expect(body.is_completed).toBe(false);
    });

    // Checkbox unchecked and strikethrough removed
    await waitFor(() => {
      expect(titleHeading).not.toHaveStyle({ textDecoration: 'line-through' });
    });
    expect(checkbox.checked).toBe(false);

    // Re-evaluates filter: Completed filter view should exclude it
    const completedFilterBtn = screen.getByRole('button', { name: /^completed$/i });
    await userEvent.click(completedFilterBtn);
    expect(screen.queryByText('Second completed task')).not.toBeInTheDocument();

    // Active filter view should include it
    const activeFilterBtn = screen.getByRole('button', { name: /^active$/i });
    await userEvent.click(activeFilterBtn);
    expect(screen.getByText('Second completed task')).toBeInTheDocument();
  });

  describe('CreateTaskModal component unit tests', () => {
    it('does not render anything when isOpen is false', () => {
      render(<CreateTaskModal isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when cancel or close button is clicked', async () => {
      const handleClose = vi.fn();
      render(<CreateTaskModal isOpen={true} onClose={handleClose} />);

      const closeBtn = screen.getByRole('button', { name: /close modal/i });
      await userEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelBtn);
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    it('displays error message when task creation fails with API error', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Title is invalid on server' }),
      });
      globalThis.fetch = fetchMock;

      render(<CreateTaskModal isOpen={true} onClose={vi.fn()} />);

      const titleInput = screen.getByLabelText(/title/i);
      await userEvent.type(titleInput, 'Valid Title');
      const submitBtn = screen.getByRole('button', { name: /create task/i });
      await userEvent.click(submitBtn);

      expect(await screen.findByRole('alert')).toHaveTextContent('Title is invalid on server');
    });
  });

  describe('TaskItem component unit tests', () => {
    const sampleTodo: Todo = {
      id: 'item-1',
      user_id: 'user-1',
      title: 'Sample Task',
      description: 'Sample description',
      is_completed: false,
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
      assets: [],
    };

    it('renders task details, status badge, and unchecked checkbox for active task', () => {
      render(<TaskItem todo={sampleTodo} />);

      expect(screen.getByRole('heading', { name: 'Sample Task' })).toBeInTheDocument();
      expect(screen.getByText('Sample description')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('calls onToggle callback with server response when toggled', async () => {
      const updatedSample: Todo = { ...sampleTodo, is_completed: true };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => updatedSample,
      });
      globalThis.fetch = fetchMock;

      const handleToggle = vi.fn();
      render(<TaskItem todo={sampleTodo} onToggle={handleToggle} />);

      const checkbox = screen.getByRole('checkbox');
      await userEvent.click(checkbox);

      await waitFor(() => {
        expect(handleToggle).toHaveBeenCalledWith(updatedSample);
      });
    });

    it('reverts optimistic completion state when PATCH request fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Server error' }),
      });
      globalThis.fetch = fetchMock;

      render(<TaskItem todo={sampleTodo} />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      await userEvent.click(checkbox);

      // After failed API request, checkbox should revert back to unchecked
      await waitFor(() => {
        expect(checkbox.checked).toBe(false);
      });
    });
  });
});
