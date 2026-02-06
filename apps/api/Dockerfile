# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and config
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY nest-cli.json ./
COPY webpack.config.js ./
COPY tsconfig*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build application (includes prisma generate + nest build)
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (--ignore-scripts to skip postinstall prisma generate)
RUN npm install --omit=dev --ignore-scripts

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy generated Prisma client from builder
COPY --from=builder /app/prisma/generated ./prisma/generated

# Expose port
EXPOSE 3002

# Start application
CMD ["node", "dist/main"]
