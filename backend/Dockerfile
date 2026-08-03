# Use official lightweight Bun alpine image
FROM oven/bun:1-alpine AS base

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN bun install --frozen-lockfile || bun install

# Copy backend source code
COPY . .

# Create uploads and data directories
RUN mkdir -p uploads

EXPOSE 3005

ENV NODE_ENV=production
ENV PORT=3005

CMD ["bun", "src/index.ts"]
