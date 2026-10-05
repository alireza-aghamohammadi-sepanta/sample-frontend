---
okf_version: '0.2'
generated_at_commit: db5c53665a63b262cff56f8a6a5ebc6b5e80c67a
---
# Repository Documentation

Welcome to the technical documentation wiki for `sample-frontend`.

- [architecture](architecture.md) — architectural overview of the React 18, TypeScript, and Vite single-page application and its core subsystems.
- [auth](auth.md) — JWT-based authentication flow, session persistence, automatic 401 handling, and route protection.
- [api-client](api-client.md) — HTTP client abstraction using fetch with Bearer token injection, error handling, and session interceptors.
- [tasks](tasks.md) — todo lifecycle management including creation, listing, client-side filtering, optimistic updates, and deletion.
- [lists](lists.md) — organizational grouping of tasks into custom and default lists with sidebar navigation and modal management.
- [attachments](attachments.md) — direct-to-cloud asset upload architecture using signed URLs, validation rules, and media preview rendering.
- [routing](routing.md) — client-side routing configuration, route protection, and navigation flow.
- [deployment](deployment.md) — multi-stage Docker packaging, unprivileged Nginx configuration, SPA rewrite rules, and security headers for Cloud Run.
- [testing](testing.md) — Vitest and React Testing Library test architecture, test setup, mock patterns, and unit/integration coverage.
