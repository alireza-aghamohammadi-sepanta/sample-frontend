---
type: concept
title: System Architecture
summary: Architectural overview of the React 18, TypeScript, and Vite single-page application and its core subsystems.
related: ["routing.md", "auth.md", "api-client.md", "tasks.md", "attachments.md", "deployment.md", "testing.md"]
source_paths: ["package.json", "src/main.tsx", "src/App.tsx", "vite.config.ts"]
---
# System Architecture

`sample-frontend` is a Single Page Application (SPA) designed for task and todo management with direct-to-cloud media attachment capabilities. The application is built with React 18, TypeScript, and Vite, packaged within a multi-stage Docker container, and served through an unprivileged Nginx web server configured for Google Cloud Run.

## Technology Stack

The application relies on modern frontend tooling and minimal runtime dependencies:

- **UI Framework**: [React 18](https://react.dev/) (`react`, `react-dom`) using functional components and React Hooks.
- **Language**: [TypeScript](https://www.typescriptlang.org/) configured with strict typing, React JSX transforms, and ES2020 target modules.
- **Build Tooling & Dev Server**: [Vite](https://vitejs.dev/) with `@vitejs/plugin-react` providing rapid hot module replacement (HMR) and optimized rollup production bundles.
- **Routing**: [React Router DOM v6](https://reactrouter.com/) for client-side routing, protected route guards, and history manipulation.
- **Testing**: [Vitest](https://vitest.dev/) with `jsdom` and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`).
- **Production Web Server**: [Nginx (unprivileged Alpine image)](https://hub.docker.com/r/nginxinc/nginx-unprivileged) configured for client-side SPA routing fallback and asset caching.

## Component and Application Hierarchy

The application component tree is organized hierarchically starting from the DOM mount point:

```
src/main.tsx (ReactDOM.createRoot('#root'))
 └── React.StrictMode
      └── App (src/App.tsx)
           └── BrowserRouter
                └── AuthProvider (src/context/AuthContext.tsx)
                     └── AppRoutes
                          ├── Route "/login"     -> LoginPage
                          ├── Route "/register"  -> RegisterPage
                          ├── Route "/"          -> ProtectedRoute
                          │                           └── DashboardPage
                          │                                ├── TaskFilter
                          │                                ├── TaskList
                          │                                │    └── TaskItem
                          │                                │         └── AttachmentChip
                          │                                ├── EmptyState
                          │                                ├── CreateTaskModal
                          │                                │    ├── AttachmentUploader
                          │                                │    └── AttachmentChip
                          │                                ├── EditTaskModal
                          │                                │    ├── AttachmentUploader
                          │                                │    └── AttachmentChip
                          │                                └── DeleteConfirmModal
                          └── Route "*"          -> Navigate to "/"
```

See [routing](routing.md) for detailed route pathing and protection flows.

## State Management Architecture

State in `sample-frontend` follows a layered pattern without requiring external state stores like Redux:

1. **Global Authentication State**: Managed by `AuthProvider` in [auth](auth.md), exposing `token`, `isAuthenticated`, and session expiration alert strings via the `useAuth()` custom hook.
2. **View and Entity State**: The [tasks](tasks.md) view (`DashboardPage`) maintains task collections in React local state (`todos`), triggering immediate updates on creation, edit, or deletion.
3. **Optimistic Updates**: `TaskItem` applies optimistic UI state toggles when completing tasks, reverting only upon API error responses.
4. **Service Layer**: Non-UI side effects, such as HTTP communication in [api-client](api-client.md) and Google Cloud Storage uploads in [attachments](attachments.md), are decoupled into dedicated utility services.

## Backend and Cloud Services Integration

The frontend interfaces with two primary backend targets:

1. **RESTful Application Backend**: Provides authentication (`/auth/login`, `/signup`), task CRUD operations (`/todos`), and signed URL generation (`/assets/signed-url`, `/assets/confirm`).
2. **Google Cloud Storage (GCS)**: Files are uploaded directly from the browser to GCS via HTTP `PUT` requests against pre-signed URLs, preventing file upload bottlenecks through the application backend.

## Deployment Architecture

The application is containerized using a multi-stage Dockerfile that builds the static bundle and deploys it on Nginx, optimized for zero-downtime serverless environments such as Google Cloud Run. Refer to [deployment](deployment.md) for full containerization and caching specifications.
