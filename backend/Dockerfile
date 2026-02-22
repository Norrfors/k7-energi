# Backend Dockerfile - Production build
# Bygger TypeScript och kör prod-optimerad Node.js

FROM node:18-alpine

WORKDIR /app

# Installera OpenSSL för Prisma (Prisma kräver libssl.so.1.1)
RUN apk add --no-cache openssl

# Installera dependencies (inkl. devDependencies för TypeScript-build)
COPY package*.json ./
RUN npm ci

# Kopiera Prisma-schema och generera client
COPY prisma ./prisma
RUN npx prisma generate

# Kopiera TypeScript-filer
COPY src ./src
COPY tsconfig.json ./

# Hälsocheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Starta backend
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "run", "build-run"]
