import { parseISODate, toISODate } from './calc';

/** Неделя с понедельника (привычный формат для РФ). */
export const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

export const jsDayToMonFirst = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

export function firstOfMonthISO(iso: string): string {
  return iso.slice(0, 7) + '-01';
}

export function formatRuDate(iso: string): string {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function buildMonthCells(viewMonth: string): (string | null)[] {
  const base = parseISODate(viewMonth);
  const year = base.getFullYear();
  const month = base.getMonth();
  const startOffset = jsDayToMonFirst(new Date(year, month, 1).getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(year, month, d)));
  return cells;
}

export function monthLabel(viewMonth: string): string {
  return parseISODate(viewMonth).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export function shiftViewMonth(viewMonth: string, delta: number): string {
  const base = parseISODate(viewMonth);
  return toISODate(new Date(base.getFullYear(), base.getMonth() + delta, 1));
}

export function isDateInRange(iso: string, min?: string, max?: string): boolean {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}
