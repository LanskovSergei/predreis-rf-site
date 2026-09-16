import type { ДанныеБланка } from '../pdfFormUtils';
import form3Front from '../../templates/form3-1.compact.json';
import form3Back from '../../templates/form3-2.compact.json';
import { LayoutSheet } from './layout/LayoutSheet';
import type { FormLayout } from './layout/types';
import { overlaysForm3Back, overlaysForm3Front } from './layout/officialOverlays';

export function Form3Pages({ d }: { d: ДанныеБланка }) {
  return (
    <>
      <LayoutSheet
        layout={form3Front as FormLayout}
        orientation="portrait"
        overlays={overlaysForm3Front(d)}
        d={d}
      />
      <LayoutSheet
        layout={form3Back as FormLayout}
        orientation="portrait"
        overlays={overlaysForm3Back(d)}
        d={d}
      />
    </>
  );
}
