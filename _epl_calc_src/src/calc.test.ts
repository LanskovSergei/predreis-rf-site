import { describe, expect, it } from 'vitest';
import {
  MIN_CLOSING_FUEL,
  MIN_DAILY_KM,
  MAX_DAILY_KM,
  allocateVariedMileages,
  calculate,
  distributeDailyKm,
} from './calc';
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
    // Заправка в середине дня не должна сдвигать типовое расписание смены.
    const input = baseInput({
      заправки: [{ дата: '2025-06-01', время: '11:00', объём: 40 }],
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

describe('fuel and mileage limits', () => {
  it('never shows closing fuel below 10 L or negative', () => {
    const input = baseInput({
      типТС: 'грузовой',
      формаПЛ: '4-c',
      среднийРасход: 22,
      остатокНаНачало: 35,
      остатокНаКонец: 10,
      объёмБака: 60,
      водители: [
        {
          фио: 'Второй В.Т.',
          дни: new Set(['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']),
        },
      ],
      заправки: [
        { дата: '2026-09-03', время: '08:00', объём: 30 },
        { дата: '2026-09-04', время: '08:30', объём: 30 },
        { дата: '2026-09-05', время: '08:00', объём: 30 },
      ],
    });
    const result = calculate(input);
    for (const sheet of result.листы) {
      expect(sheet.остатокЗакрытие).toBeGreaterThanOrEqual(MIN_CLOSING_FUEL);
      expect(sheet.остатокВыдача).toBeGreaterThanOrEqual(MIN_CLOSING_FUEL);
      expect(sheet.остатокЗакрытие).toBeLessThanOrEqual(60);
      if (sheet.пробег > 0) {
        expect(sheet.пробег).toBeGreaterThanOrEqual(MIN_DAILY_KM);
        expect(sheet.пробег).toBeLessThanOrEqual(MAX_DAILY_KM.грузовой);
      }
    }
  });

  it('starts odometer at 2500 km when not provided', () => {
    const input = baseInput({
      одометрНаНачало: '',
      заправки: [{ дата: '2025-06-01', время: '08:00', объём: 40 }],
    });
    const result = calculate(input);
    expect(result.листы[0].одометрВыдача).toBe(2500);
    expect(result.предупреждения.some((w) => w.includes('2500'))).toBe(true);
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

describe('client feedback: receipt time, tank room, manual consumption', () => {
  const minutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const timeOf = (dt: string) => dt.split(' ')[1];

  it('keeps the receipt time and extends the shift to cover a late refuel', () => {
    const result = calculate(baseInput({ заправки: [{ дата: '2025-06-01', время: '19:10', объём: 20 }] }));
    const sheet = result.листы[0];
    expect(sheet.заправки?.[0].время).toBe('19:10');
    expect(minutes(timeOf(sheet.возвращение))).toBeGreaterThanOrEqual(minutes('19:10') + 15);
    const span = (minutes(timeOf(sheet.возвращение)) - minutes(timeOf(sheet.выпуск))) / 60;
    expect(sheet.общееВремя).toBeCloseTo(span, 1);
  });

  it('moves departure earlier for an early-morning refuel', () => {
    const result = calculate(baseInput({ заправки: [{ дата: '2025-06-01', время: '07:30', объём: 20 }] }));
    const sheet = result.листы[0];
    expect(sheet.заправки?.[0].время).toBe('07:30');
    expect(minutes('07:30') - minutes(timeOf(sheet.выпуск))).toBeGreaterThanOrEqual(15);
  });

  it('fits an end-of-shift refuel because fuel was burned during the day', () => {
    const result = calculate(
      baseInput({
        объёмБака: 60,
        остатокНаНачало: 50,
        водители: [{ фио: 'Иванов И.И.', дни: new Set(['2025-06-01']) }],
        заправки: [{ дата: '2025-06-01', время: '17:00', объём: 30 }],
      }),
    );
    expect(result.предупреждения.some((w) => w.includes('не помещается'))).toBe(false);
    expect(result.листы[0].заправки?.[0].объём).toBe(30);
  });

  it('uses the manual average consumption exactly, coefficients go to the norm only', () => {
    const result = calculate(
      baseInput({ среднийРасход: 11.5, видСообщения: 'городское', заправки: [{ дата: '2025-06-02', время: '12:00', объём: 30 }] }),
    );
    for (const l of result.листы) {
      if (l.пробег <= 0) continue;
      expect((l.расходФакт / l.пробег) * 100).toBeCloseTo(11.5, 1);
      expect(l.расходНорма).toBeGreaterThan(l.расходФакт); // городское +10% к нормативу
    }
  });

  it('keeps fuel continuous between sheets and hits the requested end residual', () => {
    const result = calculate(
      baseInput({
        объёмБака: 60,
        остатокНаНачало: 25,
        остатокНаКонец: 20,
        водители: [
          { фио: 'Первый', дни: new Set(['2025-06-01', '2025-06-02']) },
          { фио: 'Второй', дни: new Set(['2025-06-03', '2025-06-04']) },
        ],
        заправки: [
          { дата: '2025-06-02', время: '16:40', объём: 35 },
          { дата: '2025-06-04', время: '09:15', объём: 25 },
        ],
      }),
    );
    const sheets = result.листы;
    for (let i = 1; i < sheets.length; i++) {
      expect(sheets[i].остатокВыдача).toBeCloseTo(sheets[i - 1].остатокЗакрытие, 2);
      expect(sheets[i].одометрВыдача).toBeCloseTo(sheets[i - 1].одометрЗакрытие, 1);
    }
    for (const l of sheets) {
      const added = (l.заправки ?? []).reduce((s, z) => s + z.объём, 0);
      expect(l.остатокЗакрытие).toBeCloseTo(l.остатокВыдача + added - l.расходФакт, 1);
      expect(l.остатокЗакрытие).toBeGreaterThanOrEqual(MIN_CLOSING_FUEL - 0.01);
    }
    expect(sheets[sheets.length - 1].остатокЗакрытие).toBeCloseTo(20, 0);
  });
});
