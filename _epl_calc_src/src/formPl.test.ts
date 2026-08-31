import { describe, expect, it } from 'vitest';
import { формаПоТипуТС, поляФормы, названиеФормы } from './formPl';
import type { ВходныеДанные, ПутевойЛист } from './types';

function sampleInput(overrides: Partial<ВходныеДанные> = {}): ВходныеДанные {
  return {
    марка: 'ГАЗ',
    модель: '3302',
    типТС: 'грузовой',
    формаПЛ: '4-c',
    видТоплива: 'Аи-92',
    объёмБака: 70,
    среднийРасход: '',
    старше10лет: false,
    прицепГруз: true,
    спецтехника: false,
    периодС: '2025-06-01',
    периодПо: '2025-06-02',
    видСообщения: 'городское',
    срокРейсаДней: '',
    одометрНаНачало: 1000,
    одометрНаКонец: '',
    остатокНаНачало: 20,
    остатокНаКонец: 10,
    водители: [{ фио: 'Иванов И.И.', дни: new Set(['2025-06-01']) }],
    заправки: [],
    ...overrides,
  };
}

function sampleSheet(overrides: Partial<ПутевойЛист> = {}): ПутевойЛист {
  return {
    номер: 1,
    формаПЛ: '4-c',
    выпуск: '01.06.2025 08:00',
    возвращение: '01.06.2025 12:00',
    водитель: 'Иванов И.И.',
    общееВремя: 4,
    одометрВыдача: 1000,
    одометрЗакрытие: 1050,
    пробег: 50,
    остатокВыдача: 20,
    остатокЗакрытие: 15,
    расходНорма: 5,
    расходФакт: 5,
    видСообщения: 'городское',
    ...overrides,
  };
}

describe('formaПоТипуТС', () => {
  it('maps passenger car to form 3', () => {
    expect(формаПоТипуТС('легковой')).toBe('3');
    expect(названиеФормы('3')).toBe('форма № 3');
  });

  it('maps truck to form 4-c', () => {
    expect(формаПоТипуТС('грузовой')).toBe('4-c');
    expect(названиеФормы('4-c')).toBe('форма № 4-с');
  });
});

describe('поляФормы', () => {
  it('adds truck-only fields for form 4-c', () => {
    const rows = поляФормы('4-c', { input: sampleInput(), лист: sampleSheet() });
    expect(rows.some((r) => r.label === 'Вид перевозки (форма 4-с)')).toBe(true);
    expect(rows.some((r) => r.label === 'Прицеп или груз' && r.value === 'Да')).toBe(true);
  });

  it('keeps passenger form without truck fields', () => {
    const rows = поляФормы('3', {
      input: sampleInput({ типТС: 'легковой', формаПЛ: '3', прицепГруз: false }),
      лист: sampleSheet({ формаПЛ: '3' }),
    });
    expect(rows.some((r) => r.label === 'Прицеп или груз')).toBe(false);
    expect(rows[0].label).toContain('легкового');
  });
});
