FROM oven/bun:1-slim

WORKDIR /app

COPY server/package.json server/bun.lock ./

RUN bun install

COPY server/. ./

EXPOSE 3000
ENV PORT=3000

CMD ["bun", "run", "start"]
