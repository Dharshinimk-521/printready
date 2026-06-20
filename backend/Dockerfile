
# Multi-stage build:
#   Stage 1 (builder) — installs ALL dependencies, copies source
#   Stage 2 (runner)  — only production dependencies + source,
#                        smaller final image, no dev tools included
# Build:  docker build -t printready-backend .
# Run:    docker run -p 5000:5000 --env-file .env printready-backend

# ── Stage 1: Builder 
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files FIRST - Docker caches this layer.
# npm install only re-runs when package.json actually changes, not every time you edit a .js file. Speeds up rebuilds a lot.
COPY package*.json ./
RUN npm install

COPY . .

# ── Stage 2: Production runner 
FROM node:20-alpine AS runner

WORKDIR /app

# Only install production deps here (skips nodemon etc.)
COPY package*.json ./
RUN npm install --omit=dev

# Copy actual source code from the builder stage
COPY --from=builder /app/server.js     ./server.js
COPY --from=builder /app/config        ./config
COPY --from=builder /app/controllers   ./controllers
COPY --from=builder /app/middleware    ./middleware
COPY --from=builder /app/routes        ./routes
COPY --from=builder /app/services      ./services
COPY --from=builder /app/utils         ./utils

# Folders the app writes to at runtime (mostly unused now since files go to Azure, but kept for safety)
RUN mkdir -p uploads logs

# Run as a non-root user - standard security practice for containers.
# If an attacker ever exploits the app, they don't get root access to the container's filesystem.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

# Docker periodically calls this to check if the container is healthy.
# If it fails repeatedly, Docker/Render can restart the container.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]