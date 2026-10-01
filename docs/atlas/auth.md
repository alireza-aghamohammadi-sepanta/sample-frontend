---
type: concept
title: Authentication & Session Management
summary: JWT-based authentication flow, session persistence, automatic 401 handling, and route protection.
related: ["api-client.md", "routing.md", "tasks.md"]
source_paths: ["src/types/auth.ts", "src/context/AuthContext.tsx", "src/components/ProtectedRoute.tsx", "src/pages/LoginPage.tsx", "src/pages/RegisterPage.tsx", "tests/auth.test.tsx"]
---
# Authentication & Session Management

The application implements token-based user authentication backed by browser `localStorage` and `sessionStorage`. It provides user registration, login, logout, protected route gating, and centralized session expiry handling.

## Data Types and Contracts

Authentication contracts are declared in `src/types/auth.ts`:

- `LoginCredentials`: Required `{ email: string; password: string }` payload for logging in.
- `RegisterCredentials`: Required `{ email: string; password: string }` payload for creating an account.
- `TokenResponse`: Server response containing `{ access_token: string; token_type?: string }`.
- `AuthContextType`: Interface exposed to React components via the `useAuth()` hook:
  - `token: string | null`
  - `isAuthenticated: boolean`
  - `login: (credentials: LoginCredentials) => Promise<void>`
  - `register: (credentials: RegisterCredentials) => Promise<void>`
  - `logout: () => void`
  - `expirationMessage: string | null`
  - `setExpirationMessage: (message: string | null) => void`

## Authentication Context (`AuthContext`)

`src/context/AuthContext.tsx` wraps the application in `AuthProvider` and exports `useAuth()`.

### Key Behaviors

1. **Token Initialization**: Initializes `token` state synchronously from `localStorage.getItem('token')` using `getToken()` from [api-client](api-client.md).
2. **Login**: Submits credentials to `POST /auth/login`, saves `access_token` to `localStorage` and component state, and clears previous expiration messages.
3. **Register**: Submits credentials to `POST /signup`, saves the resulting token to `localStorage` and component state.
4. **Logout**: Clears the token from storage and state, clears expiration messages, and redirects the user to `/login`.

### Automatic 401 Unauthorized Interception

When an authenticated API request fails with an HTTP `401 Unauthorized` status (excluding initial login/signup requests), the networking layer triggers the `onUnauthorized` callback configured by `AuthProvider`:

```typescript
useEffect(() => {
  setOnUnauthorized((message: string) => {
    clearToken();
    setTokenState(null);
    setExpirationMessage(message);
    if (navigate) {
      navigate('/login');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  });

  return () => {
    setOnUnauthorized(null);
  };
}, [navigate]);
```

This clears the invalid token and immediately transitions the user to `/login` with an informational banner: `"Session expired. Please log in again."`.

If the 401 occurs before React navigation is mounted, `apiClient` falls back to storing `'auth_expiration_message'` in `sessionStorage`, which `AuthProvider` reads on subsequent load and consumes immediately.

## Route Protection (`ProtectedRoute`)

Located in `src/components/ProtectedRoute.tsx`, `ProtectedRoute` acts as a route guard for authenticated views:

- Inspects `isAuthenticated` from `useAuth()`.
- If true, renders the wrapped children (or `<Outlet />` if nested).
- If false, renders `<Navigate to="/login" state={{ from: location }} replace />`, preserving the originating path for potential redirection after login.

See [routing](routing.md) for details on the route tree.

## User Interface Pages

### Login Page (`LoginPage`)
`src/pages/LoginPage.tsx` renders the login form:
- Requires non-empty email and password fields.
- Displays `expirationMessage` from `AuthContext` when redirected due to an expired session.
- Displays form-level error messages returned from the API (such as `"Invalid credentials"` or custom `detail` messages).
- Navigates to `/` upon successful authentication.

### Register Page (`RegisterPage`)
`src/pages/RegisterPage.tsx` renders the registration form:
- Validates that email and password are provided.
- Enforces a client-side minimum password length of at least 8 characters.
- Displays server validation errors (such as duplicate email conflicts).
- Logs the user in automatically upon receipt of the registration token and navigates to `/`.

For information on how authenticated requests include tokens, see [api-client](api-client.md).
