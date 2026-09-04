import { describe, expect, it } from 'vitest';
import { calculate, distributeDailyKm } from './calc';
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
    const parts = distributeDailyKm(60, 3, 1);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(60, 1);
    expect(new Set(parts).size).toBeGreaterThan(1);
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
    if (result.листы.length >= 2) {
      const mileages = result.листы.map((l) => l.пробег);
      const allSame = new Set(mileages).size === 1;
      if (mileages[0] === mileages[1]) {
        expect(allSame).toBe(false);
      }
    }
  });
});
