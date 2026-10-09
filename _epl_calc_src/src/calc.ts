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

/**
 * Минимум в баке по ходу смены перед заправкой (л). Резерв MIN_CLOSING_FUEL —
 * правило для остатка на закрытии листа; до заправки бак может опуститься ниже
 * (водитель затем и едет на АЗС), но не до нуля.
 */
export const MIN_FUEL_BEFORE_REFUEL = 2;

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
  /** Время взято с чека и совпадает с днём смены — его нужно соблюсти. */
  timeKnown: boolean;
}

// ------- Эффективный расход топлива -------

export function computeConsumption(input: ВходныеДанные, periodStart: Date): СводкаРасхода {
  // Спецтехника: коэффициенты не применяются, средний расход обязателен.
  if (input.спецтехника) {
    const base = num(input.среднийРасход);
    return {
      effective: base,
      base,
      норматив: base,
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

  const норматив = round(base * multiplier, 2);

  // Ручной и вычисленный по одометру расход — это ФАКТИЧЕСКИЙ расход машины,
  // коэффициенты (город, зима, прицеп…) в нём уже «сидят». Накладывать их ещё раз
  // нельзя — иначе введённое пользователем значение фактически игнорируется.
  // Коэффициенты применяются только к нормативу (графа «расход по норме»)
  // и к нормативу по умолчанию, когда реальный расход неизвестен.
  const effective = baseNote === 'default' ? норматив : round(base, 2);

  return {
    effective,
    base,
    норматив,
    applied,
    note:
      baseNote === 'manual'
        ? 'Фактический расход — как указан пользователем; коэффициенты применены только к нормативу.'
        : baseNote === 'estimated'
          ? 'Фактический расход вычислен по одометру и заправкам; коэффициенты применены только к нормативу.'
          : `Расход — норматив по умолчанию для «${input.видТоплива}» с коэффициентами.`,
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

  // Заправки, отсортированные по дате/времени. Время берём с чека: оно реальное
  // и должно попасть в рабочую смену водителя.
  const refuels: RefuelEvent[] = input.заправки
    .filter((r) => r.дата && num(r.объём) > 0)
    .map((r) => {
      const timeKnown = Boolean(r.время && /^\d{1,2}:\d{2}$/.test(r.время));
      const when = new Date(`${r.дата}T${timeKnown ? r.время.padStart(5, '0') : '12:00'}`);
      const volume = num(r.объём);
      const inShift = shifts.findIndex((s) => shiftContainsDate(s, r.дата));
      return {
        when,
        volume,
        address: (r.адрес || '').trim(),
        remaining: volume,
        assignShift: inShift >= 0 ? inShift : nearestShiftIndex(shifts, when),
        // Время с чека соблюдаем только если день заправки совпадает со сменой.
        timeKnown: timeKnown && inShift >= 0,
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
  if (tank < MIN_CLOSING_FUEL) {
    warnings.push(
      `Остаток на начало периода (${round(tank, 1)} л) меньше ${MIN_CLOSING_FUEL} л — в расчёте принято ${MIN_CLOSING_FUEL} л.`,
    );
    tank = MIN_CLOSING_FUEL;
  }

  // Цель на конец периода: остаток, который указал пользователь (не ниже резерва).
  const endKnown = input.остатокНаКонец !== '' && input.остатокНаКонец != null;
  const endTarget = endKnown
    ? Math.min(tankCap, Math.max(MIN_CLOSING_FUEL, num(input.остатокНаКонец)))
    : MIN_CLOSING_FUEL;

  const odoKnown = input.одометрНаНачало !== '' && input.одометрНаНачало != null;
  let odo = odoKnown ? num(input.одометрНаНачало) : 2500; // ТЗ: неизвестен → от 2500 км
  if (!odoKnown) {
    warnings.push('Показания одометра на начало не заданы — расчёт начат с 2500 км (по ТЗ).');
  }

  const нормативРасхода = consumption.норматив ?? C;
  const { weights, capFactors } = shiftWeights(shifts);
  const листы: ПутевойЛист[] = [];

  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i];
    const seed = scheduleSeed(shift, i);
    const openingFuel = tank;
    const openingOdo = odo;

    // --- Расписание смены: подгоняем под реальное время заправок с чеков ---
    const recs = refuels.filter((r) => r.assignShift === i);
    const known = recs.filter((r) => r.timeKnown);
    const schedule = fitScheduleToRefuels(buildShiftSchedule(shift, i, input.видСообщения), known, seed);
    // Заправки без времени (или с дня вне смены) раскладываем синтетически:
    // если по дате она позже смены — ближе к возврату, иначе — после выезда.
    const unknown = recs.filter((r) => !r.timeKnown);
    const shiftLastDay = toISODate(addDays(shift.start, shift.days - 1));
    const late = unknown.filter((r) => toISODate(r.when) > shiftLastDay);
    const early = unknown.filter((r) => toISODate(r.when) <= shiftLastDay);
    if (early.length > 0) assignRefuelTimes(early.map((event) => ({ event, volume: event.volume })), schedule, seed);
    late.forEach((r, k) => {
      const back = (30 + Math.floor(seededUnit(seed + 21 + k) * 16) + k * 20) * 60000;
      r.when = new Date(Math.max(schedule.departure.getTime() + 15 * 60000, schedule.returnDt.getTime() - back));
      r.when.setSeconds(0, 0);
    });
    recs.sort((a, b) => a.when.getTime() - b.when.getTime());

    const span = Math.max(1, schedule.returnDt.getTime() - schedule.departure.getTime());
    const fractions = recs.map((r) =>
      Math.min(1, Math.max(0, (r.when.getTime() - schedule.departure.getTime()) / span)),
    );

    // --- Сколько топлива «положено» сжечь за смену ---
    // Всё оставшееся топливо (текущее + будущие заправки) минус цель на конец,
    // делим пропорционально весам оставшихся смен (вес даёт разброс по дням).
    const futureFuel = refuels
      .filter((r) => r.assignShift >= i)
      .reduce((sum, r) => sum + r.remaining, 0);
    const remainingBurnable = Math.max(0, openingFuel + futureFuel - endTarget);
    const weightLeft = weights.slice(i).reduce((a, b) => a + b, 0);
    const target = weightLeft > 0 ? (remainingBurnable * weights[i]) / weightLeft : 0;
    const shiftMaxDailyKm = maxDailyKm * capFactors[i];
    const maxFuelByKm = (shiftMaxDailyKm * shift.days * C) / 100;

    // --- Расход идёт по ходу смены: место в баке считаем на момент заправки ---
    const simulate = (burn: number) => {
      const adds: number[] = [];
      let addedSoFar = 0;
      let allowed = Number.POSITIVE_INFINITY; // макс. расход, при котором бак не опустеет до заправки
      let shortfallBurn = 0; // доп. расход до заправки, чтобы она поместилась
      for (let k = 0; k < recs.length; k++) {
        const f = fractions[k];
        if (f > 0) allowed = Math.min(allowed, (openingFuel + addedSoFar - MIN_FUEL_BEFORE_REFUEL) / f);
        const levelAtRefuel = openingFuel + addedSoFar - burn * f;
        const room = Math.max(0, tankCap - levelAtRefuel);
        const add = Math.min(recs[k].remaining, room);
        if (add < recs[k].remaining - 0.01 && f > 0) {
          shortfallBurn = Math.max(shortfallBurn, (recs[k].remaining - add) / f);
        }
        adds.push(add);
        addedSoFar += add;
      }
      allowed = Math.min(allowed, openingFuel + addedSoFar - MIN_CLOSING_FUEL);
      return { adds, added: addedSoFar, allowed: Math.max(0, allowed), shortfallBurn };
    };

    let burn = Math.min(target, maxFuelByKm);
    for (let iter = 0; iter < 4; iter++) {
      const sim = simulate(burn);
      let next = Math.min(burn, sim.allowed);
      // Заправка не влезает в бак → значит, до неё машина успела откатать больше.
      if (sim.shortfallBurn > 0) next = Math.min(maxFuelByKm, sim.allowed, burn + sim.shortfallBurn);
      if (Math.abs(next - burn) < 0.01) {
        burn = next;
        break;
      }
      burn = next;
    }
    burn = Math.max(0, burn);

    let mileage = C > 0 ? (burn * 100) / C : 0;
    const available = openingFuel + simulate(burn).added;
    ({ probeg: mileage, burn } = mileageAndBurnFromFuel(mileage, available, C, shiftMaxDailyKm, shift.days));

    // Сверка резерва на закрытии. Меньший расход = меньше места под заправку,
    // поэтому сводим до сходимости, а пробег пересчитываем от итогового расхода.
    let { adds, added } = simulate(burn);
    for (let iter = 0; iter < 6 && openingFuel + added - burn < MIN_CLOSING_FUEL - 0.005; iter++) {
      burn = Math.max(0, openingFuel + added - MIN_CLOSING_FUEL);
      ({ adds, added } = simulate(burn));
    }
    if (openingFuel + added - burn < MIN_CLOSING_FUEL - 0.005) burn = Math.max(0, openingFuel + added - MIN_CLOSING_FUEL);
    burn = Math.floor(burn * 100) / 100;
    mileage = C > 0 ? Math.floor(((burn * 100) / C) * 10) / 10 : 0;

    const заправкиНаЛисте: ЗаправкаНаЛисте[] = [];
    recs.forEach((r, k) => {
      const add = round(adds[k], 2);
      if (add < r.remaining - 0.01) {
        warnings.push(
          `Заправка ${formatDateTime(r.when)} на ${r.volume} л не помещается в бак ${tankCap} л — ` +
            `учтено ${round(add, 1)} л. Проверьте объём бака и остатки.`,
        );
      }
      r.remaining = round(r.remaining - add, 2);
      if (add > 0) {
        заправкиНаЛисте.push({
          время: `${pad2(r.when.getHours())}:${pad2(r.when.getMinutes())}`,
          объём: add,
          адрес: r.address || undefined,
        });
      }
    });

    const closingFuel = round(Math.min(tankCap, openingFuel + added - burn), 2);
    const closingOdo = round(openingOdo + mileage, 1);
    const пробегПоДням = shift.days > 1 ? distributeDailyKm(mileage, shift.days, i + 1) : [round(mileage, 1)];

    const маршрут: string[] = [];
    if (input.адресСтоянки) маршрут.push(input.адресСтоянки);
    for (const z of заправкиНаЛисте) {
      маршрут.push(z.адрес ? `АЗС (${z.время}): ${z.адрес}` : `АЗС (${z.время})`);
    }
    if (input.адресСтоянки) маршрут.push(input.адресСтоянки);

    листы.push({
      номер: i + 1,
      формаПЛ,
      выпуск: formatDateTime(schedule.departure),
      возвращение: formatDateTime(schedule.returnDt),
      водитель: shift.driver,
      общееВремя: schedule.totalHours,
      одометрВыдача: round(openingOdo, 1),
      одометрЗакрытие: closingOdo,
      пробег: round(mileage, 1),
      пробегПоДням,
      остатокВыдача: round(openingFuel, 2),
      остатокЗакрытие: closingFuel,
      расходНорма: round((mileage * нормативРасхода) / 100, 2),
      расходФакт: round(burn, 2),
      видСообщения: input.видСообщения,
      маршрут,
      заправки: заправкиНаЛисте.length > 0 ? заправкиНаЛисте : undefined,
    });

    tank = closingFuel;
    odo = closingOdo;
  }

  if (refuels.some((r) => r.remaining > 0.01)) {
    warnings.push('Не все заправки удалось учесть в расчёте — проверьте объём бака и рабочие дни.');
  }

  if (tank > endTarget + 0.5) {
    warnings.push(
      `После распределения в баке осталось ${round(tank, 1)} л (цель — ${round(endTarget, 1)} л). Не всё топливо ` +
        `реализовано в рамках лимитов пробега/смен — добавьте рабочие дни, увеличьте срок рейса или скорректируйте данные.`,
    );
  }

  return { листы, предупреждения: warnings, расход: consumption };
}

/**
 * Веса смен для распределения топлива: дают разброс пробега день ко дню
 * (в том числе на смене водителя) и учитывают длину многодневных рейсов.
 * Распределение встроено в основной проход, поэтому остаток топлива и одометр
 * всегда непрерывны от листа к листу.
 */
function shiftWeights(shifts: Смена[]): { weights: number[]; capFactors: number[] } {
  if (shifts.length <= 1) return { weights: shifts.map((s) => Math.max(1, s.days)), capFactors: shifts.map(() => 1) };
  const pseudo = shifts.map(
    (s) => ({ водитель: s.driver, выпуск: formatDateTime(s.start) }) as unknown as ПутевойЛист,
  );
  const factors = allocateVariedMileages(pseudo, 1000 * shifts.length).map((p) => Math.max(0.05, p / 1000));
  const maxFactor = Math.max(...factors);
  return {
    weights: factors.map((f, i) => f * Math.max(1, shifts[i].days)),
    // Потолок пробега тоже варьируем (80–100%), иначе при избытке топлива
    // все листы упираются в один и тот же максимум и выглядят одинаково.
    capFactors: factors.map((f) => Math.min(1, Math.max(0.8, f / maxFactor))),
  };
}

/**
 * Время заправки с чека должно попасть в рабочую смену. Длительность смены
 * (6–8 ч) сохраняем: окно СДВИГАЕМ так, чтобы заправки оказались внутри
 * (выезд ≥15 мин до первой, возврат ≥15 мин после последней). Растягиваем
 * смену, только если сами заправки разнесены шире, чем длится смена.
 */
function fitScheduleToRefuels(schedule: ShiftSchedule, known: RefuelEvent[], seed: number): ShiftSchedule {
  if (known.length === 0) return schedule;
  const times = known.map((r) => r.when.getTime());
  const first = Math.min(...times);
  const last = Math.max(...times);
  const lead = (15 + Math.floor(seededUnit(seed + 11) * 11)) * 60000; // 15–25 мин до АЗС
  const tail = (15 + Math.floor(seededUnit(seed + 13) * 21)) * 60000; // 15–35 мин до гаража
  const duration = schedule.returnDt.getTime() - schedule.departure.getTime();

  let dep = schedule.departure.getTime();
  let ret = schedule.returnDt.getTime();
  const needFrom = first - lead;
  const needTo = last + tail;

  if (needTo - needFrom > duration) {
    // Заправки разнесены шире обычной смены — смена от первой до последней.
    dep = needFrom;
    ret = needTo;
  } else if (dep > needFrom) {
    // Ранняя заправка — смена начинается раньше, длительность прежняя.
    dep = needFrom;
    ret = dep + duration;
  } else if (ret < needTo) {
    // Поздняя заправка — смена сдвигается на вечер, длительность прежняя.
    ret = needTo;
    dep = ret - duration;
  }

  const departure = new Date(dep);
  departure.setSeconds(0, 0);
  const returnDt = new Date(ret);
  returnDt.setSeconds(0, 0);
  const totalHours = round((returnDt.getTime() - departure.getTime()) / 3600000, 1);
  return { departure, returnDt, totalHours };
}
