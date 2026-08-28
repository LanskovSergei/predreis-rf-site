# Деплой демо-калькулятора

Отдельный проект от EPL_Calculator, использует тот же бэкенд по кросс-доменному
запросу. Можно развернуть на том же сервере, что и основной проект (другой
поддомен), или на отдельном — принципиальной разницы нет.

```
Интернет → хостовый nginx (443, SSL) → docker: demo:8081 (nginx, только статика)
                                                    │
                                                    └─ fetch('{VITE_API_URL}/api/...')
                                                       напрямую в бэкенд EPL_Calculator
```

## Шаг 0 — важно: настроить CORS на бэкенде

На сервере, где крутится бэкенд EPL_Calculator, в `backend/.env` добавь домен
демо в `ALLOWED_ORIGINS`:

```
ALLOWED_ORIGINS=https://gsm.example.ru,https://demo.example.ru
```

и перезапусти бэкенд (`docker compose up -d --build` в EPL_Calculator). Без
этого браузер будет резать кросс-доменные запросы демо к API (проверено:
без разрешённого origin бэкенд отвечает без заголовка
`access-control-allow-origin`, запрос не пройдёт).

## Шаг 1 — сервер

Тот же сервер, где уже стоит бэкенд (просто другой поддомен), либо новый
VPS. Если новый — Docker/nginx/certbot ставятся тем же скриптом, что и в
EPL_Calculator (`deploy/server-setup.sh` оттуда one-to-one подходит и сюда).
Направь DNS на IP заранее.

## Шаг 2 — код и сборка

```bash
git clone <URL-нового-репозитория> /opt/gsm-demo
cd /opt/gsm-demo

cp .env.example .env
nano .env   # VITE_API_URL=https://gsm.example.ru (адрес уже развёрнутого бэкенда)

docker compose build --build-arg VITE_API_URL=$(grep VITE_API_URL .env | cut -d= -f2)
# либо проще — .env уже подхватывается docker-compose.yml через ${VITE_API_URL}:
docker compose build
docker compose up -d
```

## Шаг 3 — хостовый nginx + SSL

```bash
cp deploy/host-nginx.conf /etc/nginx/sites-available/gsm-demo
nano /etc/nginx/sites-available/gsm-demo   # вписать реальный домен
ln -s /etc/nginx/sites-available/gsm-demo /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

certbot --nginx -d demo.example.ru
```

## Проверка

```bash
curl -I https://demo.example.ru
```

Открой в браузере, заполни форму (или оставь дефолтные демо-данные) →
«Посчитать». Если в предупреждениях нет «Бэкенд недоступен» — кросс-доменный
запрос дошёл и посчитал через реальный бэкенд.

## Обновление

```bash
cd /opt/gsm-demo
bash deploy/update.sh
```

## Важный нюанс: VITE_API_URL — время сборки, не рантайма

Vite инлайнит `VITE_API_URL` в JS-бандл на этапе `npm run build` /
`docker build`. Поменять адрес бэкенда для уже собранного контейнера —
нельзя правкой `.env` и перезапуском, нужно **пересобрать образ**
(`docker compose build`).
