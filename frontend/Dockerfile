# ==============================================================================
# Multi-stage Dockerfile for LM Arena Frontend
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Argument to pass VITE_API_BASE at build time if needed
ARG VITE_API_BASE=/api/v1
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# Stage 2: Serve with Nginx Alpine
FROM nginx:alpine AS runner

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration supporting SPA routing and SSE proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
