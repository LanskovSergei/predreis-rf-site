import type { ВидТоплива, ВходныеДанные, ПутевойЛист } from './types';

export interface ДанныеБланка {
  номер: string;
  маркаМодель: string;
  водитель: string;
  день: string;
  месяц: string;
  год: string;
  выпускЧ: string;
  выпускМин: string;
  возвратЧ: string;
  возвратМин: string;
  одометрВыезд: string;
  одометрВозврат: string;
  пробег: string;
  /** Пробег по дням (для оборотной стороны бланка). */
  пробегПоДням: string[];
  топливо: string;
  /** Выдано (заправлено) за смену, л. */
  выдано: string;
  остатокВыезд: string;
  остатокВозврат: string;
  расходНорма: string;
  расходФакт: string;
  /** Экономия / перерасход относительно нормы, л (пусто, если нет). */
  экономия: string;
  перерасход: string;
  времяНарядЧ: string;
  времяНарядМин: string;
  адресСтоянки: string;
  прицеп: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseDt(value: string): Date | null {
  const m = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fuelLabel(v: ВидТоплива): string {
  return v;
}

export function данныеБланка(input: ВходныеДанные, лист: ПутевойЛист): ДанныеБланка {
  const dep = parseDt(лист.выпуск);
  const ret = parseDt(лист.возвращение);
  // Время в наряде — строго по выезду/возврату, чтобы совпадало с временами на бланке.
  const totalMin =
    dep && ret ? Math.max(0, Math.round((ret.getTime() - dep.getTime()) / 60000)) : Math.round(лист.общееВремя * 60);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const выдано = round2((лист.заправки ?? []).reduce((s, z) => s + z.объём, 0));
  const разница = round2(лист.расходНорма - лист.расходФакт);

  return {
    номер: String(лист.номер),
    маркаМодель: `${input.марка} ${input.модель}`.trim(),
    водитель: лист.водитель,
    день: dep ? pad2(dep.getDate()) : '',
    месяц: dep ? pad2(dep.getMonth() + 1) : '',
    год: dep ? String(dep.getFullYear()) : '',
    выпускЧ: dep ? String(dep.getHours()) : '',
    выпускМин: dep ? pad2(dep.getMinutes()) : '',
    возвратЧ: ret ? String(ret.getHours()) : '',
    возвратМин: ret ? pad2(ret.getMinutes()) : '',
    одометрВыезд: String(лист.одометрВыдача),
    одометрВозврат: String(лист.одометрЗакрытие),
    пробег: String(лист.пробег),
    пробегПоДням: (лист.пробегПоДням ?? [лист.пробег]).map(String),
    топливо: fuelLabel(input.видТоплива),
    выдано: выдано > 0 ? String(выдано) : '',
    остатокВыезд: String(лист.остатокВыдача),
    остатокВозврат: String(лист.остатокЗакрытие),
    расходНорма: String(лист.расходНорма),
    расходФакт: String(лист.расходФакт),
    экономия: разница > 0 ? String(разница) : '',
    перерасход: разница < 0 ? String(-разница) : '',
    времяНарядЧ: String(hours),
    времяНарядМин: pad2(mins),
    адресСтоянки: input.адресСтоянки?.trim() || '',
    прицеп: input.прицепГруз,
  };
}
