import type { ДанныеБланка } from '../../pdfFormUtils';
import type { OverlayField } from './types';

const tripRows = (d: ДанныеБланка, startRow: number): OverlayField[] => {
  const fields: OverlayField[] = [];
  d.пробегПоДням.forEach((km, idx) => {
    const r = startRow + idx;
    fields.push(
      { r, c: 1, w: 1, value: () => String(idx + 1), align: 'center', fontSize: 7 },
      { r, c: 4, w: 2, value: () => d.адресСтоянки, fontSize: 7 },
      { r, c: 6, w: 2, value: () => d.адресСтоянки, fontSize: 7 },
      {
        r,
        c: 7,
        w: 1,
        value: () => (idx === 0 ? d.выпускЧ : ''),
        align: 'center',
        fontSize: 7,
      },
      {
        r,
        c: 9,
        w: 1,
        value: () => (idx === 0 ? d.выпускМин : ''),
        align: 'center',
        fontSize: 7,
      },
      {
        r,
        c: 10,
        w: 1,
        value: () => (idx === d.пробегПоДням.length - 1 ? d.возвратЧ : ''),
        align: 'center',
        fontSize: 7,
      },
      {
        r,
        c: 11,
        w: 1,
        value: () => (idx === d.пробегПоДням.length - 1 ? d.возвратМин : ''),
        align: 'center',
        fontSize: 7,
      },
      { r, c: 12, w: 1, value: () => km, align: 'center', fontSize: 7 },
    );
  });
  return fields;
};

/** Лицевая сторона формы № 3 (шаблон putevoi-list-f3-2.xls). */
export function overlaysForm3Front(d: ДанныеБланка): OverlayField[] {
  return [
    { r: 3, c: 31, w: 2, value: () => d.номер, align: 'center' },
    { r: 4, c: 14, w: 1, value: () => d.день, align: 'center' },
    { r: 4, c: 15, w: 1, value: () => d.месяц, align: 'center' },
    { r: 4, c: 17, w: 2, value: () => d.год.slice(-2), align: 'center' },
    { r: 9, c: 2, w: 18, value: () => d.маркаМодель },
    { r: 11, c: 2, w: 18, value: () => d.водитель },
    { r: 28, c: 2, w: 8, value: () => `${d.выпускЧ} ${d.выпускМин}` },
    { r: 33, c: 2, w: 8, value: () => `${d.возвратЧ} ${d.возвратМин}` },
    { r: 36, c: 17, w: 4, value: () => d.топливо },
    { r: 38, c: 17, w: 4, value: () => d.остатокВыезд, align: 'center' },
    { r: 41, c: 17, w: 4, value: () => d.остатокВозврат, align: 'center' },
    { r: 43, c: 5, w: 4, value: () => d.одометрВыезд, align: 'center' },
    { r: 43, c: 17, w: 4, value: () => d.одометрВозврат, align: 'center' },
    { r: 44, c: 17, w: 4, value: () => d.расходНорма, align: 'center' },
    { r: 45, c: 17, w: 4, value: () => d.расходФакт, align: 'center' },
  ];
}

/** Оборотная сторона формы № 3. */
export function overlaysForm3Back(d: ДанныеБланка): OverlayField[] {
  return [
    ...tripRows(d, 4),
    { r: 32, c: 1, w: 4, value: () => `${d.времяНарядЧ} ${d.времяНарядМин}`, fontSize: 7 },
    { r: 34, c: 1, w: 4, value: () => d.пробег, fontSize: 7 },
  ];
}

/** Лицевая сторона формы № 4-С. */
export function overlaysForm4cFront(d: ДанныеБланка): OverlayField[] {
  return [
    { r: 2, c: 17, w: 3, value: () => d.номер, align: 'center', fontSize: 8 },
    { r: 3, c: 17, w: 1, value: () => d.день, align: 'center', fontSize: 8 },
    { r: 3, c: 19, w: 1, value: () => d.месяц, align: 'center', fontSize: 8 },
    { r: 3, c: 22, w: 2, value: () => d.год.slice(-2), align: 'center', fontSize: 8 },
    { r: 12, c: 1, w: 22, value: () => d.маркаМодель, fontSize: 7 },
    { r: 14, c: 1, w: 22, value: () => d.водитель, fontSize: 7 },
    { r: 21, c: 34, w: 2, value: () => d.топливо, fontSize: 7 },
    { r: 21, c: 40, w: 2, value: () => d.остатокВыезд, align: 'center', fontSize: 7 },
    { r: 21, c: 48, w: 2, value: () => d.остатокВозврат, align: 'center', fontSize: 7 },
    { r: 21, c: 52, w: 3, value: () => d.расходФакт, align: 'center', fontSize: 7 },
    { r: 34, c: 1, w: 10, value: () => d.адресСтоянки, fontSize: 7 },
    { r: 34, c: 55, w: 3, value: () => d.пробег, align: 'center', fontSize: 7 },
    { r: 35, c: 34, w: 2, value: () => d.день, align: 'center', fontSize: 7 },
    { r: 35, c: 36, w: 2, value: () => d.месяц, align: 'center', fontSize: 7 },
    { r: 35, c: 38, w: 1, value: () => d.выпускЧ, align: 'center', fontSize: 7 },
    { r: 35, c: 39, w: 1, value: () => d.выпускМин, align: 'center', fontSize: 7 },
    { r: 35, c: 42, w: 3, value: () => d.одометрВыезд, align: 'center', fontSize: 7 },
    { r: 36, c: 38, w: 1, value: () => d.возвратЧ, align: 'center', fontSize: 7 },
    { r: 36, c: 39, w: 1, value: () => d.возвратМин, align: 'center', fontSize: 7 },
    { r: 36, c: 42, w: 3, value: () => d.одометрВозврат, align: 'center', fontSize: 7 },
  ];
}

/** Оборотная сторона формы № 4-С. */
export function overlaysForm4cBack(d: ДанныеБланка): OverlayField[] {
  const fields: OverlayField[] = [];
  d.пробегПоДням.forEach((km, idx) => {
    const r = 6 + idx;
    fields.push(
      { r, c: 0, w: 1, value: () => String(idx + 1), align: 'center', fontSize: 7 },
      { r, c: 1, w: 6, value: () => d.адресСтоянки, fontSize: 7 },
      { r, c: 8, w: 6, value: () => d.адресСтоянки, fontSize: 7 },
      { r, c: 14, w: 2, value: () => (idx === 0 ? d.выпускЧ : ''), fontSize: 7 },
      { r, c: 16, w: 2, value: () => (idx === 0 ? d.выпускМин : ''), fontSize: 7 },
      { r, c: 18, w: 2, value: () => (idx === d.пробегПоДням.length - 1 ? d.возвратЧ : ''), fontSize: 7 },
      { r, c: 20, w: 2, value: () => (idx === d.пробегПоДням.length - 1 ? d.возвратМин : ''), fontSize: 7 },
      { r, c: 22, w: 3, value: () => km, align: 'center', fontSize: 7 },
    );
  });
  fields.push(
    { r: 24, c: 1, w: 3, value: () => d.расходНорма, fontSize: 7 },
    { r: 24, c: 5, w: 3, value: () => d.расходФакт, fontSize: 7 },
    { r: 24, c: 9, w: 3, value: () => `${d.времяНарядЧ}:${d.времяНарядМин}`, fontSize: 7 },
    { r: 24, c: 14, w: 3, value: () => d.пробег, fontSize: 7 },
  );
  return fields;
}
