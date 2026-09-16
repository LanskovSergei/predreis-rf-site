export interface FormLayout {
  nrows: number;
  ncols: number;
  rows: string[][];
  merges: [number, number, number, number][];
}

export interface OverlayField {
  /** Строка ячейки (0-based). */
  r: number;
  /** Столбец ячейки (0-based). */
  c: number;
  /** Ширина в ячейках. */
  w?: number;
  /** Высота в ячейках. */
  h?: number;
  value: (d: import('../../pdfFormUtils').ДанныеБланка) => string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
}
