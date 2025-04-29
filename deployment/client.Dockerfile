FROM oven/bun:1-slim AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . ./

RUN bun run build

FROM caddy:2-alpine

WORKDIR /app

COPY ./deployment/Caddyfile /etc/caddy/
COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
