# Калькулятор ГСМ — публичное демо

Отдельный, самостоятельный проект: упрощённая публичная витрина основного
калькулятора восстановления путевых листов ([EPL_Calculator](https://github.com/LanskovSergei/EPL_Calculator)).
Считает через тот же FastAPI-бэкенд, что и основной проект — код здесь не
дублирует бэкенд-логику, только зовёт `/api/calculate` (с офлайн-фолбэком
на клиентский движок, если бэкенд недоступен).

Референсы по духу (простота/полировка UX), не по содержанию —
[calcus.ru](https://calcus.ru/kalkulyator-rashoda-topliva),
[kalkulaator.ee](https://www.kalkulaator.ee/ru/kalkulyator-topliva).
Подробнее о дизайн-концепции — `DEMO_NOTES.md`.

## Запуск для разработки

```bash
npm install
cp .env.example .env.local
# впиши в .env.local адрес бэкенда, например VITE_API_URL=http://localhost:8000
npm run dev
```

Бэкенд — из основного репозитория ([EPL_Calculator/backend](https://github.com/LanskovSergei/EPL_Calculator)),
запускается отдельно (`uvicorn app.main:app --reload --port 8000`). CORS на
бэкенде должен разрешать origin этого демо (`ALLOWED_ORIGINS` в `backend/.env`).

## Тесты

```bash
npm test
```

## Сборка

```bash
npm run build
```

## Деплой

См. `deploy/DEPLOY.md` — Docker + nginx + certbot, по тому же паттерну, что
и в EPL_Calculator, но без прокси на бэкенд (кросс-доменный вызов напрямую).

## Структура

```
├─ index.html
├─ src/
│  ├─ main.tsx      # точка входа
│  ├─ App.tsx        # весь UI демо (форма + результат)
│  ├─ api.ts          # вызов бэкенда + офлайн-фолбэк
│  ├─ calc.ts          # офлайн-движок расчёта (копия из EPL_Calculator)
│  ├─ types.ts          # типы данных (копия из EPL_Calculator)
│  └─ styles.css         # вся вёрстка/токены дизайна
├─ Dockerfile
├─ docker-compose.yml
└─ deploy/
   ├─ DEPLOY.md
   ├─ nginx.conf         # внутри контейнера
   ├─ host-nginx.conf    # на хосте (SSL)
   └─ update.sh
```

`calc.ts`/`types.ts` — сознательно скопированы (не npm-пакет), чтобы проект
оставался полностью самостоятельным без монорепо-зависимостей. Если логика
расчёта в основном проекте поменяется — эти файлы нужно будет обновить
вручную (в `DEMO_NOTES.md` — где именно их брать).
