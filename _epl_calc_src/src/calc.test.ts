import { describe, expect, it } from 'vitest';
import { allocateVariedMileages, calculate, distributeDailyKm } from './calc';
import type { ПутевойЛист } from './types';
import type { ВходныеДанные } from './types';

function baseInput(overrides: Partial<ВходныеДанные> = {}): ВходныеДанные {
  return {
    марка: 'ГАЗ',
    модель: '3302',
    типТС: 'легковой',
    формаПЛ: '3',
    видТоплива: 'Аи-95',
    объёмБака: '',
    среднийРасход: 10,
    старше10лет: false,
    прицепГруз: false,
    спецтехника: false,
    периодС: '2025-06-01',
    периодПо: '2025-06-07',
    видСообщения: 'городское',
    срокРейсаДней: '',
    одометрНаНачало: 1000,
    одометрНаКонец: '',
    остатокНаНачало: 30,
    остатокНаКонец: 10,
    водители: [{ фио: 'Иванов И.И.', дни: new Set(['2025-06-01', '2025-06-02', '2025-06-03']) }],
    заправки: [],
    ...overrides,
  };
}

describe('distributeDailyKm', () => {
  it('splits total with different day values', () => {
    const parts = distributeDailyKm(150, 3, 1);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(150, 1);
    expect(new Set(parts).size).toBeGreaterThan(1);
    expect(Math.max(...parts) - Math.min(...parts)).toBeGreaterThanOrEqual(10);
  });
});

describe('calculate refuels', () => {
  it('accounts for refuels on days without marked shifts', () => {
    const input = baseInput({
      водители: [{ фио: 'Иванов И.И.', дни: new Set(['2025-06-01', '2025-06-02', '2025-06-03']) }],
      заправки: [
        { дата: '2025-06-01', время: '08:00', объём: 20 },
        { дата: '2025-06-02', время: '09:00', объём: 25 },
        { дата: '2025-06-04', время: '10:00', объём: 30 },
        { дата: '2025-06-05', время: '11:00', объём: 15 },
        { дата: '2025-06-06', время: '12:00', объём: 22 },
      ],
    });

    const result = calculate(input);
    expect(result.листы.length).toBeGreaterThan(0);
    expect(result.предупреждения.some((w) => w.includes('заправок'))).toBe(true);
    expect(result.листы[0].пробегПоДням.length).toBeGreaterThan(0);
  });

  it('works without tank volume', () => {
    const input = baseInput({
      объёмБака: '',
      заправки: [{ дата: '2025-06-01', время: '08:00', объём: 40 }],
    });
    const result = calculate(input);
    expect(result.листы.length).toBe(3);
    expect(result.предупреждения.some((w) => w.includes('объём бака'))).toBe(true);
  });
});

describe('calculate mileage variation', () => {
  it('varies equal per-shift mileage in results', () => {
    const input = baseInput({
      заправки: [
        { дата: '2025-06-01', время: '08:00', объём: 30 },
        { дата: '2025-06-02', время: '08:00', объём: 30 },
        { дата: '2025-06-03', время: '08:00', объём: 30 },
      ],
    });
    const result = calculate(input);
    expect(result.листы.length).toBeGreaterThanOrEqual(2);
    const mileages = result.листы.map((l) => l.пробег);
    expect(new Set(mileages).size).toBeGreaterThan(1);
    expect(Math.max(...mileages) - Math.min(...mileages)).toBeGreaterThanOrEqual(10);
  });

  it('varies mileage across driver handover', () => {
    const input = baseInput({
      среднийРасход: 22.75,
      типТС: 'грузовой',
      формаПЛ: '4-c',
      периодС: '2026-08-20',
      периодПо: '2026-08-28',
      одометрНаНачало: 6900,
      остатокНаНачало: 60,
      водители: [
        { фио: 'Первый Е.В.', дни: new Set(['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-25', '2026-08-26']) },
        { фио: 'Второй П.Т.', дни: new Set(['2026-08-27', '2026-08-28']) },
      ],
      заправки: [
        { дата: '2026-08-20', время: '08:00', объём: 40 },
        { дата: '2026-08-25', время: '08:00', объём: 40 },
        { дата: '2026-08-27', время: '08:00', объём: 40 },
      ],
    });
    const result = calculate(input);
    expect(result.листы.length).toBeGreaterThanOrEqual(3);
    const mileages = result.листы.map((l) => l.пробег);
    expect(Math.max(...mileages) - Math.min(...mileages)).toBeGreaterThanOrEqual(10);

    const handoverIdx = result.листы.findIndex((l) => l.водитель === 'Второй П.Т.');
    expect(handoverIdx).toBeGreaterThan(0);
    expect(result.листы[handoverIdx].пробег).not.toBe(result.листы[handoverIdx - 1].пробег);
  });
});

describe('calculate work hours', () => {
  it('uses 6-8 hour shift with return between 15:00 and 18:00', () => {
    const input = baseInput({
      заправки: [{ дата: '2025-06-01', время: '08:00', объём: 40 }],
    });
    const result = calculate(input);
    expect(result.листы.length).toBeGreaterThan(0);

    for (const sheet of result.листы) {
      const dep = sheet.выпуск.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
      const ret = sheet.возвращение.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
      expect(dep).toBeTruthy();
      expect(ret).toBeTruthy();

      const depH = Number(dep![4]);
      const depM = Number(dep![5]);
      const retH = Number(ret![4]);

      expect(depH).toBe(8);
      expect(depM).toBeGreaterThanOrEqual(2);
      expect(depM).toBeLessThanOrEqual(8);
      expect(retH).toBeGreaterThanOrEqual(15);
      expect(retH).toBeLessThanOrEqual(18);
      expect(sheet.общееВремя).toBeGreaterThanOrEqual(6);
      expect(sheet.общееВремя).toBeLessThanOrEqual(8.5);
    }
  });

  it('places refuel at least 15 minutes after departure', () => {
    const input = baseInput({
      заправки: [{ дата: '2025-06-01', время: '08:00', объём: 40, адрес: 'Лукойл' }],
    });
    const result = calculate(input);
    const sheet = result.листы[0];
    expect(sheet.заправки?.length).toBe(1);

    const dep = sheet.выпуск.match(/\s+(\d{1,2}):(\d{2})$/);
    const ref = sheet.заправки![0].время.match(/^(\d{1,2}):(\d{2})$/);
    const depMin = Number(dep![1]) * 60 + Number(dep![2]);
    const refMin = Number(ref![1]) * 60 + Number(ref![2]);
    expect(refMin - depMin).toBeGreaterThanOrEqual(15);
  });
});

describe('allocateVariedMileages', () => {
  it('keeps total and spreads values for similar sheets', () => {
    const sheets: ПутевойЛист[] = [
      {
        номер: 5,
        формаПЛ: '4-c',
        выпуск: '26.08.2026 08:00',
        возвращение: '26.08.2026 09:37',
        водитель: 'Первый Е.В.',
        общееВремя: 1.6,
        одометрВыдача: 6975.9,
        одометрЗакрытие: 7049.2,
        пробег: 73.3,
        пробегПоДням: [73.3],
        остатокВыдача: 60,
        остатокЗакрытие: 43.33,
        расходНорма: 16.67,
        расходФакт: 16.67,
        видСообщения: 'городское',
        маршрут: [],
      },
      {
        номер: 6,
        формаПЛ: '4-c',
        выпуск: '27.08.2026 08:00',
        возвращение: '27.08.2026 09:37',
        водитель: 'Второй П.Т.',
        общееВремя: 1.6,
        одометрВыдача: 7049.2,
        одометрЗакрытие: 7122.5,
        пробег: 73.3,
        пробегПоДням: [73.3],
        остатокВыдача: 43.33,
        остатокЗакрытие: 26.66,
        расходНорма: 16.67,
        расходФакт: 16.67,
        видСообщения: 'городское',
        маршрут: [],
      },
      {
        номер: 7,
        формаПЛ: '4-c',
        выпуск: '28.08.2026 08:00',
        возвращение: '28.08.2026 09:37',
        водитель: 'Второй П.Т.',
        общееВремя: 1.6,
        одометрВыдача: 7122.5,
        одометрЗакрытие: 7195.7,
        пробег: 73.2,
        пробегПоДням: [73.2],
        остатокВыдача: 26.66,
        остатокЗакрытие: 10,
        расходНорма: 16.66,
        расходФакт: 16.66,
        видСообщения: 'городское',
        маршрут: [],
      },
    ];

    const parts = allocateVariedMileages(sheets, 219.8);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(219.8, 1);
    expect(Math.max(...parts) - Math.min(...parts)).toBeGreaterThanOrEqual(10);
    expect(parts[1]).not.toBe(parts[0]);
  });
});
