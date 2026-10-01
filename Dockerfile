# Shareable SALT demo: the built app plus the live endpoint (server/live.ts).
# The SALT access key is a Fly secret (SALT_MCP_KEY), never baked into the image.
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
# The assistant reads the demo's trip fixture (host data) at runtime.
COPY src/data ./src/data
COPY src/domain ./src/domain
EXPOSE 8080
CMD ["node", "server/index.ts"]
