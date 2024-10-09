FROM oven/bun:latest

WORKDIR /app

COPY . .
COPY .env /app/.env

RUN bun install
RUN bun tsc

CMD ["yarn", "app"]