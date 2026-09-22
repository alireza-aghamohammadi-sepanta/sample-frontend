import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOKEN_KEY } from '../src/api/client';
import DashboardPage from '../src/pages/DashboardPage';
import { AuthProvider } from '../src/context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import EditTaskModal from '../src/components/EditTaskModal';
import DeleteConfirmModal from '../src/components/DeleteConfirmModal';
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
    assets: [
      {
        id: 'asset-1',
        user_id: 'user-1',
        gcs_path: 'user-1/asset-1.png',
        public_url: 'https://storage.example.com/asset-1.png',
        media_type: 'image/png',
        created_at: '2026-01-01T10:00:00.000Z',
      },
    ],
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

describe('Task Editing and Deletion (T4 / R5 AC-1 to AC-4)', () => {
  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'test-auth-token');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // R5 AC-1: Updating task details via PATCH
  it('opens EditTaskModal pre-populated, updates title, description, and attached assets via PATCH /todos/{id}, and updates dashboard', async () => {
    const updatedTodo: Todo = {
      ...initialTodos[0],
      title: 'Updated Active Task Title',
      description: 'Updated active task description',
      assets: [],
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
      if (urlStr.endsWith('/todos/todo-1') && init?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => updatedTodo,
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('First active task')).toBeInTheDocument();

    // Click Edit button for First active task
    const taskItem = screen.getByTestId('todo-item-todo-1');
    const editBtn = within(taskItem).getByRole('button', { name: /edit/i });
    await userEvent.click(editBtn);

    // Modal should be open and pre-populated
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByRole('heading', { name: /edit task/i })).toBeInTheDocument();

    const titleInput = within(modal).getByLabelText(/title/i) as HTMLInputElement;
    const descInput = within(modal).getByLabelText(/description/i) as HTMLTextAreaElement;

    expect(titleInput.value).toBe('First active task');
    expect(descInput.value).toBe('First active description');

    // Check that attached asset is displayed
    expect(within(modal).getByText(/asset-1\.png/i)).toBeInTheDocument();

    // Remove attached asset
    const removeAssetBtn = within(modal).getByRole('button', { name: /remove asset|remove/i });
    await userEvent.click(removeAssetBtn);
    expect(within(modal).queryByText(/asset-1\.png/i)).not.toBeInTheDocument();

    // Modify title and description
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Updated Active Task Title');
    await userEvent.clear(descInput);
    await userEvent.type(descInput, 'Updated active task description');

    // Click Save
    const saveBtn = within(modal).getByRole('button', { name: /save|update/i });
    await userEvent.click(saveBtn);

    // Verify PATCH request
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([callUrl, callInit]) =>
          String(callUrl).endsWith('/todos/todo-1') && callInit?.method === 'PATCH'
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall![1].body);
      expect(body.title).toBe('Updated Active Task Title');
      expect(body.description).toBe('Updated active task description');
      expect(body.asset_ids).toEqual([]);
    });

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /edit task/i })).not.toBeInTheDocument();
    });

    // Dashboard updates with new values
    expect(await screen.findByText('Updated Active Task Title')).toBeInTheDocument();
    expect(screen.getByText('Updated active task description')).toBeInTheDocument();
    expect(screen.queryByText('First active task')).not.toBeInTheDocument();
  });

  // R5 AC-2: Canceling edit without saving
  it('cancels edit without saving, discards unsaved inputs, makes no HTTP request, and retains original values', async () => {
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

    // Click Edit button
    const taskItem = screen.getByTestId('todo-item-todo-1');
    const editBtn = within(taskItem).getByRole('button', { name: /edit/i });
    await userEvent.click(editBtn);

    const modal = screen.getByRole('dialog');
    const titleInput = within(modal).getByLabelText(/title/i) as HTMLInputElement;
    const descInput = within(modal).getByLabelText(/description/i) as HTMLTextAreaElement;

    // Type modifications
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Discarded Task Title');
    await userEvent.clear(descInput);
    await userEvent.type(descInput, 'Discarded Task Description');

    // Click Cancel button
    const cancelBtn = within(modal).getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelBtn);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /edit task/i })).not.toBeInTheDocument();
    });

    // Verify NO PATCH, PUT, or POST requests were made
    const mutatingCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === 'PATCH' || init?.method === 'PUT' || init?.method === 'POST'
    );
    expect(mutatingCalls.length).toBe(0);

    // Original task title and description remain on dashboard
    expect(screen.getByText('First active task')).toBeInTheDocument();
    expect(screen.getByText('First active description')).toBeInTheDocument();
    expect(screen.queryByText('Discarded Task Title')).not.toBeInTheDocument();

    // When reopened, modal should have original values, not discarded values
    await userEvent.click(editBtn);
    const reopenedModal = screen.getByRole('dialog');
    const reopenedTitleInput = within(reopenedModal).getByLabelText(/title/i) as HTMLInputElement;
    const reopenedDescInput = within(reopenedModal).getByLabelText(/description/i) as HTMLTextAreaElement;
    expect(reopenedTitleInput.value).toBe('First active task');
    expect(reopenedDescInput.value).toBe('First active description');
  });

  // R5 AC-3: Deleting a task with confirmation
  it('displays DeleteConfirmModal on delete click, confirms deletion via DELETE /todos/{id}, and removes task from dashboard', async () => {
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
      if (urlStr.endsWith('/todos/todo-1') && init?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          status: 204,
          headers: new Headers(),
          text: async () => '',
        });
      }
      return Promise.reject(new Error(`Unhandled request: ${urlStr} ${init?.method}`));
    });
    globalThis.fetch = fetchMock;

    renderDashboard();

    expect(await screen.findByText('First active task')).toBeInTheDocument();
    expect(screen.getByText('Second completed task')).toBeInTheDocument();

    // Click Delete button on First active task
    const taskItem = screen.getByTestId('todo-item-todo-1');
    const deleteBtn = within(taskItem).getByRole('button', { name: /delete/i });
    await userEvent.click(deleteBtn);

    // Delete confirmation modal should be visible
    const modal = screen.getByRole('dialog');
    expect(
      within(modal).getByRole('heading', { name: /delete task|confirm delete/i })
    ).toBeInTheDocument();
    expect(
      within(modal).getByText(/are you sure you want to delete/i)
    ).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = within(modal).getByRole('button', { name: /^delete$|^confirm/i });
    await userEvent.click(confirmBtn);

    // Verify DELETE request was made
    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([callUrl, callInit]) =>
          String(callUrl).endsWith('/todos/todo-1') && callInit?.method === 'DELETE'
      );
      expect(deleteCall).toBeDefined();
    });

    // Confirmation dialog should close
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /delete task|confirm delete/i })
      ).not.toBeInTheDocument();
    });

    // First active task should be removed from dashboard
    expect(screen.queryByText('First active task')).not.toBeInTheDocument();
    // Second task remains
    expect(screen.getByText('Second completed task')).toBeInTheDocument();
  });

  // R5 AC-4: Dismissing the delete confirmation dialog
  it('dismisses DeleteConfirmModal when cancel is clicked, issues no DELETE request, and retains task in dashboard', async () => {
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

    // Click Delete button on First active task
    const taskItem = screen.getByTestId('todo-item-todo-1');
    const deleteBtn = within(taskItem).getByRole('button', { name: /delete/i });
    await userEvent.click(deleteBtn);

    // Delete confirmation modal should appear
    const modal = screen.getByRole('dialog');
    expect(
      within(modal).getByRole('heading', { name: /delete task|confirm delete/i })
    ).toBeInTheDocument();

    // Click Cancel
    const cancelBtn = within(modal).getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelBtn);

    // Dialog should close
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /delete task|confirm delete/i })
      ).not.toBeInTheDocument();
    });

    // Verify NO DELETE requests were made
    const deleteCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE');
    expect(deleteCalls.length).toBe(0);

    // Task is still present on dashboard
    expect(screen.getByText('First active task')).toBeInTheDocument();
  });

  describe('EditTaskModal component unit tests', () => {
    const sampleTodo: Todo = {
      id: 'sample-todo-1',
      user_id: 'user-1',
      title: 'Sample Edit Todo',
      description: 'Sample description',
      is_completed: false,
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
      assets: [
        {
          id: 'asset-edit-1',
          user_id: 'user-1',
          gcs_path: 'uploads/photo.jpg',
          public_url: 'https://storage.example.com/photo.jpg',
          media_type: 'image/jpeg',
          created_at: '2026-01-01T10:00:00.000Z',
        },
      ],
    };

    it('does not render anything when isOpen is false or todo is null', () => {
      const { rerender } = render(
        <EditTaskModal isOpen={false} todo={sampleTodo} onClose={vi.fn()} />
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(<EditTaskModal isOpen={true} todo={null} onClose={vi.fn()} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('validates title (1 to 255 chars) and description (<= 1024 chars), disabling save button on violation', async () => {
      render(<EditTaskModal isOpen={true} todo={sampleTodo} onClose={vi.fn()} />);

      const titleInput = screen.getByLabelText(/title/i);
      const descInput = screen.getByLabelText(/description/i);
      const saveBtn = screen.getByRole('button', { name: /save|update/i });

      // Valid initially
      expect(saveBtn).not.toBeDisabled();

      // Empty title
      await userEvent.clear(titleInput);
      expect(saveBtn).toBeDisabled();
      expect(screen.getByText(/title is required|title.*empty/i)).toBeInTheDocument();

      // Whitespace title
      await userEvent.type(titleInput, '   ');
      expect(saveBtn).toBeDisabled();

      // Title over 255 chars
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'a'.repeat(256));
      expect(saveBtn).toBeDisabled();
      expect(screen.getByText(/title.*(?:255|too long|cannot exceed)/i)).toBeInTheDocument();

      // Reset to valid title
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Valid Title');
      expect(saveBtn).not.toBeDisabled();

      // Description over 1024 chars
      await userEvent.type(descInput, 'd'.repeat(1025));
      expect(saveBtn).toBeDisabled();
      expect(screen.getByText(/description.*(?:1024|too long|cannot exceed)/i)).toBeInTheDocument();
    });

    it('displays error alert when PATCH request fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Failed to update task on backend' }),
      });
      globalThis.fetch = fetchMock;

      render(<EditTaskModal isOpen={true} todo={sampleTodo} onClose={vi.fn()} />);

      const saveBtn = screen.getByRole('button', { name: /save|update/i });
      await userEvent.click(saveBtn);

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to update task on backend');
    });
  });

  describe('DeleteConfirmModal component unit tests', () => {
    const sampleTodo: Todo = {
      id: 'sample-todo-2',
      user_id: 'user-1',
      title: 'Task To Delete',
      description: null,
      is_completed: false,
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
      assets: [],
    };

    it('does not render anything when isOpen is false or todo is null', () => {
      const { rerender } = render(
        <DeleteConfirmModal isOpen={false} todo={sampleTodo} onClose={vi.fn()} />
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(<DeleteConfirmModal isOpen={true} todo={null} onClose={vi.fn()} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays error alert when DELETE request fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Delete failed on server' }),
      });
      globalThis.fetch = fetchMock;

      render(<DeleteConfirmModal isOpen={true} todo={sampleTodo} onClose={vi.fn()} />);

      const confirmBtn = screen.getByRole('button', { name: /^delete$|^confirm/i });
      await userEvent.click(confirmBtn);

      expect(await screen.findByRole('alert')).toHaveTextContent('Delete failed on server');
    });
  });

  describe('TaskItem component edit and delete triggers', () => {
    const sampleTodo: Todo = {
      id: 'item-triggers',
      user_id: 'user-1',
      title: 'Action Trigger Task',
      description: 'Trigger description',
      is_completed: false,
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
      assets: [],
    };

    it('calls onEdit when edit button is clicked', async () => {
      const handleEdit = vi.fn();
      render(<TaskItem todo={sampleTodo} onEdit={handleEdit} />);

      const editBtn = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editBtn);

      expect(handleEdit).toHaveBeenCalledTimes(1);
      expect(handleEdit).toHaveBeenCalledWith(sampleTodo);
    });

    it('calls onDelete when delete button is clicked', async () => {
      const handleDelete = vi.fn();
      render(<TaskItem todo={sampleTodo} onDelete={handleDelete} />);

      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteBtn);

      expect(handleDelete).toHaveBeenCalledTimes(1);
      expect(handleDelete).toHaveBeenCalledWith(sampleTodo);
    });
  });
});
