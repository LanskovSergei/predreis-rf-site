import type { ДанныеБланка } from '../pdfFormUtils';
import form4cFront from '../../templates/form4c-1.compact.json';
import form4cBack from '../../templates/form4c-2.compact.json';
import { LayoutSheet } from './layout/LayoutSheet';
import type { FormLayout } from './layout/types';
import { overlaysForm4cBack, overlaysForm4cFront } from './layout/officialOverlays';

export function Form4cPages({ d }: { d: ДанныеБланка }) {
  return (
    <>
      <LayoutSheet
        layout={form4cFront as FormLayout}
        orientation="landscape"
        overlays={overlaysForm4cFront(d)}
        d={d}
      />
      <LayoutSheet
        layout={form4cBack as FormLayout}
        orientation="landscape"
        overlays={overlaysForm4cBack(d)}
        d={d}
      />
    </>
  );
}
