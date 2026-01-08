FROM oven/bun:latest AS builder

ARG VITE_API_URL
ARG VITE_DOCKER=true

ENV VITE_API_URL=${VITE_API_URL} \
    VITE_DOCKER=${VITE_DOCKER}

WORKDIR /app

COPY package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun \
    bun install --frozen-lockfile

COPY . .

RUN bun run build

FROM nginxinc/nginx-unprivileged:1.29-alpine

LABEL org.opencontainers.image.title="Appliqué Frontend" \
	org.opencontainers.image.authors="Sven Becker <SvenBecker19@gmail.com>"

WORKDIR /usr/share/nginx/html
RUN mkdir -p /etc/nginx/extra-conf.d

COPY --from=builder /app/dist ./
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY ./nginx-backend-not-found.conf /etc/nginx/extra-conf.d/backend-not-found.conf

EXPOSE 8080
