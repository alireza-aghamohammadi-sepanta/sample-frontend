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
