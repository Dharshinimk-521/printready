
# Multi-stage build:
#   Stage 1 — Node builds the React app into static files (/dist)
#   Stage 2 — Nginx serves those static files (no Node needed at runtime)
#
# Build:  docker build -t printready-frontend --build-arg VITE_API_URL=https://your-backend-url .
# Run:    docker run -p 3000:80 printready-frontend

# ── Stage 1: Build the React app ─
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

# VITE_API_URL must be set at BUILD time, not runtime.
# Vite bakes environment variables directly into the JS bundle during the build step - there's no way to change it after
# the build is done, unlike backend env vars which load at runtime.
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build
# Output now sits in /app/dist

# ── Stage 2: Serve with Nginx 
FROM nginx:alpine AS runner

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80