---
type: concept
title: Todo Lists & Organization
summary: Organizational grouping of tasks into custom and default lists with sidebar navigation and modal management.
related: ["tasks.md", "api-client.md", "architecture.md"]
source_paths: ["src/types/todo.ts", "src/components/ListSidebar.tsx", "src/components/CreateListModal.tsx", "src/components/EditListModal.tsx", "src/components/DeleteListModal.tsx", "tests/lists.test.tsx"]
---
# Todo Lists & Organization

The application provides list-based organization, allowing users to categorize tasks into separate lists such as "Inbox", "Work", or personal projects. The list subsystem includes pinned system lists, alphabetical custom lists, dedicated sidebar navigation, and full modal-driven CRUD operations.

## Data Structures

The list entity is defined in `src/types/todo.ts`:

```typescript
export interface TodoList {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```

Every `Todo` item references its parent list via `list_id: string`.

## List Ordering & Constraints

Lists displayed in the application follow strict ordering rules implemented via `useMemo` in `ListSidebar`:

1. **Pinned Default List**: The list marked with `is_default: true` (e.g., "Inbox") is permanently pinned at the top of the sidebar navigation.
2. **Alphabetical Sorting**: Custom (non-default) lists are sorted alphabetically in a case-insensitive manner using `localeCompare(..., undefined, { sensitivity: 'base' })`.
3. **Protection of Default List**: Default lists cannot be renamed or deleted. Renaming and deletion trigger buttons are hidden for the default list.

## Sidebar Navigation (`ListSidebar`)

`src/components/ListSidebar.tsx` renders the left navigation panel:
- Displays all lists with accessible `data-testid="list-item-${list.id}"` identifiers.
- Indicates the active list visually and semantically via `data-active="true"`.
- Clicking a list invokes `onSelectList(listId)`, triggering [tasks](tasks.md) loading for that specific list.
- Header contains an action button opening the `CreateListModal`.
- Custom list items include inline buttons to open `EditListModal` (rename) or trigger `DeleteListModal` (deletion).

## Modals & List Mutations

### List Creation Modal (`CreateListModal`)
`src/components/CreateListModal.tsx` handles new list registration:
- **Validation**: Requires 1 to 255 characters. Displays real-time errors when empty or exceeding 255 characters, disabling the submit button until valid.
- **Submission**: Dispatches `POST /lists` with `{ name: trimmedName }` via [api-client](api-client.md).
- **Callback**: Passes the newly created `TodoList` to `onListCreated` and closes the modal.

### List Edit Modal (`EditListModal`)
`src/components/EditListModal.tsx` provides list renaming:
- Pre-populates the input with the current list name.
- Enforces identical 1–255 character validation constraints.
- Dispatches `PATCH /lists/:id` with `{ name: trimmedName }`.
- Passes the updated `TodoList` to `onListUpdated`.

### List Deletion Modal (`DeleteListModal`)
`src/components/DeleteListModal.tsx` presents a destructive confirmation dialog:
- Warns the user that deleting the list removes all associated tasks permanently.
- Dispatches `DELETE /lists/:id` with loading state feedback.
- Invokes `onListDeleted(listId)`.

### Active List Deletion Fallback
When the currently selected list is deleted, `DashboardPage` automatically falls back to the default list (or the first available list) and queries `/todos?list_id=${defaultList.id}` to prevent empty or broken views.

## Networking Integration

List network calls are abstracted through dedicated methods in `src/api/client.ts`:
- `getLists()`: Fetches all lists (`GET /lists`).
- `createList(data)`: Creates a new list (`POST /lists`).
- `updateList(id, data)`: Renames an existing list (`PATCH /lists/:id`).
- `deleteList(id)`: Deletes a list (`DELETE /lists/:id`).
