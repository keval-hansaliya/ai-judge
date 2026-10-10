# Multi-stage Dockerfile for AI Judge Backend

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate

# Final production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl for container health check
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --only=production

# Copy generated prisma client and source files from builder
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.js ./index.js

# Run as non-root user
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "index.js"]
