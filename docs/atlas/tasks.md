---
type: concept
title: Task Management
summary: Todo lifecycle management including creation, listing, client-side filtering, optimistic updates, and deletion.
related: ["attachments.md", "api-client.md", "auth.md", "lists.md"]
source_paths: ["src/types/todo.ts", "src/pages/DashboardPage.tsx", "src/components/TaskList.tsx", "src/components/TaskItem.tsx", "src/components/TaskFilter.tsx", "src/components/CreateTaskModal.tsx", "src/components/EditTaskModal.tsx", "src/components/DeleteConfirmModal.tsx", "src/components/EmptyState.tsx", "tests/dashboard.test.tsx", "tests/task_create_toggle.test.tsx", "tests/task_edit_delete.test.tsx"]
---
# Task Management

Task management is the core feature domain of `sample-frontend`. It allows authenticated users to create, list, filter, edit, complete, and delete todo items, as well as attach media files via direct-to-cloud storage.

## Data Structures

The task and list models are defined in `src/types/todo.ts`:

```typescript
export interface Asset {
  id: string;
  user_id: string;
  gcs_path: string;
  public_url: string;
  media_type: string;
  created_at: string;
}

export interface TodoList {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  list_id: string;
  title: string;
  description: string | null;
  due_date?: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  assets: Asset[];
}

export type FilterStatus = 'all' | 'active' | 'completed';
```

See [lists](lists.md) for full documentation of list organization and management.

## Dashboard Page (`DashboardPage`)

`src/pages/DashboardPage.tsx` serves as the container for all task management activities.

### Initial Data Fetch and Multi-Tier Ordering
On mount, the dashboard fetches user lists and selects either the pinned default list or first available list as the active list. It then issues a `GET /todos?list_id=${activeListId}` request through [api-client](api-client.md).

Tasks are sorted client-side using `sortTodos` adhering to a 3-tier priority ordering:
1. **Active tasks with nearest due date**: Sorted ascending by `due_date` (`dueA - dueB`).
2. **Active tasks without due date**: Sorted descending by creation timestamp (`createdB - createdA`), placing newest tasks first.
3. **Completed tasks**: Grouped together at the bottom of the list and sorted chronologically by creation timestamp (`createdA - createdB`).

When tasks are created, updated, or toggled, `sortTodos` preserves this structure immediately without requiring a full network refetch.

### High-Performance In-Memory Filtering
Task filtering is executed client-side via `useMemo` based on the selected `FilterStatus`:
- `'all'`: Displays all tasks.
- `'active'`: Displays only tasks where `is_completed === false`.
- `'completed'`: Displays only tasks where `is_completed === true`.

Filtering operates in-memory to ensure response times well under 50ms without unnecessary network roundtrips.

## Components and Workflow

### Filter Controls (`TaskFilter`)
`src/components/TaskFilter.tsx` renders accessible filter buttons with `aria-pressed` states and `data-testid` markers (`filter-all`, `filter-active`, `filter-completed`).

### Task List and Item (`TaskList`, `TaskItem`)
`src/components/TaskList.tsx` maps filtered tasks into individual `TaskItem` components (`src/components/TaskItem.tsx`).

#### Optimistic Completion Toggling
When a user toggles the task checkbox:
1. `TaskItem` updates its local `optimisticCompleted` state immediately, updating the checkbox and crossing out the task title with `line-through`.
2. It sends a `PATCH /todos/:id` with `{ is_completed: nextCompleted }`.
3. If the request succeeds, it notifies the parent via `onToggle`.
4. If the request fails, it catches the error and rolls back `optimisticCompleted` to the original `todo.is_completed` value.

#### Due Dates & Deadline Badges
`TaskItem` calculates deadline urgency for incomplete tasks using `getDeadlineUrgency(dueDate, isCompleted)`:
- **Overdue**: Displayed with an `"Overdue"` badge (red) if `due_date < today`.
- **Due Today**: Displayed with a `"Due Today"` badge (amber) if `due_date === today`.
- **Upcoming**: Displayed with `"Due: YYYY-MM-DD"` (slate gray).
- **Completed**: Deadline urgency badges are hidden once a task is marked completed.

#### Media Attachments Display
Each `TaskItem` renders its associated media assets using `AttachmentChip`. See [attachments](attachments.md) for preview and rendering details.

### Empty States (`EmptyState`)
`src/components/EmptyState.tsx` displays contextual feedback when the current filter yields no results:
- Active: *"No active tasks found. No tasks match the selected filter."*
- Completed: *"No completed tasks found. No tasks match the selected filter."*
- All: *"No tasks found."*

## Modals & Task Mutations

### Task Creation Modal (`CreateTaskModal`)
`src/components/CreateTaskModal.tsx` provides form inputs for title, description, due date, list assignment, and attachments:
- **Title validation**: Required, 1 to 255 characters. Displays real-time error on blur or submission.
- **Description validation**: Optional, capped at 1024 characters.
- **List selector**: Dropdown menu allowing assignment to any available list from [lists](lists.md) (defaults to active list or default list).
- **Due date**: Optional date picker input (`YYYY-MM-DD`).
- **Attachments**: Integrated with `AttachmentUploader` and `AttachmentChip`. Up to 10 assets can be attached before saving.
- Submits `POST /todos` with `{ title, description, due_date, list_id, asset_ids }`.

### Task Edit Modal (`EditTaskModal`)
`src/components/EditTaskModal.tsx` allows updating an existing task:
- Pre-populates the form with existing title, description, due date, assigned list, and attached assets.
- Allows reassigning the task to another list or changing its due date.
- Allows attaching new files or removing existing assets.
- Submits `PATCH /todos/:id` with `{ title, description, due_date, list_id, asset_ids }`.

### Delete Confirmation Modal (`DeleteConfirmModal`)
`src/components/DeleteConfirmModal.tsx` enforces a confirmation dialog before permanently deleting a task:
- Disables interaction and shows loading indicators during the operation.
- Issues `DELETE /todos/:id`.
- On success, invokes `onTaskDeleted` to remove the item from the dashboard state.

Authentication for all task operations is handled automatically by [auth](auth.md) and [api-client](api-client.md).
