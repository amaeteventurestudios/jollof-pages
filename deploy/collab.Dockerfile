# Live collaboration server (collab/server.ts), bundled into one file so the image carries no node_modules.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY collab collab
COPY src src
RUN npm run build:collab

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production COLLAB_PORT=3102
COPY --from=build /app/dist/collab.mjs ./collab.mjs
USER node
EXPOSE 3102
CMD ["node", "collab.mjs"]
