# ================================
# FG Aesthetic NFC Loyalty System
# Frontend Dockerfile
# ================================
#
# Multi-stage build for optimized production image
#
# Build: docker build -t fgaesthetic-frontend .
# Run:   docker run -p 80:80 fgaesthetic-frontend

# ==================== Build Stage ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ==================== Production Stage ====================
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
