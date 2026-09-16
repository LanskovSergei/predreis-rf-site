import type { ДанныеБланка } from '../pdfFormUtils';
import { TemplateSheet } from './template/TemplateSheet';
import { FORM3_BACK_SIZE, FORM3_FRONT_SIZE, form3BackFields, form3FrontFields } from './template/form3Fields';

export function Form3Pages({ d }: { d: ДанныеБланка }) {
  return (
    <>
      <TemplateSheet
        image="form3-front.png"
        orientation="portrait"
        width={FORM3_FRONT_SIZE.width}
        height={FORM3_FRONT_SIZE.height}
        fields={form3FrontFields(d)}
        d={d}
      />
      <TemplateSheet
        image="form3-back.png"
        orientation="portrait"
        width={FORM3_BACK_SIZE.width}
        height={FORM3_BACK_SIZE.height}
        fields={form3BackFields(d)}
        d={d}
      />
    </>
  );
}
