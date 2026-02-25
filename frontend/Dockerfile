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

# Installera alla dependencies (tailwindcss & postcss behövs ej i prod men .next redan compilerat)
COPY package*.json ./
RUN npm ci

# Kopiera built app från builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

# Hälsocheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Port för frontend
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
