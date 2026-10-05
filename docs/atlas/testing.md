---
type: concept
title: Testing Suite & Quality Assurance
summary: Vitest and React Testing Library test architecture, test setup, mock patterns, and unit/integration coverage.
related: ["tasks.md", "lists.md", "auth.md", "attachments.md", "api-client.md"]
source_paths: ["tests/setup.ts", "tests/auth.test.tsx", "tests/dashboard.test.tsx", "tests/task_create_toggle.test.tsx", "tests/task_edit_delete.test.tsx", "tests/attachments.test.tsx", "tests/lists.test.tsx", "vite.config.ts"]
---
# Testing Suite & Quality Assurance

The application uses [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) to validate functionality across authentication, task management, networking, and media attachments.

## Test Environment & Configuration

Testing configuration is declared in `vite.config.ts`:

```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './tests/setup.ts',
}
```

- **`globals: true`**: Injects test primitives (`describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`) globally without per-file imports.
- **`environment: 'jsdom'`**: Simulates standard browser DOM APIs in Node.js.
- **`setupFiles: './tests/setup.ts'`**: Imports `@testing-library/jest-dom` to provide custom DOM matchers such as `toBeInTheDocument()`, `toBeDisabled()`, and `toHaveValue()`.

Tests are executed with:
```bash
npm test
```
(which runs `vitest run`).

## Mocking Conventions

Tests isolate frontend behaviors using standard mocking strategies:

1. **Global Fetch Mocking**:
   Global `fetch` is mocked using `vi.fn()` to simulate backend REST API responses, headers, and error statuses:
   ```typescript
   globalThis.fetch = vi.fn().mockResolvedValue({
     ok: true,
     status: 200,
     headers: new Headers({ 'content-type': 'application/json' }),
     json: async () => ({ ... }),
   });
   ```

2. **Storage Cleanup**:
   Every test file resets `localStorage.clear()` and invokes `vi.restoreAllMocks()` in `beforeEach` and `afterEach` hooks to prevent state leakage.

3. **File Object Synthesis**:
   Upload tests construct mock `File` instances and override properties like `size` via `Object.defineProperty` to test boundary limits (such as the 500 MB limit).

## Test Suite Structure

The test suite is organized into modular files covering specific domains:

### 1. Authentication Tests (`tests/auth.test.tsx`)
- Verifies successful user registration and token persistence to `localStorage`.
- Tests duplicate email handling and registration validation (8+ character password requirement).
- Tests user login flow, invalid credential error handling, and logout cleanup.
- Validates automatic session expiry redirect on 401 Unauthorized API responses.
- Covers features described in [auth](auth.md).

### 2. Dashboard Tests (`tests/dashboard.test.tsx`)
- Verifies initial list and task loading, list-scoped querying (`/todos?list_id=...`), multi-tier sorting (due dates, active tasks, completed tasks), and loading indicators.
- Validates in-memory filtering across `'all'`, `'active'`, and `'completed'` states.
- Verifies empty state messages when filtered views have no matching items.
- Tests server error alerts when fetching tasks fails.
- Covers features described in [tasks](tasks.md).

### 3. Task Creation & Toggle Tests (`tests/task_create_toggle.test.tsx`)
- Tests opening and submitting the task creation modal with optional due date and list selection.
- Enforces title length limits (1–255 characters) and description limits (1024 characters).
- Verifies optimistic completion checkbox toggling and rollback behavior on network failure.
- Covers features described in [tasks](tasks.md).

### 4. Task Edit & Delete Tests (`tests/task_edit_delete.test.tsx`)
- Tests pre-filling task edit modal fields with existing data (including due date and list association).
- Verifies updating task titles, descriptions, due dates, list assignment, and asset lists.
- Tests delete confirmation modal flow, server deletion requests, and task list removal.
- Covers features described in [tasks](tasks.md).

### 5. Media Attachments Tests (`tests/attachments.test.tsx`)
- Tests MIME type validation (allowing `image/*` and `video/*`, rejecting other formats).
- Enforces the 500 MB file size limit and 10 attachment count limit.
- Tests the three-step signed URL upload flow (`signed-url` -> GCS PUT -> `confirm`).
- Validates thumbnail and video element rendering inside `AttachmentChip`.
- Covers features described in [attachments](attachments.md).

### 6. List Management Tests (`tests/lists.test.tsx`)
- Tests pinned default list positioning at the top of the sidebar and alphabetical sorting of custom lists.
- Verifies active list selection and semantic `data-active` state toggling.
- Tests presence of rename and delete triggers on custom lists and ensures default lists cannot be renamed or deleted.
- Validates list name constraints (1–255 characters, required) in `CreateListModal` and `EditListModal`.
- Verifies list creation (`POST /lists`), renaming (`PATCH /lists/:id`), and deletion (`DELETE /lists/:id`) flows.
- Covers features described in [lists](lists.md).
