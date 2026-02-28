# Frontend Dockerfile - Next.js production build

# Build stage
FROM node:18-alpine AS builder

ARG VERSION=0.40.0

WORKDIR /app

# Installera dependencies
COPY package*.json ./
RUN npm ci

# Kopiera alla filer
COPY . .

# Visa version under build
RUN echo "BUILDING FRONTEND v${VERSION}" && echo "NEXT_PUBLIC_VERSION=${VERSION}" > .env.local

# Bygg Next.js app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Installera production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Kopiera built app från builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Port för frontend
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Kör production server
CMD ["npm", "start"]
