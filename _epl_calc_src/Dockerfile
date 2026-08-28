# Демо-калькулятор ГСМ: статическая сборка Vite -> nginx.
# В отличие от основного проекта, здесь нет прокси на /api — бэкенд живёт
# в другом репозитории/домене, вызов идёт напрямую по VITE_API_URL (см. .env.example).
# ВАЖНО: VITE_API_URL — build-time переменная (Vite инлайнит её в бандл),
# поэтому её нужно передать как build-arg, а не просто положить в .env рантайма.

FROM node:20-slim AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O - http://127.0.0.1/ >/dev/null || exit 1
