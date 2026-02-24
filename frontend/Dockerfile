# Frontend Dockerfile - Next.js production build

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Installera dependencies
COPY package*.json ./
RUN npm ci

# Kopiera alla filer
COPY . .

# Bygg Next.js app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Installera dependencies
COPY package*.json ./
RUN npm ci

# Kopiera alla source files
COPY . .

# Port för frontend
ENV NODE_ENV=development
ENV PORT=3000
EXPOSE 3000

# Kör dev server för dynamic updates
CMD ["npm", "run", "dev"]
