# syntax=docker/dockerfile:1
# Container image for any Docker host or platform. Vercel ignores it.
#
# The page is generated at build time with the data from Meta, so the build needs the same
# variables as the running app, in either of two ways:
#   - a .env file in the build context (some platforms write it, e.g. Dokploy), or
#   - a build secret with id "env": docker build --secret id=env,src=.env.production .

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
# Next.js copies .env files into the standalone server: delete them so no secret
# reaches the final image (this stage is thrown away).
RUN --mount=type=secret,id=env,required=false \
    if [ -f /run/secrets/env ]; then cp /run/secrets/env .env.production.local; fi \
    && npm run build \
    && rm -f .env* .next/standalone/.env*

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
