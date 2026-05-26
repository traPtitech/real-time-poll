FROM oven/bun:1-slim@sha256:d56a2534ffd262e92c12fd3249d3924d296d97086da773f821d7d0477435ea04 AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . ./

RUN bun run build

FROM caddy:2-alpine@sha256:86deaf5e3d3408a6ccec08fbb79989783dd26e206ae10bcf78a801dc8c9ab794

WORKDIR /app

COPY ./deployment/Caddyfile /etc/caddy/
COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
