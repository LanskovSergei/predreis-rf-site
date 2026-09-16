import type { ДанныеБланка } from '../../pdfFormUtils';
import type { FormLayout, OverlayField } from './types';

function buildMergeMaps(layout: FormLayout) {
  const covered = new Set<string>();
  const spanAt = new Map<string, { rowSpan: number; colSpan: number }>();

  for (const [rlo, rhi, clo, chi] of layout.merges) {
    const rowSpan = rhi - rlo;
    const colSpan = chi - clo;
    if (rowSpan <= 0 || colSpan <= 0) continue;
    spanAt.set(`${rlo},${clo}`, { rowSpan, colSpan });
    for (let r = rlo; r < rhi; r += 1) {
      for (let c = clo; c < chi; c += 1) {
        if (r !== rlo || c !== clo) covered.add(`${r},${c}`);
      }
    }
  }

  return { covered, spanAt };
}

function pct(n: number, total: number): string {
  return `${(n / total) * 100}%`;
}

function Overlay({
  field,
  layout,
  d,
}: {
  field: OverlayField;
  layout: FormLayout;
  d: ДанныеБланка;
}) {
  const text = field.value(d);
  if (!text) return null;

  const w = field.w ?? 1;
  const h = field.h ?? 1;

  return (
    <div
      className="pl-overlay-field"
      style={{
        top: pct(field.r, layout.nrows),
        left: pct(field.c, layout.ncols),
        width: pct(w, layout.ncols),
        height: pct(h, layout.nrows),
        fontSize: field.fontSize ? `${field.fontSize}pt` : undefined,
        textAlign: field.align ?? 'left',
      }}
    >
      {text}
    </div>
  );
}

export function LayoutSheet({
  layout,
  orientation,
  overlays = [],
  d,
}: {
  layout: FormLayout;
  orientation: 'portrait' | 'landscape';
  overlays?: OverlayField[];
  d: ДанныеБланка;
}) {
  const { covered, spanAt } = buildMergeMaps(layout);

  return (
    <div
      className={`pdf-sheet pdf-sheet--${orientation} pl-official-wrap`}
      data-orientation={orientation}
    >
      <table className="pl-layout-table">
        <tbody>
          {layout.rows.map((row, r) => (
            <tr key={r}>
              {row.map((raw, c) => {
                if (covered.has(`${r},${c}`)) return null;
                const span = spanAt.get(`${r},${c}`);
                const text = String(raw ?? '').replace(/\n/g, ' ').trim();
                return (
                  <td
                    key={c}
                    rowSpan={span?.rowSpan}
                    colSpan={span?.colSpan}
                    className={text ? 'pl-layout-cell--text' : 'pl-layout-cell--empty'}
                  >
                    {text || '\u00a0'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {overlays.map((field, i) => (
        <Overlay key={i} field={field} layout={layout} d={d} />
      ))}
    </div>
  );
}
