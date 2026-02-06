# Build stage
FROM node:22-alpine as build-stage

WORKDIR /app

# Build arguments for API URLs (set at build time)
ARG VITE_API_BASE_URL_V2=http://localhost:3002
ENV VITE_API_BASE_URL_V2=$VITE_API_BASE_URL_V2

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:stable-alpine as production-stage

# Copy built assets from build stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 