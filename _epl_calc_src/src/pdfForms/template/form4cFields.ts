import type { ДанныеБланка } from '../../pdfFormUtils';
import type { TemplateField } from './types';

/** Координаты под фон `form4c-front.png` (стр. 1 шаблона 4-С). */
export function form4cFrontFields(_d: ДанныеБланка): TemplateField[] {
  return [
    { left: 0.52, top: 0.042, width: 0.06, value: (d) => d.день, align: 'center', fontSize: 9 },
    { left: 0.58, top: 0.042, width: 0.06, value: (d) => d.месяц, align: 'center', fontSize: 9 },
    { left: 0.66, top: 0.042, width: 0.08, value: (d) => d.год, align: 'center', fontSize: 9 },
    { left: 0.78, top: 0.042, width: 0.1, value: (d) => d.номер, align: 'center', fontSize: 9 },
    { left: 0.04, top: 0.125, width: 0.28, value: (d) => d.маркаМодель, fontSize: 8 },
    { left: 0.04, top: 0.155, width: 0.28, value: (d) => d.водитель, fontSize: 8 },
    { left: 0.52, top: 0.195, width: 0.04, value: (d) => d.день, align: 'center', fontSize: 8 },
    { left: 0.56, top: 0.195, width: 0.04, value: (d) => d.месяц, align: 'center', fontSize: 8 },
    { left: 0.6, top: 0.195, width: 0.03, value: (d) => d.выпускЧ, align: 'center', fontSize: 8 },
    { left: 0.63, top: 0.195, width: 0.03, value: (d) => d.выпускМин, align: 'center', fontSize: 8 },
    { left: 0.72, top: 0.195, width: 0.08, value: (d) => d.одометрВыезд, align: 'center', fontSize: 8 },
    { left: 0.52, top: 0.225, width: 0.04, value: (d) => d.день, align: 'center', fontSize: 8 },
    { left: 0.56, top: 0.225, width: 0.04, value: (d) => d.месяц, align: 'center', fontSize: 8 },
    { left: 0.6, top: 0.225, width: 0.03, value: (d) => d.возвратЧ, align: 'center', fontSize: 8 },
    { left: 0.63, top: 0.225, width: 0.03, value: (d) => d.возвратМин, align: 'center', fontSize: 8 },
    { left: 0.72, top: 0.225, width: 0.08, value: (d) => d.одометрВозврат, align: 'center', fontSize: 8 },
    { left: 0.52, top: 0.265, width: 0.06, value: (d) => d.топливо, fontSize: 8 },
    { left: 0.62, top: 0.265, width: 0.05, value: (d) => d.остатокВыезд, align: 'center', fontSize: 8 },
    { left: 0.68, top: 0.265, width: 0.05, value: (d) => d.остатокВозврат, align: 'center', fontSize: 8 },
    { left: 0.74, top: 0.265, width: 0.05, value: (d) => d.расходФакт, align: 'center', fontSize: 8 },
    { left: 0.08, top: 0.52, width: 0.18, value: (d) => d.адресСтоянки, fontSize: 7 },
    { left: 0.28, top: 0.52, width: 0.18, value: (d) => d.адресСтоянки, fontSize: 7 },
    { left: 0.48, top: 0.52, width: 0.12, value: (d) => d.пробег, align: 'center', fontSize: 8 },
    { left: 0.74, top: 0.195, width: 0.08, value: (d) => `${d.выпускЧ}:${d.выпускМин}`, align: 'center', fontSize: 7 },
    { left: 0.74, top: 0.225, width: 0.08, value: (d) => `${d.возвратЧ}:${d.возвратМин}`, align: 'center', fontSize: 7 },
  ];
}

export const FORM4C_FRONT_SIZE = { width: 1123, height: 868 };
