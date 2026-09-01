import type { ВходныеДанные, ПутевойЛист, ФормаПЛ } from '../types';
import { данныеБланка } from '../pdfFormUtils';
import { Form3Pages } from './Form3';
import { Form4cPages } from './Form4c';

export function PdfFormPages({
  forma,
  input,
  лист,
}: {
  forma: ФормаПЛ;
  input: ВходныеДанные;
  лист: ПутевойЛист;
}) {
  const d = данныеБланка(input, лист);
  if (forma === '3') return <Form3Pages d={d} />;
  return <Form4cPages d={d} />;
}
