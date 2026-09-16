import type { ДанныеБланка } from '../../pdfFormUtils';
import type { TemplateField } from './types';

/** Координаты под фон `form3-front.png` (из putevoi-list-f3 (2).pdf, стр. 1). */
export function form3FrontFields(_d: ДанныеБланка): TemplateField[] {
  return [
    { left: 0.76, top: 0.052, width: 0.14, value: (d) => d.номер, align: 'center', fontSize: 10 },
    { left: 0.4, top: 0.088, width: 0.05, value: (d) => d.день, align: 'center', fontSize: 10 },
    { left: 0.46, top: 0.088, width: 0.05, value: (d) => d.месяц, align: 'center', fontSize: 10 },
    { left: 0.56, top: 0.088, width: 0.1, value: (d) => d.год, align: 'center', fontSize: 10 },
    { left: 0.06, top: 0.175, width: 0.58, value: (d) => d.маркаМодель, fontSize: 9 },
    { left: 0.06, top: 0.215, width: 0.58, value: (d) => d.водитель, fontSize: 9 },
    { left: 0.06, top: 0.305, width: 0.35, value: (d) => d.адресСтоянки, fontSize: 8 },
    { left: 0.52, top: 0.355, width: 0.12, value: (d) => d.топливо, align: 'center', fontSize: 8 },
    { left: 0.06, top: 0.42, width: 0.14, value: (d) => `${d.выпускЧ}:${d.выпускМин}`, fontSize: 9 },
    { left: 0.06, top: 0.48, width: 0.14, value: (d) => `${d.возвратЧ}:${d.возвратМин}`, fontSize: 9 },
    { left: 0.52, top: 0.42, width: 0.1, value: (d) => d.остатокВыезд, align: 'center', fontSize: 9 },
    { left: 0.52, top: 0.48, width: 0.1, value: (d) => d.остатокВозврат, align: 'center', fontSize: 9 },
    { left: 0.06, top: 0.56, width: 0.14, value: (d) => d.одометрВыезд, fontSize: 9 },
    { left: 0.22, top: 0.56, width: 0.14, value: (d) => d.одометрВозврат, fontSize: 9 },
    { left: 0.52, top: 0.56, width: 0.1, value: (d) => d.расходНорма, align: 'center', fontSize: 9 },
    { left: 0.64, top: 0.56, width: 0.1, value: (d) => d.расходФакт, align: 'center', fontSize: 9 },
  ];
}

/** Оборотная сторона — фон `form3-back.png` (стр. 3 PDF). */
export function form3BackFields(d: ДанныеБланка): TemplateField[] {
  const rowTop = 0.142;
  const rowStep = 0.0245;
  const fields: TemplateField[] = [];

  d.пробегПоДням.forEach((km, idx) => {
    const top = rowTop + idx * rowStep;
    fields.push(
      { left: 0.04, top, width: 0.05, value: () => String(idx + 1), align: 'center', fontSize: 8 },
      { left: 0.18, top, width: 0.14, value: () => d.адресСтоянки, fontSize: 7 },
      { left: 0.33, top, width: 0.14, value: () => d.адресСтоянки, fontSize: 7 },
      {
        left: 0.48,
        top,
        width: 0.04,
        value: () => (idx === 0 ? d.выпускЧ : ''),
        align: 'center',
        fontSize: 8,
      },
      {
        left: 0.52,
        top,
        width: 0.04,
        value: () => (idx === 0 ? d.выпускМин : ''),
        align: 'center',
        fontSize: 8,
      },
      {
        left: 0.56,
        top,
        width: 0.04,
        value: () => (idx === d.пробегПоДням.length - 1 ? d.возвратЧ : ''),
        align: 'center',
        fontSize: 8,
      },
      {
        left: 0.6,
        top,
        width: 0.04,
        value: () => (idx === d.пробегПоДням.length - 1 ? d.возвратМин : ''),
        align: 'center',
        fontSize: 8,
      },
      { left: 0.66, top, width: 0.08, value: () => km, align: 'center', fontSize: 8 },
    );
  });

  fields.push(
    { left: 0.12, top: 0.88, width: 0.12, value: () => `${d.времяНарядЧ}:${d.времяНарядМин}`, fontSize: 9 },
    { left: 0.12, top: 0.915, width: 0.12, value: () => d.пробег, fontSize: 9 },
  );

  return fields;
}

export const FORM3_FRONT_SIZE = { width: 794, height: 1034 };
export const FORM3_BACK_SIZE = { width: 794, height: 1204 };
