---
type: concept
title: Task Management
summary: Todo lifecycle management including creation, listing, client-side filtering, optimistic updates, and deletion.
related: ["attachments.md", "api-client.md", "auth.md"]
source_paths: ["src/types/todo.ts", "src/pages/DashboardPage.tsx", "src/components/TaskList.tsx", "src/components/TaskItem.tsx", "src/components/TaskFilter.tsx", "src/components/CreateTaskModal.tsx", "src/components/EditTaskModal.tsx", "src/components/DeleteConfirmModal.tsx", "src/components/EmptyState.tsx", "tests/dashboard.test.tsx", "tests/task_create_toggle.test.tsx", "tests/task_edit_delete.test.tsx"]
---
# Task Management

Task management is the core feature domain of `sample-frontend`. It allows authenticated users to create, list, filter, edit, complete, and delete todo items, as well as attach media files via direct-to-cloud storage.

## Data Structures

The task model is defined in `src/types/todo.ts`:

```typescript
export interface Asset {
  id: string;
  user_id: string;
  gcs_path: string;
  public_url: string;
  media_type: string;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  assets: Asset[];
}

export type FilterStatus = 'all' | 'active' | 'completed';
```

## Dashboard Page (`DashboardPage`)

`src/pages/DashboardPage.tsx` serves as the container for all task management activities.

### Initial Data Fetch and Ordering
On mount, the dashboard issues a `GET /todos` request through the [api-client](api-client.md). Tasks returned from the server are sorted chronologically by `created_at` in ascending order:

```typescript
const sorted = [...list].sort(
  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
);
setTodos(sorted);
```

When a new task is created, it is prepended to the task array to give immediate visibility to the user.

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

#### Media Attachments Display
Each `TaskItem` renders its associated media assets using `AttachmentChip`. See [attachments](attachments.md) for preview and rendering details.

### Empty States (`EmptyState`)
`src/components/EmptyState.tsx` displays contextual feedback when the current filter yields no results:
- Active: *"No active tasks found. No tasks match the selected filter."*
- Completed: *"No completed tasks found. No tasks match the selected filter."*
- All: *"No tasks found."*

## Modals & Task Mutations

### Task Creation Modal (`CreateTaskModal`)
`src/components/CreateTaskModal.tsx` provides form inputs for title, description, and attachments:
- **Title validation**: Required, 1 to 255 characters. Displays real-time error on blur or submission.
- **Description validation**: Optional, capped at 1024 characters.
- **Attachments**: Integrated with `AttachmentUploader` and `AttachmentChip`. Up to 10 assets can be attached before saving.
- Submits `POST /todos` with `{ title, description, asset_ids }`.

### Task Edit Modal (`EditTaskModal`)
`src/components/EditTaskModal.tsx` allows updating an existing task:
- Pre-populates the form with existing title, description, and attached assets.
- Allows attaching new files or removing existing assets.
- Submits `PATCH /todos/:id` with `{ title, description, asset_ids }`.

### Delete Confirmation Modal (`DeleteConfirmModal`)
`src/components/DeleteConfirmModal.tsx` enforces a confirmation dialog before permanently deleting a task:
- Disables interaction and shows loading indicators during the operation.
- Issues `DELETE /todos/:id`.
- On success, invokes `onTaskDeleted` to remove the item from the dashboard state.

Authentication for all task operations is handled automatically by [auth](auth.md) and [api-client](api-client.md).
