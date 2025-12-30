### Build the standalone widget bundle (widget.iife.js) inside the image
FROM node:22-alpine AS build

WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the widget sources
COPY tsconfig.json vite.config.ts vite.config.standalone.ts ./
COPY src ./src

# Produce dist/widget.iife.js (via vite.config.standalone.ts)
RUN npm run build:standalone

### Runtime image: serve static files from nginx
FROM nginx:alpine

# Install curl for docker-compose healthcheck compatibility
RUN apk add --no-cache curl

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy widget playground/docs page
COPY index.html /usr/share/nginx/html/
COPY README.md /usr/share/nginx/html/

# Copy the built standalone widget bundle
# - keep compatibility with the existing expected path: /widget.iife.js
# - also keep /dist for any additional build artifacts (e.g. extracted CSS)
COPY --from=build /app/dist/ /usr/share/nginx/html/dist/
COPY --from=build /app/dist/widget.iife.js /usr/share/nginx/html/widget.iife.js

# Create nginx configuration for widget serving
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Enable CORS for widget.js \
    location ~* \.(js)$ { \
        add_header Access-Control-Allow-Origin "*"; \
        add_header Access-Control-Allow-Methods "GET, OPTIONS"; \
        add_header Access-Control-Allow-Headers "Content-Type"; \
        expires 1d; \
    } \
    \
    # Serve index.html for root and any path \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Health check endpoint \
    location /health { \
        return 200 "healthy"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
