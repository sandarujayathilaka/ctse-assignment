# Stage 1: Build
FROM node:18-alpine AS build

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Install Datadog APM agent with optimized settings
ENV DD_AGENT_HOST=datadog-agent
ENV DD_TRACE_SAMPLE_RATE=0.5
ENV DD_PROFILING_ENABLED=false
ENV DD_RUNTIME_METRICS_ENABLED=false
RUN npm install --global dd-trace

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set environment variables
ENV NODE_ENV production
ENV PORT 3000

# Copy only necessary files from the build stage
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/src ./src

# Install only production dependencies with reduced memory usage
RUN npm ci --only=production --no-optional --no-audit

# Add NODE_OPTIONS to limit memory usage
ENV NODE_OPTIONS="--max-old-space-size=384"

# Use non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 3000

# Health check with longer interval to reduce resource usage
HEALTHCHECK --interval=60s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "--optimize_for_size", "--gc_interval=100", "src/server.js"]