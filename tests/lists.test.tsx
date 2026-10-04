import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListSidebar } from '../src/components/ListSidebar';
import { CreateListModal } from '../src/components/CreateListModal';
import { EditListModal } from '../src/components/EditListModal';
import { TodoList } from '../src/types/todo';
import client, { TOKEN_KEY } from '../src/api/client';

describe('TodoList Sidebar and Modals', () => {
  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'test-auth-token');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockLists: TodoList[] = [
    {
      id: 'list-work',
      user_id: 'user-1',
      name: 'Work',
      is_default: false,
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'list-inbox',
      user_id: 'user-1',
      name: 'Inbox',
      is_default: true,
      created_at: '2026-01-01T08:00:00.000Z',
      updated_at: '2026-01-01T08:00:00.000Z',
    },
    {
      id: 'list-personal',
      user_id: 'user-1',
      name: 'Personal',
      is_default: false,
      created_at: '2026-01-01T09:00:00.000Z',
      updated_at: '2026-01-01T09:00:00.000Z',
    },
    {
      id: 'list-apple',
      user_id: 'user-1',
      name: 'Apple Project',
      is_default: false,
      created_at: '2026-01-01T09:30:00.000Z',
      updated_at: '2026-01-01T09:30:00.000Z',
    },
  ];

  it('renders pinned default list at top and custom lists sorted alphabetically', () => {
    render(
      <ListSidebar
        lists={mockLists}
        activeListId="list-inbox"
        onSelectList={vi.fn()}
      />
    );

    // List item buttons or links
    const listItems = screen.getAllByTestId(/^list-item-/);
    expect(listItems).toHaveLength(4);

    // Pinned default list "Inbox" must be first
    expect(listItems[0]).toHaveTextContent('Inbox');

    // Remaining custom lists must be sorted alphabetically: "Apple Project", "Personal", "Work"
    expect(listItems[1]).toHaveTextContent('Apple Project');
    expect(listItems[2]).toHaveTextContent('Personal');
    expect(listItems[3]).toHaveTextContent('Work');
  });

  it('indicates active list selection visually and semantically', () => {
    const { rerender } = render(
      <ListSidebar
        lists={mockLists}
        activeListId="list-inbox"
        onSelectList={vi.fn()}
      />
    );

    const inboxItem = screen.getByTestId('list-item-list-inbox');
    expect(inboxItem).toHaveAttribute('data-active', 'true');

    const workItem = screen.getByTestId('list-item-list-work');
    expect(workItem).toHaveAttribute('data-active', 'false');

    // Rerender with activeListId switched to Work
    rerender(
      <ListSidebar
        lists={mockLists}
        activeListId="list-work"
        onSelectList={vi.fn()}
      />
    );

    expect(screen.getByTestId('list-item-list-inbox')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('list-item-list-work')).toHaveAttribute('data-active', 'true');
  });

  it('calls onSelectList when a list item is clicked', async () => {
    const onSelectList = vi.fn();
    render(
      <ListSidebar
        lists={mockLists}
        activeListId="list-inbox"
        onSelectList={onSelectList}
      />
    );

    const workItem = screen.getByText('Work');
    await userEvent.click(workItem);

    expect(onSelectList).toHaveBeenCalledWith('list-work');
  });

  it('provides trigger buttons for list creation, renaming, and deletion', async () => {
    const onDeleteList = vi.fn();
    render(
      <ListSidebar
        lists={mockLists}
        activeListId="list-inbox"
        onSelectList={vi.fn()}
        onDeleteList={onDeleteList}
      />
    );

    // Trigger button for list creation
    const createBtn = screen.getByRole('button', { name: /new list|create list|\+ list/i });
    expect(createBtn).toBeInTheDocument();

    // Default list cannot be deleted (no delete button)
    const inboxItem = screen.getByTestId('list-item-list-inbox');
    expect(within(inboxItem).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

    // Custom list has rename and delete trigger buttons
    const workItem = screen.getByTestId('list-item-list-work');
    const renameBtn = within(workItem).getByRole('button', { name: /rename/i });
    const deleteBtn = within(workItem).getByRole('button', { name: /delete/i });
    expect(renameBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();

    await userEvent.click(deleteBtn);
    expect(onDeleteList).toHaveBeenCalledWith('list-work');
  });

  describe('CreateListModal', () => {
    it('validates 1-255 characters and disables submit when empty or exceeding 255 chars', async () => {
      render(
        <CreateListModal
          isOpen={true}
          onClose={vi.fn()}
          onListCreated={vi.fn()}
        />
      );

      const input = screen.getByRole('textbox', { name: /list name/i });
      const submitBtn = screen.getByRole('button', { name: /create/i });

      // Initially empty -> submit button is disabled
      expect(submitBtn).toBeDisabled();

      // Enter valid name -> enabled
      await userEvent.type(input, 'Groceries');
      expect(submitBtn).not.toBeDisabled();

      // Exceed 255 characters -> disabled and shows error
      const tooLongName = 'a'.repeat(256);
      fireEvent.change(input, { target: { value: tooLongName } });
      expect(submitBtn).toBeDisabled();
      expect(screen.getByText(/255 characters or less/i)).toBeInTheDocument();
    });

    it('submits POST /lists with valid name and closes on success', async () => {
      const onClose = vi.fn();
      const onListCreated = vi.fn();

      const createdList: TodoList = {
        id: 'list-groceries',
        user_id: 'user-1',
        name: 'Groceries',
        is_default: false,
        created_at: '2026-01-01T12:00:00.000Z',
        updated_at: '2026-01-01T12:00:00.000Z',
      };

      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).endsWith('/lists') && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => createdList,
          });
        }
        return Promise.reject(new Error(`Unhandled: ${url}`));
      });
      globalThis.fetch = fetchMock;

      render(
        <CreateListModal
          isOpen={true}
          onClose={onClose}
          onListCreated={onListCreated}
        />
      );

      const input = screen.getByRole('textbox', { name: /list name/i });
      await userEvent.type(input, 'Groceries');

      const submitBtn = screen.getByRole('button', { name: /create/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(onListCreated).toHaveBeenCalledWith(createdList);
        expect(onClose).toHaveBeenCalled();
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/lists$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Groceries' }),
        })
      );
    });

    it('displays 409 conflict error message when duplicate list name is entered', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).endsWith('/lists') && init?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 409,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ detail: 'A list with this name already exists' }),
          });
        }
        return Promise.reject(new Error(`Unhandled: ${url}`));
      });
      globalThis.fetch = fetchMock;

      render(
        <CreateListModal
          isOpen={true}
          onClose={vi.fn()}
          onListCreated={vi.fn()}
        />
      );

      const input = screen.getByRole('textbox', { name: /list name/i });
      await userEvent.type(input, 'Inbox');

      const submitBtn = screen.getByRole('button', { name: /create/i });
      await userEvent.click(submitBtn);

      expect(await screen.findByRole('alert')).toHaveTextContent('A list with this name already exists');
    });
  });

  describe('EditListModal', () => {
    it('pre-populates with current name and updates via PATCH /lists/{id}', async () => {
      const onClose = vi.fn();
      const onListUpdated = vi.fn();

      const targetList = mockLists[0]; // Work
      const updatedList: TodoList = {
        ...targetList,
        name: 'Work & Career',
      };

      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).endsWith(`/lists/${targetList.id}`) && init?.method === 'PATCH') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => updatedList,
          });
        }
        return Promise.reject(new Error(`Unhandled: ${url}`));
      });
      globalThis.fetch = fetchMock;

      render(
        <EditListModal
          isOpen={true}
          todoList={targetList}
          onClose={onClose}
          onListUpdated={onListUpdated}
        />
      );

      const input = screen.getByRole('textbox', { name: /list name/i });
      expect(input).toHaveValue('Work');

      await userEvent.clear(input);
      await userEvent.type(input, 'Work & Career');

      const submitBtn = screen.getByRole('button', { name: /save|update|rename/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(onListUpdated).toHaveBeenCalledWith(updatedList);
        expect(onClose).toHaveBeenCalled();
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`/lists/${targetList.id}$`)),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Work & Career' }),
        })
      );
    });

    it('displays 409 conflict error message on duplicate rename', async () => {
      const targetList = mockLists[0]; // Work

      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (String(url).endsWith(`/lists/${targetList.id}`) && init?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            status: 409,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ detail: 'A list with this name already exists' }),
          });
        }
        return Promise.reject(new Error(`Unhandled: ${url}`));
      });
      globalThis.fetch = fetchMock;

      render(
        <EditListModal
          isOpen={true}
          todoList={targetList}
          onClose={vi.fn()}
          onListUpdated={vi.fn()}
        />
      );

      const input = screen.getByRole('textbox', { name: /list name/i });
      await userEvent.clear(input);
      await userEvent.type(input, 'Inbox');

      const submitBtn = screen.getByRole('button', { name: /save|update|rename/i });
      await userEvent.click(submitBtn);

      expect(await screen.findByRole('alert')).toHaveTextContent('A list with this name already exists');
    });
  });

  describe('API Client List Methods', () => {
    it('supports getLists, createList, updateList, and deleteList', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.endsWith('/lists') && (!init?.method || init.method === 'GET')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => mockLists,
          });
        }
        if (urlStr.endsWith('/lists') && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ ...mockLists[0], id: 'new-id', name: 'Created' }),
          });
        }
        if (urlStr.endsWith('/lists/list-work') && init?.method === 'PATCH') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ ...mockLists[0], name: 'Renamed' }),
          });
        }
        if (urlStr.endsWith('/lists/list-work') && init?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            status: 204,
            headers: new Headers(),
            text: async () => '',
          });
        }
        return Promise.reject(new Error(`Unhandled: ${urlStr} ${init?.method}`));
      });
      globalThis.fetch = fetchMock;

      // getLists
      const lists = await client.getLists();
      expect(lists).toEqual(mockLists);

      // createList
      const created = await client.createList({ name: 'Created' });
      expect(created.name).toBe('Created');

      // updateList
      const updated = await client.updateList('list-work', { name: 'Renamed' });
      expect(updated.name).toBe('Renamed');

      // deleteList
      await client.deleteList('list-work');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/lists\/list-work$/),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
