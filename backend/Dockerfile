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

# Starta backend i development mode
ENV NODE_ENV=development
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "run", "dev"]
