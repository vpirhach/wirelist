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

# Generate Prisma Client and overlay onto @prisma/client so TS resolves types correctly
RUN npx prisma generate && cp -r prisma/generated/prisma/* node_modules/@prisma/client/

# Build application
RUN npx nest build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (--ignore-scripts to skip postinstall prisma generate)
RUN npm install --omit=dev --ignore-scripts

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy generated Prisma client from builder into node_modules
COPY --from=builder /app/prisma/generated/prisma/ ./node_modules/@prisma/client/

# Expose port
EXPOSE 3002

# Start application
CMD ["node", "dist/main"]
