# Multi-stage Dockerfile for Healthcare Events Service
FROM node:20-alpine AS base

# Development stage
FROM base AS development
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port 3002 for healthcare events service
EXPOSE 3002

# Start the development server
CMD ["npx", "nx", "serve", "healthcare-events"]

# Production build stage  
FROM base AS production-build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and build
COPY . .
RUN npx nx build healthcare-events

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application and production dependencies
COPY --from=production-build /app/dist/apps/healthcare-events ./
COPY --from=production-build /app/node_modules ./node_modules

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S healthcare-events -u 1001

# Change ownership of the app directory
RUN chown -R healthcare-events:nodejs /app

# Set user
USER healthcare-events

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start the application
CMD ["node", "main.js"]