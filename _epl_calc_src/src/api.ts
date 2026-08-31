/*
 * Клиент к бэкенду «Калькулятора ГСМ» (POST /api/calculate) — тому же
 * FastAPI-бэкенду, что обслуживает основной проект EPL_Calculator.
 * Этот демо-проект живёт в отдельном репозитории и домене, поэтому вызов
 * всегда кросс-доменный: адрес бэкенда задаётся VITE_API_URL (см. .env.example).
 * На бэкенде нужно добавить домен этого демо в ALLOWED_ORIGINS (CORS).
 *
 * Если бэкенд недоступен (сеть, CORS, сервер не запущен) — calculateSmart()
 * прозрачно откатывается на офлайн-движок calc.ts и добавляет об этом
 * предупреждение, чтобы пользователь понимал, что считалось локально.
 */
import type { ВходныеДанные, РезультатРасчёта } from './types';
import { calculate as calculateOffline } from './calc';

// Vite статически заменяет `import.meta.env.VITE_*` при трансформации файла,
// поэтому vi.stubEnv() в тестах не может подменить значение постфактум.
// __setApiBaseForTests — явная точка подмены для юнит-тестов (см. api.test.ts).
let _apiBaseOverride: string | undefined;

/** @internal только для тестов */
export function __setApiBaseForTests(value: string | undefined): void {
  _apiBaseOverride = value;
}

function apiBase(): string {
  if (_apiBaseOverride !== undefined) return _apiBaseOverride;
  return (import.meta as any).env?.VITE_API_URL || '';
}

function numOrNull(v: number | '' | null | undefined): number | null {
  return v === '' || v === null || v === undefined ? null : v;
}

export function toApiPayload(input: ВходныеДанные): Record<string, unknown> {
  return {
    ...input,
    объёмБака: numOrNull(input.объёмБака),
    среднийРасход: numOrNull(input.среднийРасход),
    срокРейсаДней: numOrNull(input.срокРейсаДней),
    одометрНаНачало: numOrNull(input.одометрНаНачало),
    остатокНаНачало: numOrNull(input.остатокНаНачало) ?? 0,
    водители: input.водители.map((d) => ({
      фио: d.фио,
      дни: Array.from(d.дни),
    })),
    заправки: input.заправки
      .filter((r) => r.дата && r.объём !== '')
      .map((r) => ({
        дата: r.дата,
        время: r.время || null,
        объём: r.объём,
        адрес: r.адрес || null,
      })),
  };
}

export class ApiError extends Error {
  detail: string[];
  constructor(detail: string[]) {
    super(detail.join('; '));
    this.detail = detail;
  }
}

/** Прямой вызов бэкенда. Бросает ApiError при 4xx/5xx, обычный Error — при сетевой ошибке. */
export async function calculateViaApi(input: ВходныеДанные): Promise<РезультатРасчёта> {
  const base = apiBase();
  if (!base) {
    throw new Error(
      'VITE_API_URL не задан — не знаю, к какому бэкенду обращаться (см. .env.example).',
    );
  }

  const resp = await fetch(`${base}/api/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(input)),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    const detail: string[] = Array.isArray(body?.detail)
      ? body.detail
      : [body?.detail ?? `Сервер вернул ошибку ${resp.status}`];
    throw new ApiError(detail);
  }

  return resp.json();
}

/**
 * «Умный» расчёт: сначала пробует бэкенд, при недоступности сервера
 * (не при ошибке валидации!) — считает локально через calc.ts и явно
 * предупреждает об этом в результате.
 */
export async function calculateSmart(input: ВходныеДанные): Promise<РезультатРасчёта> {
  if (!apiBase()) {
    // Бэкенд для этой (Light) версии калькулятора не предусмотрен — считаем
    // локально молча, это штатный режим, а не сбой, о котором нужно предупреждать.
    return calculateOffline(input);
  }
  try {
    return await calculateViaApi(input);
  } catch (err) {
    if (err instanceof ApiError) {
      // Ошибка валидации на бэкенде — это про данные, а не про доступность сервера.
      return { листы: [], предупреждения: err.detail, расход: null };
    }
    // Бэкенд был настроен (VITE_API_URL задан), но не отвечает — вот это уже
    // достойно предупреждения: тихий откат на офлайн-движок.
    const offline = calculateOffline(input);
    return {
      ...offline,
      предупреждения: [
        'Бэкенд недоступен — расчёт выполнен локально (офлайн-движок).',
        ...offline.предупреждения,
      ],
    };
  }
}
