import type { ДанныеБланка } from '../../pdfFormUtils';

export interface TemplateField {
  left: number;
  top: number;
  width: number;
  height?: number;
  value: (d: ДанныеБланка) => string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  fontWeight?: number;
}
