# Simple nginx-based Dockerfile for serving KAI-Fusion Widget
FROM nginx:alpine

# Install curl for docker-compose healthcheck compatibility
RUN apk add --no-cache curl

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy widget files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY ./dist/widget.iife.js /usr/share/nginx/html/
COPY README.md /usr/share/nginx/html/

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