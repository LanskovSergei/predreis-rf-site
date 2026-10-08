import { it, expect } from 'vitest';
import { calculate, MIN_CLOSING_FUEL } from './calc';
import type { ВходныеДанные, ВидСообщения } from './types';

let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const iso = (d: number) => `2026-09-${String(d).padStart(2, '0')}`;
const toMin = (s: string) => { const m = s.match(/(\d{2})\.(\d{2})\.(\d{4}) (\d{1,2}):(\d{2})/)!; return Date.UTC(+m[3], +m[2]-1, +m[1], +m[4], +m[5]) / 60000; };

it('fuel, odometer and time invariants hold on random inputs', () => {
  let checked = 0;
  for (let t = 0; t < 300; t++) {
    const days = 3 + Math.floor(rnd() * 12);
    const nDrivers = 1 + Math.floor(rnd() * 3);
    const vid = pick<ВидСообщения>(['городское', 'пригородное', 'междугородное', 'международное']);
    const all = Array.from({ length: days }, (_, i) => iso(i + 1));
    const drivers = Array.from({ length: nDrivers }, (_, k) => ({ фио: `В${k}`, дни: new Set(all.filter((_, i) => i % nDrivers === k && rnd() > 0.15)) }));
    const tank = pick<number | ''>(['', 40, 50, 60, 80, 120]);
    const refuels = Array.from({ length: Math.floor(rnd() * 6) }, () => ({
      дата: iso(1 + Math.floor(rnd() * (days + 2))),
      время: pick(['', '06:10', '07:45', '08:00', '11:20', '14:05', '17:00', '18:40', '21:15']),
      объём: Math.round(5 + rnd() * 60),
    }));
    const inp: ВходныеДанные = {
      марка: 'X', модель: 'Y', типТС: pick(['легковой', 'грузовой']), формаПЛ: '3', видТоплива: pick(['ДТ', 'Аи-92', 'Аи-95', 'Аи-100']),
      объёмБака: tank, среднийРасход: pick<number | ''>(['', 7, 12, 25]), старше10лет: rnd() > 0.5, прицепГруз: rnd() > 0.7, спецтехника: false,
      периодС: iso(1), периодПо: iso(days), видСообщения: vid, срокРейсаДней: vid === 'междугородное' || vid === 'международное' ? 1 + Math.floor(rnd() * 3) : '',
      одометрНаНачало: pick<number | ''>(['', 5000, 123456]), одометрНаКонец: '', остатокНаНачало: Math.round(rnd() * 70), остатокНаКонец: pick<number | ''>(['', 10, 15, 30]),
      водители: drivers, заправки: refuels,
    };
    const r = calculate(inp);
    const L = r.листы;
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      for (const v of [l.пробег, l.остатокВыдача, l.остатокЗакрытие, l.расходФакт, l.расходНорма, l.общееВремя]) expect(Number.isFinite(v)).toBe(true);
      expect(l.остатокВыдача).toBeGreaterThanOrEqual(0);
      expect(l.остатокЗакрытие).toBeGreaterThanOrEqual(MIN_CLOSING_FUEL - 0.05);
      expect(l.пробег).toBeGreaterThanOrEqual(0);
      expect(l.общееВремя).toBeGreaterThan(0);
      const added = (l.заправки ?? []).reduce((s, z) => s + z.объём, 0);
      expect(Math.abs(l.остатокЗакрытие - (l.остатокВыдача + added - l.расходФакт))).toBeLessThan(0.1);
      if (i > 0) {
        expect(Math.abs(l.остатокВыдача - L[i - 1].остатокЗакрытие)).toBeLessThan(0.02);
        expect(Math.abs(l.одометрВыдача - L[i - 1].одометрЗакрытие)).toBeLessThan(0.11);
      }
      const dep = toMin(l.выпуск), ret = toMin(l.возвращение);
      expect(ret).toBeGreaterThan(dep);
      for (const z of l.заправки ?? []) {
        // время заправки должно лежать внутри смены (в один из её дней)
        const [h, m] = z.время.split(':').map(Number);
        const tod = h * 60 + m;
        const depTod = dep % 1440, retTod = ret % 1440;
        if (ret - dep < 1440) expect(tod >= depTod && tod <= (retTod < depTod ? retTod + 1440 : retTod)).toBe(true);
      }
    }
    checked++;
  }
  expect(checked).toBe(300);
});
