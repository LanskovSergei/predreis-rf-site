import type { ДанныеБланка } from '../../pdfFormUtils';
import type { TemplateField } from './types';

const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/gsm/';

export function TemplateSheet({
  image,
  orientation,
  width,
  height,
  fields,
  d,
}: {
  image: string;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  fields: TemplateField[];
  d: ДанныеБланка;
}) {
  return (
    <div
      className={`pdf-sheet pdf-sheet--template pdf-sheet--${orientation}`}
      data-orientation={orientation}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        minHeight: `${height}px`,
        backgroundImage: `url(${base}templates/${image})`,
      }}
    >
      {fields.map((field, i) => {
        const text = field.value(d);
        if (!text) return null;
        return (
          <div
            key={i}
            className="pl-template-field"
            style={{
              left: `${field.left * 100}%`,
              top: `${field.top * 100}%`,
              width: `${field.width * 100}%`,
              height: field.height ? `${field.height * 100}%` : undefined,
              fontSize: field.fontSize ? `${field.fontSize}pt` : '9pt',
              textAlign: field.align ?? 'left',
              fontWeight: field.fontWeight ?? 600,
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}
