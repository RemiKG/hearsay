# Hearsay — one image, one origin (serves the SPA + the whole society API).
# Ideal for a Docker deploy on Alibaba Cloud ECS / Simple Application Server (Singapore).

# ── build ──────────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build            # -> dist/ (client)  +  dist-server/index.js (bundled server)

# ── runtime (tiny: the server bundle is self-contained) ─────────────────────
FROM node:20-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8787
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/package.json ./package.json
EXPOSE 8787
# DASHSCOPE_API_KEY (and optional TELEGRAM_BOT_TOKEN / SMTP_URL) are injected as env
# at run time — never baked into the image. Without them the app degrades honestly.
CMD ["node", "dist-server/index.js"]
