---
type: concept
title: API Client & Networking
summary: HTTP client abstraction using fetch with Bearer token injection, error handling, and session interceptors.
related: ["auth.md", "tasks.md", "attachments.md", "lists.md"]
source_paths: ["src/api/client.ts"]
---
# API Client & Networking

The application communicates with backend HTTP services through a centralized network client implemented in `src/api/client.ts`. This client wraps the standard browser `fetch` API, providing automatic base URL resolution, bearer authentication header injection, JSON payload handling, typed responses, and unified error handling.

## Module Structure

The client module exports:
- `client` / `apiClient`: An object providing convenient HTTP verb methods (`get`, `post`, `put`, `patch`, `delete`) as well as lower-level `request`.
- List helper functions: `getLists()`, `createList()`, `updateList()`, and `deleteList()`.
- `ApiError`: A custom error class encapsulating HTTP status codes and backend error payloads.
- Token helpers: `getToken()`, `setToken()`, `clearToken()`, and `TOKEN_KEY` constant (`'token'`).
- Lifecycle callbacks: `setOnUnauthorized()`.

## Base URL Configuration

The client resolves URLs via `getFullUrl(endpoint)`:
- If the endpoint already starts with `http://` or `https://`, it is used directly.
- Otherwise, it prepends the environment variable `import.meta.env.VITE_API_BASE_URL`.
- Trailing slashes on the base URL and leading slashes on the endpoint are stripped to prevent malformed URL paths.

## Request Pipeline and Header Injection

Every request executed through `request<T>(endpoint, options)` performs the following steps:

1. **URL Resolution**: Calls `getFullUrl(endpoint)`.
2. **Authorization Header**: Checks `getToken()`. If a token exists in `localStorage` and no `Authorization` header is present in `options.headers`, it automatically attaches:
   ```
   Authorization: Bearer <token>
   ```
3. **Content-Type Header**: If a request body is present and is a string, and no `Content-Type` header has been set, it defaults to:
   ```
   Content-Type: application/json
   ```
4. **Execution**: Issues the request with native `window.fetch`.

## HTTP Verb Helper Methods

The `client` object exposes helper methods that serialize non-string data to JSON automatically:

```typescript
client.get<T>(endpoint, options)
client.post<T>(endpoint, data, options)
client.put<T>(endpoint, data, options)
client.patch<T>(endpoint, data, options)
client.delete<T>(endpoint, options)

// List helpers (also available on client / apiClient)
getLists(): Promise<TodoList[]>
createList(data: { name: string } | string): Promise<TodoList>
updateList(id: string, data: { name: string } | string): Promise<TodoList>
deleteList(id: string): Promise<void>
```

## Error Handling and `ApiError`

When the backend returns an HTTP status outside the 200–299 range, the client parses the response and throws an `ApiError`:

```typescript
export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}
```

The error message is extracted from backend JSON responses containing a `detail` property (common in FastAPI and modern REST frameworks). If `detail` is not available, it defaults to `response.statusText` or a generic status string.

## Session Interception (401 Unauthorized)

Special handling applies when an HTTP `401 Unauthorized` status is received:

1. `clearToken()` is invoked immediately to purge the stale credential from `localStorage`.
2. The client checks if the request was an authentication endpoint (`/auth/login`, `/login`, or `/signup`).
   - If it was an authentication endpoint, it throws `ApiError` with the server detail (e.g., `"Invalid credentials"`), allowing the login form to show the failure.
   - If it was any other endpoint (such as `/todos` or `/assets/signed-url`), it detects an expired session and invokes `onUnauthorizedHandler` with `"Session expired. Please log in again."`.
3. If no handler has been registered yet (e.g. during initial bootstrapping), it writes the message into `sessionStorage` under `auth_expiration_message` and triggers a browser redirect to `/login`.

This coordination ensures seamless redirection and state cleanup across [auth](auth.md) and [tasks](tasks.md).
