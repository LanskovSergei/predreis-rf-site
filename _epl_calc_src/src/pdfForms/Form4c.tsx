import type { ДанныеБланка } from '../pdfFormUtils';
import { TemplateSheet } from './template/TemplateSheet';
import { FORM4C_FRONT_SIZE, form4cFrontFields } from './template/form4cFields';

/** Форма 4-С: только лицевая сторона (стр. 1) — альбомная ориентация, как в шаблоне. */
export function Form4cPages({ d }: { d: ДанныеБланка }) {
  return (
    <TemplateSheet
      image="form4c-front.png"
      orientation="landscape"
      width={FORM4C_FRONT_SIZE.width}
      height={FORM4C_FRONT_SIZE.height}
      fields={form4cFrontFields(d)}
      d={d}
    />
  );
}
