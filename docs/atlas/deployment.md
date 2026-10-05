---
type: concept
title: Deployment & Containerization
summary: Multi-stage Docker packaging, unprivileged Nginx configuration, SPA rewrite rules, and security headers for Cloud Run.
related: ["architecture.md", "routing.md"]
source_paths: ["Dockerfile", "nginx.conf", "vite.config.ts", "package.json"]
---
# Deployment & Containerization

`sample-frontend` is packaged and distributed as a containerized static bundle using a multi-stage `Dockerfile` and an unprivileged Nginx web server. The deployment artifact is optimized for Google Cloud Run and similar container runtimes, exposing port 8080 and enforcing rigorous security and caching headers.

## Multi-Stage Dockerfile

The container build defined in `Dockerfile` uses two distinct stages to maintain minimal image size and attack surface:

```dockerfile
# Stage 1: Build the Vite TypeScript application
FROM node:22-alpine AS build

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json ./

# Install clean dependencies
RUN npm ci

# Copy application source code
COPY . .

# Build the production static distribution
RUN npm run build

# Stage 2: Serve static bundle with unprivileged Nginx
FROM nginxinc/nginx-unprivileged:alpine AS runtime

# Copy static bundle from builder stage
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
```

### Stage Characteristics
1. **Builder Stage (`node:22-alpine`)**:
   - Uses `npm ci` to guarantee deterministic dependency resolution.
   - Executes `npm run build` (`tsc && vite build`) to generate the bundled application into `/app/dist`.
2. **Runtime Stage (`nginxinc/nginx-unprivileged:alpine`)**:
   - Runs as non-root user `nginx` (UID 101) to adhere to least-privilege security principles.
   - Copies only the compiled `/dist` directory and custom `nginx.conf`, omitting Node.js, npm, and source files.

## Nginx Configuration (`nginx.conf`)

`nginx.conf` handles routing, compression, security, and asset caching:

### 1. Port & Root
Listens on port `8080` (standard for Google Cloud Run) with document root `/usr/share/nginx/html`.

### 2. Client-Side SPA Fallback
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
All direct URL navigations and page refreshes route through `index.html`, allowing React Router to manage client routes.

### 3. Caching Strategies
- **Hashed Assets (`/assets/`)**:
  ```nginx
  location /assets/ {
      expires 1y;
      add_header Cache-Control "public, max-age=31536000, immutable";
      access_log off;
  }
  ```
  Vite generates content-hashed filenames for scripts and CSS chunks. These are cached immutably for 1 year.
- **Entry HTML (`/index.html`)**:
  ```nginx
  location = /index.html {
      expires -1;
      add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
  }
  ```
  Prevents browser caching of `index.html` so that users receive new deployment updates immediately.

### 4. Gzip Compression
Enables Gzip compression (`gzip_comp_level 6`, `gzip_min_length 256`) for text, CSS, JavaScript, JSON, XML, and SVG formats.

### 5. Security Headers
Applies security headers across all responses:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`:
  ```
  default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' http: https:;
  ```

For details on application routing patterns, see [routing](routing.md). For high-level technology stack details, see [architecture](architecture.md).
