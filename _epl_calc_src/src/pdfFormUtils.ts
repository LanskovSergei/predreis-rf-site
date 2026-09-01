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
  топливо: string;
  остатокВыезд: string;
  остатокВозврат: string;
  расходНорма: string;
  расходФакт: string;
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

function fuelLabel(v: ВидТоплива): string {
  return v;
}

export function данныеБланка(input: ВходныеДанные, лист: ПутевойЛист): ДанныеБланка {
  const dep = parseDt(лист.выпуск);
  const ret = parseDt(лист.возвращение);
  const hours = Math.floor(лист.общееВремя);
  const mins = Math.round((лист.общееВремя - hours) * 60);

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
    топливо: fuelLabel(input.видТоплива),
    остатокВыезд: String(лист.остатокВыдача),
    остатокВозврат: String(лист.остатокЗакрытие),
    расходНорма: String(лист.расходНорма),
    расходФакт: String(лист.расходФакт),
    времяНарядЧ: String(hours),
    времяНарядМин: pad2(mins),
    адресСтоянки: input.адресСтоянки?.trim() || '—',
    прицеп: input.прицепГруз,
  };
}
