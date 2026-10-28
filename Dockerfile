# Jollof Pages web app: Next.js (standalone) + Typst + fonts, with optional EPUBCheck.
# Build:  docker build --build-arg NEXT_PUBLIC_POCKETBASE_URL=https://pb.jollofpages.com -t jollof-pages .

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS tools
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates unzip xz-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY scripts/setup-tools.sh scripts/setup-tools.sh
RUN bash scripts/setup-tools.sh && rm -rf pocketbase

FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_POCKETBASE_URL
ENV NEXT_PUBLIC_POCKETBASE_URL=${NEXT_PUBLIC_POCKETBASE_URL} NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS run
# EPUBCheck needs a Java runtime. Set WITH_EPUBCHECK=false for a smaller image; the
# "Check with EPUBCheck" button then reports that the checker is not installed.
ARG WITH_EPUBCHECK=true
RUN if [ "$WITH_EPUBCHECK" = "true" ]; then apt-get update && apt-get install -y --no-install-recommends openjdk-17-jre-headless && rm -rf /var/lib/apt/lists/*; fi
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=tools /app/tools ./tools
COPY --from=tools /app/fonts ./fonts
# the writing assistant's memory (ASSISTANT_DIR) and its local embedding model (FastEmbed's local_cache)
RUN mkdir -p /data/assistant /app/local_cache && chown -R node /data /app/local_cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
