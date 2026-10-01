---
type: concept
title: Application Routing
summary: Client-side routing configuration, route protection, and navigation flow.
related: ["auth.md", "tasks.md", "architecture.md"]
source_paths: ["src/App.tsx", "src/main.tsx", "src/components/ProtectedRoute.tsx"]
---
# Application Routing

Client-side navigation and routing in `sample-frontend` are powered by [React Router v6](https://reactrouter.com/) (`react-router-dom`). The routing configuration enforces authentication boundaries, supports history transitions, and handles fallback redirection.

## Route Definitions

Route configuration is declared in `src/App.tsx` within the `AppRoutes` component:

```tsx
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
```

### Route Table

| Path | Component | Guard | Description |
|---|---|---|---|
| `/login` | `LoginPage` | Public | User authentication and session expiration alerts |
| `/register` | `RegisterPage` | Public | New account registration |
| `/` | `DashboardPage` | Authenticated (`ProtectedRoute`) | Main task list, filtering, and CRUD operations |
| `*` | `<Navigate to="/" replace />` | N/A | Wildcard fallback redirecting unknown URLs to root |

## Route Guarding (`ProtectedRoute`)

`src/components/ProtectedRoute.tsx` prevents unauthenticated access to application resources:

1. Consumes authentication status via `const { isAuthenticated } = useAuth()`.
2. Obtains current location via `const location = useLocation()`.
3. If `isAuthenticated` is false, returns:
   ```tsx
   <Navigate to="/login" state={{ from: location }} replace />
   ```
   This passes the intended destination path in the navigation state, enabling post-login redirect strategies.
4. If `isAuthenticated` is true, renders the wrapped children (or `<Outlet />`).

Details on how authentication status is maintained are documented in [auth](auth.md).

## Root Application Shell (`App`)

The top-level `App` component in `src/App.tsx` establishes the runtime context providers:

```tsx
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};
```

Nesting `AuthProvider` inside `BrowserRouter` ensures that authentication logic has access to React Router's `useNavigate` hook for programmatic navigation upon login, logout, or session expiry.

## Server-Side Routing Fallback

In production, client-side routing requires the host server to redirect all non-file requests to `index.html`. This is implemented in Nginx via `try_files $uri $uri/ /index.html;`, as detailed in [deployment](deployment.md).
