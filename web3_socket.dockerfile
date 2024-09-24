FROM oven/bun:latest

WORKDIR /app

COPY . .

RUN bun install

CMD ["yarn", "start"]