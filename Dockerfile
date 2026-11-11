# ==========================================
# SakuKu WhatsApp Bot Worker Dockerfile
# Optimized for Koyeb / Render Free Tier
# Memory Footprint: < 150MB
# ==========================================

FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .

RUN npx prisma generate

# ==========================================
# Runner Stage
# ==========================================
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 nodejs && useradd --uid 1001 --gid nodejs workeruser

COPY --from=builder --chown=workeruser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=workeruser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=workeruser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=workeruser:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=workeruser:nodejs /app/src ./src
COPY --from=builder --chown=workeruser:nodejs /app/tsconfig.json ./tsconfig.json

USER workeruser

EXPOSE 8080

CMD ["npx", "tsx", "src/bot/worker.ts"]
