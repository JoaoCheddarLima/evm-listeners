FROM oven/bun:latest

WORKDIR /app

COPY . .

RUN bun install
RUN bun tsc

CMD ["yarn", "app"]