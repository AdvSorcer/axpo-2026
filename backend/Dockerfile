FROM oven/bun:latest AS base
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --production

COPY src ./src
COPY tsconfig.json ./

EXPOSE 3001
ENV NODE_ENV=production

CMD ["bun", "src/index.ts"]
