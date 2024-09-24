FROM oven/bun:latest

WORKDIR /app

COPY . .

RUN bun install
RUN bun tsc

WORKDIR /build

RUN mv /app/.env /build/
RUN mv /app/dist /build/
RUN mv /app/node_modules /build/
RUN mv /app/package.json /build/
RUN rm -rf /app

CMD ["yarn", "app"]