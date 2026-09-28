# Multi-stage production build for Fastify TypeScript Document Extractor
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy source and tsconfig
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 4000

# Start Fastify server
CMD ["node", "dist/index.js"]
