FROM node:14-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --only=production

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir logs
RUN npm run build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressots

COPY --from=deps --chown=expressots:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressots:nodejs /app/logs ./logs
COPY --from=builder --chown=expressots:nodejs /app/dist ./dist
COPY --from=builder --chown=expressots:nodejs app/entrypoint.sh app/tsconfig-paths-bootstrap.js app/tsconfig.json app/package.json ./

USER expressots

EXPOSE 5000

CMD ["npm", "run", "start:prod"]
