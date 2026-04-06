# ── Build stage ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace config
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies
RUN npm install

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/
COPY packages/frontend/ ./packages/frontend/
COPY tsconfig.json ./

# Build shared types (needed by both frontend and backend)
RUN npm run build -w packages/shared

# Build frontend
RUN npm run build -w packages/frontend

# Build backend
RUN npm run build -w packages/backend

# ── Production stage ──────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Install production deps only
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

RUN npm install --omit=dev

# Copy shared compiled output (needed at runtime for imports)
COPY packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist/ ./packages/shared/dist/

# Copy built backend
COPY --from=builder /app/packages/backend/dist/ ./packages/backend/dist/

# Copy built frontend
COPY --from=builder /app/packages/frontend/dist/ ./packages/frontend/dist/

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/droneroute.db

EXPOSE 3001

VOLUME ["/app/data"]

CMD ["node", "packages/backend/dist/index.js"]
