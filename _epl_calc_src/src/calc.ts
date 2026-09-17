/*
 * Калькулятор ГСМ — движок расчёта пробега (Шаг 1.1, MVP).
 *
 * Чистые функции без обращения к DOM: принимают исходные данные,
 * возвращают массив путевых листов и предупреждения.
 *
 * Основная формула (ТЗ, раздел «Модель калькуляции»):
 *   Пробег в день (км) = затраты ГСМ в день (л) / (средний расход (л/100км) / 100)
 *                      = затраты ГСМ (л) * 100 / средний расход (л/100км)
 */

import type {
  ВходныеДанные,
  РезультатРасчёта,
  СводкаРасхода,
  ПутевойЛист,
  Смена,
  ВидСообщения,
  ТипТС,
  ВидТоплива,
  ФормаПЛ,
  ЗаправкаНаЛисте,
} from './types';
import { формаПоТипуТС } from './formPl';

// ------- Константы и справочные значения -------

/** Ограничения пробега за сутки (ТЗ: «предел разумного пробега»). */
export const MAX_DAILY_KM: Record<ТипТС, number> = {
  легковой: 300,
  грузовой: 250,
};

/** Минимальный пробег за выезд / за сутки в смене. */
export const MIN_DAILY_KM = 5.9;

/** Минимальный остаток топлива в баке (л). */
export const MIN_CLOSING_FUEL = 10;

/** Если объём бака не указан — верхняя граница остатка. */
export const DEFAULT_TANK_CAPACITY = 70;

export function effectiveTankCapacity(объёмБака: number | '' | null | undefined): number {
  const v = num(объёмБака);
  return v > 0 ? v : DEFAULT_TANK_CAPACITY;
}

/** Остаток в баке: не меньше 10 л и не больше ёмкости. */
export function clampFuelInTank(liters: number, capacity: number): number {
  return round(Math.min(capacity, Math.max(MIN_CLOSING_FUEL, liters)), 2);
}

function clampShiftMileage(km: number, maxDailyKm: number, days: number): number {
  const maxTotal = maxDailyKm * Math.max(1, days);
  const minTotal = MIN_DAILY_KM * Math.max(1, days);
  if (km <= 0) return 0;
  return round(Math.min(maxTotal, Math.max(minTotal, km)), 1);
}

/** Максимальный расход (л) при сохранении остатка ≥ MIN_CLOSING_FUEL. */
function maxBurnKeepingReserve(fuel: number): number {
  return Math.max(0, round(fuel - MIN_CLOSING_FUEL, 2));
}

/** Пробег и расход с учётом лимитов км и доступного топлива. */
function mileageAndBurnFromFuel(
  desiredKm: number,
  fuel: number,
  C: number,
  maxDailyKm: number,
  days: number,
): { probeg: number; burn: number } {
  let probeg = clampShiftMileage(desiredKm, maxDailyKm, days);
  let burn = round((probeg * C) / 100, 2);
  const maxBurn = maxBurnKeepingReserve(fuel);

  if (burn > maxBurn) {
    burn = maxBurn;
    probeg = C > 0 ? round((burn * 100) / C, 1) : 0;
  }

  if (probeg > 0 && probeg < MIN_DAILY_KM * Math.max(1, days)) {
    const minKm = MIN_DAILY_KM * Math.max(1, days);
    const minBurn = round((minKm * C) / 100, 2);
    if (minBurn <= maxBurn) {
      probeg = round(minKm, 1);
      burn = minBurn;
    } else {
      probeg = 0;
      burn = 0;
    }
  }

  if (probeg > 0) {
    probeg = clampShiftMileage(probeg, maxDailyKm, days);
    burn = round((probeg * C) / 100, 2);
    if (burn > maxBurn) {
      burn = maxBurn;
      probeg = C > 0 ? round((burn * 100) / C, 1) : 0;
    }
  }

  return { probeg, burn };
}

/** Базовый расход по умолчанию, если пользователь не задал средний расход. */
const DEFAULT_BASE_CONSUMPTION: Record<ВидТоплива, number> = {
  ДТ: 9,
  'Аи-92': 10,
  'Аи-95': 10.5,
  'Аи-100': 11.5,
};

/**
 * Коэффициенты надбавок (ориентированы на Распоряжение Минтранса АМ-23-р).
 * Для MVP усреднённые; на шаге 1.2/2.x заменяются справочником по моделям.
 */
const COEFF = {
  зима: 0.1,
  старше10лет: 0.05,
  прицепГруз: 0.1,
  сообщение: {
    городское: 0.1,
    пригородное: 0.05,
    междугородное: 0,
    международное: 0,
  } as Record<ВидСообщения, number>,
};

const DEFAULT_DEPART_HOUR = 8; // 08:00

// ------- Утилиты дат -------

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function isWeekend(d: Date): boolean {
  const wd = d.getDay();
  return wd === 0 || wd === 6;
}

/** Зимний месяц (ноябрь–март) — грубая эвристика сезона. */
function isWinterMonth(monthIndex0: number): boolean {
  return monthIndex0 >= 10 || monthIndex0 <= 2;
}

function formatDateTime(d: Date): string {
  return (
    `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}

function round(n: number, digits = 0): number {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

function num(v: number | '' | null | undefined): number {
  return typeof v === 'number' ? v : Number(v) || 0;
}

/** Детерминированный псевдослучайный [0, 1) для стабильного «рандома» по номеру листа. */
function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function scheduleSeed(shift: Смена, shiftIdx: number): number {
  return shiftIdx * 991 + hashString(shift.driver) + hashString(toISODate(shift.start)) * 17;
}

interface ShiftSchedule {
  departure: Date;
  returnDt: Date;
  totalHours: number;
}

/** Односменный городской/пригородный день: выезд ~8:02–8:08, возврат 15:00–18:00, смена 6–8 ч. */
function buildShiftSchedule(shift: Смена, shiftIdx: number, видСообщения: ВидСообщения): ShiftSchedule {
  const seed = scheduleSeed(shift, shiftIdx);
  const departMin = 2 + Math.floor(seededUnit(seed) * 7); // 2–8 мин после 8:00

  const departure = new Date(shift.start);
  departure.setHours(DEFAULT_DEPART_HOUR, departMin, 0, 0);

  if (shift.days === 1 && (видСообщения === 'городское' || видСообщения === 'пригородное')) {
    const day = new Date(shift.start);
    const minReturn = new Date(departure.getTime() + 6 * 3600000);
    const maxReturn = new Date(departure.getTime() + 8 * 3600000);
    const winStart = new Date(day);
    winStart.setHours(15, 0, 0, 0);
    const winEnd = new Date(day);
    winEnd.setHours(18, 0, 0, 0);

    let pickStart = new Date(Math.max(minReturn.getTime(), winStart.getTime()));
    let pickEnd = new Date(Math.min(maxReturn.getTime(), winEnd.getTime()));
    if (pickStart.getTime() > pickEnd.getTime()) {
      const fallback = departure.getTime() + (6.5 + seededUnit(seed + 1) * 1.5) * 3600000;
      pickStart = new Date(Math.max(fallback, winStart.getTime()));
      pickEnd = winEnd;
    }

    const span = Math.max(0, pickEnd.getTime() - pickStart.getTime());
    const returnDt = new Date(pickStart.getTime() + seededUnit(seed + 2) * span);
    returnDt.setSeconds(0, 0);
    const totalHours = round((returnDt.getTime() - departure.getTime()) / 3600000, 1);
    return { departure, returnDt, totalHours };
  }

  if (shift.days > 1) {
    const returnDt = new Date(addDays(shift.start, shift.days - 1));
    returnDt.setHours(
      15 + Math.floor(seededUnit(seed + 1) * 3),
      Math.floor(seededUnit(seed + 2) * 60),
      0,
      0,
    );
    const totalHours = round((returnDt.getTime() - departure.getTime()) / 3600000, 1);
    return { departure, returnDt, totalHours };
  }

  const workHours = 6 + seededUnit(seed + 1) * 2;
  const returnDt = new Date(departure.getTime() + workHours * 3600000);
  return { departure, returnDt, totalHours: round(workHours, 1) };
}

/** Время оплаты на АЗС: ≥15 мин после выезда, внутри смены (дорога + очередь). */
function assignRefuelTimes(
  records: { event: RefuelEvent; volume: number }[],
  schedule: ShiftSchedule,
  seed: number,
): ЗаправкаНаЛисте[] {
  const minWhen = schedule.departure.getTime() + 15 * 60000;
  const maxWhen = schedule.returnDt.getTime() - 30 * 60000;
  let cursor = minWhen;

  return records.map(({ event, volume }, idx) => {
    const travelMin = 10 + Math.floor(seededUnit(seed + idx * 5) * 16);
    const queueMin = 5 + Math.floor(seededUnit(seed + idx * 5 + 1) * 11);
    let whenMs = schedule.departure.getTime() + (travelMin + queueMin) * 60000;
    if (idx > 0) {
      const gap = (45 + Math.floor(seededUnit(seed + idx) * 45)) * 60000;
      whenMs = Math.max(whenMs, cursor + gap);
    }
    whenMs = Math.min(Math.max(whenMs, minWhen), maxWhen);
    event.when = new Date(whenMs);
    cursor = whenMs + (8 + Math.floor(seededUnit(seed + idx + 3) * 7)) * 60000;

    return {
      время: `${pad2(event.when.getHours())}:${pad2(event.when.getMinutes())}`,
      объём: round(volume, 2),
      адрес: event.address || undefined,
    };
  });
}

/** Разброс пробега вокруг среднего: ~15–35% от среднего, но не меньше 12 км. */
function mileageSpread(avg: number): number {
  return Math.min(avg * 0.35, Math.max(12, avg * 0.18));
}

function normalizeKmParts(raw: number[], totalKm: number): number[] {
  const weightSum = raw.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) return raw.map(() => round(totalKm / raw.length, 1));

  const parts = raw.map((w) => round((w / weightSum) * totalKm, 1));
  let drift = round(totalKm - parts.reduce((a, b) => a + b, 0), 1);
  parts[parts.length - 1] = round(parts[parts.length - 1] + drift, 1);
  return parts;
}

function enforceMinSpread(parts: number[], totalKm: number): number[] {
  if (parts.length <= 1 || totalKm <= 0) return parts;

  const avg = totalKm / parts.length;
  const needSpread = mileageSpread(avg);
  const min = Math.min(...parts);
  const max = Math.max(...parts);
  if (max - min >= needSpread * 0.75) return parts;

  const bump = round(needSpread / 2, 1);
  const next = [...parts];
  const minIdx = next.indexOf(min);
  const maxIdx = next.indexOf(max);
  next[minIdx] = round(Math.max(MIN_DAILY_KM, next[minIdx] - bump), 1);
  next[maxIdx] = round(next[maxIdx] + bump, 1);
  let drift = round(totalKm - next.reduce((a, b) => a + b, 0), 1);
  next[next.length - 1] = round(next[next.length - 1] + drift, 1);
  return next;
}

/**
 * Разносит суммарный пробег по односменным листам с учётом даты и смены водителя.
 * Сумма частей строго равна totalKm.
 */
export function allocateVariedMileages(листы: ПутевойЛист[], totalKm: number): number[] {
  if (листы.length <= 1 || totalKm <= 0) return [round(totalKm, 1)];

  const avg = totalKm / листы.length;
  const spread = mileageSpread(avg);
  const raw: number[] = [];

  for (let i = 0; i < листы.length; i++) {
    const sheet = листы[i];
    const prevDriver = i > 0 ? листы[i - 1].водитель : '';
    const handover = sheet.водитель !== prevDriver && i > 0;
    const datePart = sheet.выпуск.split(' ')[0] ?? '';
    const dateSeed = hashString(datePart);
    const driverSeed = hashString(sheet.водитель);
    const transitionSeed = handover ? hashString(`${prevDriver}|${sheet.водитель}`) : 0;
    const seed =
      i * 997 +
      driverSeed +
      dateSeed * 13 +
      transitionSeed * 37 +
      (handover ? 5000 + transitionSeed : 0);

    const handoverBoost = handover ? (seededUnit(transitionSeed + 3) - 0.5) * spread * 0.6 : 0;
    const offset = (seededUnit(seed) - 0.5) * 2 * spread + handoverBoost;
    raw.push(Math.max(MIN_DAILY_KM, avg + offset));
  }

  return enforceMinSpread(normalizeKmParts(raw, totalKm), totalKm);
}

/**
 * Делит суммарный пробег на дни с небольшим разбросом (не одинаковые значения).
 * Сумма частей строго равна totalKm.
 */
export function distributeDailyKm(totalKm: number, days: number, seed: number): number[] {
  if (days <= 1 || totalKm <= 0) return [round(totalKm, 1)];

  const avg = totalKm / days;
  const spread = mileageSpread(avg);
  const raw: number[] = [];
  for (let i = 0; i < days; i++) {
    const offset = (seededUnit(seed + i + 1) - 0.5) * 2 * spread;
    raw.push(Math.max(MIN_DAILY_KM, avg + offset));
  }
  return enforceMinSpread(normalizeKmParts(raw, totalKm), totalKm);
}

function shiftContainsDate(shift: Смена, iso: string): boolean {
  const start = toISODate(shift.start);
  const end = toISODate(addDays(shift.start, shift.days - 1));
  return iso >= start && iso <= end;
}

/** Смена, ближайшая к дате заправки (если дата не попала ни в одну смену). */
function nearestShiftIndex(shifts: Смена[], when: Date): number {
  let best = 0;
  let bestDist = Infinity;
  shifts.forEach((shift, idx) => {
    const mid = addDays(shift.start, Math.floor(shift.days / 2)).getTime();
    const dist = Math.abs(when.getTime() - mid);
    if (dist < bestDist) {
      bestDist = dist;
      best = idx;
    }
  });
  return best;
}

interface RefuelEvent {
  when: Date;
  volume: number;
  address: string;
  remaining: number;
  /** Индекс смены для «осиротевших» заправок вне календаря водителей. */
  assignShift: number;
}

// ------- Эффективный расход топлива -------

export function computeConsumption(input: ВходныеДанные, periodStart: Date): СводкаРасхода {
  // Спецтехника: коэффициенты не применяются, средний расход обязателен.
  if (input.спецтехника) {
    const base = num(input.среднийРасход);
    return {
      effective: base,
      base,
      applied: [],
      note: 'Спецтехника: коэффициенты не применяются, задан ручной расход.',
    };
  }

  const manual = num(input.среднийРасход);

  let base: number;
  let baseNote: 'manual' | 'estimated' | 'default';

  if (manual > 0) {
    base = manual;
    baseNote = 'manual';
  } else {
    const odoStart = num(input.одометрНаНачало);
    const odoEnd = num(input.одометрНаКонец);
    const distance = odoEnd - odoStart;
    const totalRefueled = input.заправки.reduce((sum, r) => sum + num(r.объём), 0);

    // Точнее: фактически сожжённое топливо = остаток на начало + залито − остаток
    // на конец. Если пользователь не указал остатки — приближённо считаем, что
    // всё залитое за период топливо и было сожжено (Σ заправок).
    const residualStart = num(input.остатокНаНачало);
    const residualEnd = num(input.остатокНаКонец);
    const hasResiduals = input.остатокНаНачало !== '' && input.остатокНаКонец !== '';
    const totalBurned = hasResiduals ? residualStart + totalRefueled - residualEnd : totalRefueled;

    if (input.одометрНаКонец !== '' && distance > 0 && totalBurned > 0) {
      base = round((totalBurned / distance) * 100, 2);
      baseNote = 'estimated';
    } else {
      base = DEFAULT_BASE_CONSUMPTION[input.видТоплива] ?? 10;
      baseNote = 'default';
    }
  }

  const applied: СводкаРасхода['applied'] = [];
  let multiplier = 1;

  if (isWinterMonth(periodStart.getMonth())) {
    multiplier += COEFF.зима;
    applied.push({ name: 'Зима', value: COEFF.зима });
  }
  if (input.старше10лет) {
    multiplier += COEFF.старше10лет;
    applied.push({ name: 'Возраст > 10 лет', value: COEFF.старше10лет });
  }
  if (input.прицепГруз) {
    multiplier += COEFF.прицепГруз;
    applied.push({ name: 'Прицеп/груз', value: COEFF.прицепГруз });
  }
  const commCoeff = COEFF.сообщение[input.видСообщения] ?? 0;
  if (commCoeff > 0) {
    multiplier += commCoeff;
    applied.push({ name: `Вид сообщения: ${input.видСообщения}`, value: commCoeff });
  }

  return {
    effective: round(base * multiplier, 2),
    base,
    applied,
    note:
      baseNote === 'manual'
        ? 'База — ручной средний расход, применены коэффициенты.'
        : baseNote === 'estimated'
          ? 'База — расход, вычисленный по факту (пробег по одометру и объём заправок за период), применены коэффициенты.'
          : `База — норматив по умолчанию для «${input.видТоплива}», применены коэффициенты.`,
  };
}

// ------- Генерация смен -------

export function buildShifts(input: ВходныеДанные): Смена[] {
  const drivers = input.водители;
  const multiDay = input.видСообщения === 'междугородное' || input.видСообщения === 'международное';
  const tripDays = multiDay ? Math.max(1, num(input.срокРейсаДней) || 1) : 1;

  // Карта: ISO-дата -> индексы водителей, отметивших день
  const dateMap = new Map<string, number[]>();
  drivers.forEach((drv, idx) => {
    drv.дни.forEach((iso) => {
      const arr = dateMap.get(iso);
      if (arr) arr.push(idx);
      else dateMap.set(iso, [idx]);
    });
  });

  const sortedDates = Array.from(dateMap.keys()).sort();
  const shifts: Смена[] = [];
  let rr = 0; // round-robin для балансировки водителей

  if (!multiDay) {
    for (const iso of sortedDates) {
      const available = dateMap.get(iso)!;
      const driverIdx = available[rr % available.length];
      rr++;
      shifts.push({
        start: parseISODate(iso),
        days: 1,
        driver: drivers[driverIdx].фио || `Водитель ${driverIdx + 1}`,
      });
    }
  } else {
    const used = new Set<string>();
    for (const iso of sortedDates) {
      if (used.has(iso)) continue;
      const available = dateMap.get(iso)!;
      const driverIdx = available[rr % available.length];
      rr++;
      const start = parseISODate(iso);
      for (let i = 0; i < tripDays; i++) used.add(toISODate(addDays(start, i)));
      shifts.push({
        start,
        days: tripDays,
        driver: drivers[driverIdx].фио || `Водитель ${driverIdx + 1}`,
      });
    }
  }

  shifts.sort((a, b) => a.start.getTime() - b.start.getTime());
  return shifts;
}

// ------- Основной расчёт -------

export function calculate(input: ВходныеДанные): РезультатРасчёта {
  const warnings: string[] = [];
  const periodStart = parseISODate(input.периодС);

  const consumption = computeConsumption(input, periodStart);
  const C = consumption.effective; // л/100км
  if (!C || C <= 0) {
    warnings.push('Не удалось определить средний расход. Укажите «Средний расход» вручную.');
    return { листы: [], предупреждения: warnings, расход: consumption };
  }

  const tankVolume = num(input.объёмБака);
  const tankCap = effectiveTankCapacity(input.объёмБака);
  if (tankVolume <= 0) {
    warnings.push(`Не задан объём бака ТС — для лимитов остатка принят ${DEFAULT_TANK_CAPACITY} л.`);
  }

  const maxDailyKm = MAX_DAILY_KM[input.типТС] ?? MAX_DAILY_KM.легковой;
  const формаПЛ: ФормаПЛ = input.формаПЛ ?? формаПоТипуТС(input.типТС);

  const shifts = buildShifts(input);
  if (shifts.length === 0) {
    warnings.push('Не отмечено ни одного рабочего дня в календарях водителей.');
    return { листы: [], предупреждения: warnings, расход: consumption };
  }

  // Заправки, отсортированные по дате/времени
  const refuels: RefuelEvent[] = input.заправки
    .filter((r) => r.дата && num(r.объём) > 0)
    .map((r) => {
      const when = new Date(`${r.дата}T${r.время || '00:00'}`);
      const volume = num(r.объём);
      const inShift = shifts.findIndex((s) => shiftContainsDate(s, r.дата));
      return {
        when,
        volume,
        address: (r.адрес || '').trim(),
        remaining: volume,
        assignShift: inShift >= 0 ? inShift : nearestShiftIndex(shifts, when),
      };
    })
    .sort((a, b) => a.when.getTime() - b.when.getTime());

  const orphanCount = refuels.filter((r) => !shifts.some((s) => shiftContainsDate(s, toISODate(r.when)))).length;
  if (orphanCount > 0) {
    warnings.push(
      `${orphanCount} заправок приходятся на дни без отмеченных смен — они учтены в ближайших путевых листах.`,
    );
  }

  let tank = num(input.остатокНаНачало);
  if (tank > tankCap) {
    warnings.push(`Начальный остаток топлива больше ёмкости бака — ограничено ${tankCap} л.`);
    tank = tankCap;
  }
  if (tank > 0 && tank < MIN_CLOSING_FUEL) {
    warnings.push(
      `Остаток на начало периода (${round(tank, 1)} л) меньше ${MIN_CLOSING_FUEL} л — в расчёте принято ${MIN_CLOSING_FUEL} л.`,
    );
    tank = MIN_CLOSING_FUEL;
  }

  const odoKnown = input.одометрНаНачало !== '' && input.одометрНаНачало != null;
  let odo = odoKnown ? num(input.одометрНаНачало) : 2500; // ТЗ: неизвестен → от 2500 км
  if (!odoKnown) {
    warnings.push('Показания одометра на начало не заданы — расчёт начат с 2500 км (по ТЗ).');
  }

  const totalFuel = tank + refuels.reduce((s, r) => s + r.volume, 0);
  let remainingBurnable = Math.max(0, totalFuel - MIN_CLOSING_FUEL);

  const листы: ПутевойЛист[] = [];

  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i];
    const shiftsLeft = shifts.length - i;

    const shiftEndDate = addDays(shift.start, shift.days - 1);
    const shiftEndBoundary = new Date(`${toISODate(shiftEndDate)}T23:59`);
    const schedule = buildShiftSchedule(shift, i, input.видСообщения);
    const shiftRefuelRecords: { event: RefuelEvent; volume: number }[] = [];

    for (const r of refuels) {
      if (r.remaining <= 0) continue;
      const inRange = shiftContainsDate(shift, toISODate(r.when));
      const onAssignedShift = r.assignShift === i;
      if (!inRange && !onAssignedShift) continue;
      if (!inRange && onAssignedShift && r.when > shiftEndBoundary) {
        // осиротевшая заправка — учитываем в назначенной смене
      } else if (inRange && r.when > shiftEndBoundary) {
        continue;
      }

      const room = tankCap - tank;
      const add = Math.min(r.remaining, Math.max(0, room));
      if (add <= 0) continue;

      if (add < r.remaining) {
        warnings.push(
          `Заправка ${formatDateTime(r.when)} на ${r.volume} л превышает свободный объём бака — ` +
            `учтено ${round(add, 1)} л (остаток перенесён на следующую смену).`,
        );
      }
      tank = clampFuelInTank(tank + add, tankCap);
      r.remaining = round(r.remaining - add, 2);
      shiftRefuelRecords.push({ event: r, volume: add });
    }

    const заправкиНаЛисте = assignRefuelTimes(shiftRefuelRecords, schedule, scheduleSeed(shift, i));

    const openingFuel = tank;
    const openingOdo = odo;

    const maxFuelByKm = ((maxDailyKm * shift.days) * C) / 100;
    const target = shiftsLeft > 0 ? remainingBurnable / shiftsLeft : 0;
    const maxByReserve = maxBurnKeepingReserve(tank);

    let burn = Math.min(target, maxFuelByKm, maxByReserve);
    if (burn < 0) burn = 0;

    let mileage = C > 0 ? (burn * 100) / C : 0;
    ({ probeg: mileage, burn } = mileageAndBurnFromFuel(mileage, tank, C, maxDailyKm, shift.days));
    const пробегПоДням = distributeDailyKm(mileage, shift.days, i + 1);
    const closingFuel = round(Math.min(tankCap, tank - burn), 2);
    const closingOdo = round(odo + mileage, 1);

    const { departure, returnDt, totalHours } = schedule;

    const маршрут: string[] = [];
    if (input.адресСтоянки) маршрут.push(input.адресСтоянки);
    for (const z of заправкиНаЛисте) {
      const label = z.адрес ? `АЗС (${z.время}): ${z.адрес}` : `АЗС (${z.время})`;
      маршрут.push(label);
    }
    if (input.адресСтоянки) маршрут.push(input.адресСтоянки);

    листы.push({
      номер: i + 1,
      формаПЛ,
      выпуск: formatDateTime(departure),
      возвращение: formatDateTime(returnDt),
      водитель: shift.driver,
      общееВремя: totalHours,
      одометрВыдача: round(openingOdo, 1),
      одометрЗакрытие: closingOdo,
      пробег: round(mileage, 1),
      пробегПоДням,
      остатокВыдача: round(openingFuel, 2),
      остатокЗакрытие: closingFuel,
      расходНорма: round(burn, 2),
      расходФакт: round(burn, 2),
      видСообщения: input.видСообщения,
      маршрут,
      заправки: заправкиНаЛисте.length > 0 ? заправкиНаЛисте : undefined,
    });

    tank = closingFuel;
    odo = closingOdo;
    remainingBurnable = Math.max(0, remainingBurnable - burn);
  }

  if (refuels.some((r) => r.remaining > 0.01)) {
    warnings.push('Не все заправки удалось учесть в расчёте — проверьте объём бака и рабочие дни.');
  }

  if (tank > MIN_CLOSING_FUEL + 0.5) {
    warnings.push(
      `После распределения в баке осталось ${round(tank, 1)} л. Не всё топливо реализовано ` +
        `в рамках лимитов пробега/смен — добавьте рабочие дни, увеличьте срок рейса или скорректируйте данные.`,
    );
  }

  const finalSheets = rebalanceMileages(листы, C, maxDailyKm, tankCap);
  return { листы: finalSheets, предупреждения: warnings, расход: consumption };
}

/** Разносит пробег по односменным листам (день ко дню, с учётом смены водителя). */
function rebalanceMileages(
  листы: ПутевойЛист[],
  C: number,
  maxDailyKm: number,
  tankCap: number,
): ПутевойЛист[] {
  if (листы.length <= 1 || C <= 0) return листы;
  if (!листы.every((l) => l.пробегПоДням.length <= 1)) return листы;

  const totalKm = листы.reduce((s, l) => s + l.пробег, 0);
  if (totalKm <= 0) return листы;

  const varied = allocateVariedMileages(листы, totalKm);
  let odo = листы[0].одометрВыдача;

  return листы.map((л, i) => {
    // Открывающий остаток берём из исходного расчёта (шаг 1) — там он уже
    // корректно учитывает время заправок в течение периода. Пересчитывать
    // его здесь сквозной переменной нельзя: заправки между листами она не видит.
    const fuel = clampFuelInTank(л.остатокВыдача, tankCap);
    const days = л.пробегПоДням.length || 1;
    const { probeg, burn } = mileageAndBurnFromFuel(varied[i], fuel, C, maxDailyKm, days);

    const closingOdo = round(odo + probeg, 1);
    const closingFuel = round(Math.min(tankCap, fuel - burn), 2);
    const updated: ПутевойЛист = {
      ...л,
      пробег: probeg,
      пробегПоДням: [probeg],
      одометрВыдача: round(odo, 1),
      одометрЗакрытие: closingOdo,
      остатокВыдача: round(fuel, 2),
      остатокЗакрытие: closingFuel,
      расходНорма: burn,
      расходФакт: burn,
    };
    odo = closingOdo;
    return updated;
  });
}
