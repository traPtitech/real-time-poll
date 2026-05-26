FROM oven/bun:1-slim@sha256:d56a2534ffd262e92c12fd3249d3924d296d97086da773f821d7d0477435ea04

WORKDIR /app

COPY server/package.json server/bun.lock ./

RUN bun install --frozen-lockfile

COPY server/. ./

EXPOSE 3000
ENV PORT=3000

CMD ["bun", "run", "start"]
