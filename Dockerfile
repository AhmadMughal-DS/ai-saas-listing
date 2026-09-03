# ============================================
# Stage 1: Builder
# Install dependencies, build Vite frontend
# and bundle Express server with esbuild
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for the build)
RUN npm install

# Copy the rest of the source code
COPY . .

# Build args for VITE_ env vars (baked into frontend at build time)
ARG VITE_STRIPE_PUBLIC_KEY=""
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_PROJECT_ID=""

ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID

# Build: Vite bundles frontend → dist/ , esbuild bundles server → dist/server.cjs
RUN npm run build


# ============================================
# Stage 2: Production Runner
# Only copy built artifacts and prod deps
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency manifest and install production-only deps
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built output from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 3000

# Health check — ensures the container is serving responses
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Run the production server
CMD ["node", "dist/server.cjs"]
