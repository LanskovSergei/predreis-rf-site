#!/usr/bin/env bash
# Обновление уже развёрнутого демо: git pull + пересборка контейнера.
set -euo pipefail

BRANCH="${1:-main}"

echo "==> git pull ($BRANCH)"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Пересборка и перезапуск"
docker compose build
docker compose up -d

echo "==> Статус"
docker compose ps

sleep 2
curl -fsS http://127.0.0.1:8081/ > /dev/null && echo "demo: OK" || echo "demo: FAIL"
