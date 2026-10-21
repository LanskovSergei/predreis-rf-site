import { jsPDF } from 'jspdf';
import regularUrl from './fonts/Roboto-Regular.ttf?url';
import boldUrl from './fonts/Roboto-Bold.ttf?url';

type Orientation = 'portrait' | 'landscape';

let regularB64: string | null = null;
let boldB64: string | null = null;

function sheetOrientation(el: HTMLElement): Orientation {
  return el.dataset.orientation === 'landscape' ? 'landscape' : 'portrait';
}

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function ensureFonts(pdf: jsPDF): Promise<void> {
  if (!regularB64 || !boldB64) {
    const [regular, bold] = await Promise.all([
      fetch(regularUrl).then((res) => res.arrayBuffer()),
      fetch(boldUrl).then((res) => res.arrayBuffer()),
    ]);
    regularB64 = bytesToBase64(regular);
    boldB64 = bytesToBase64(bold);
  }
  pdf.addFileToVFS('Roboto-Regular.ttf', regularB64);
  pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  pdf.addFileToVFS('Roboto-Bold.ttf', boldB64);
  pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  pdf.setFont('Roboto', 'normal');
}

function quant(n: number): number {
  return Math.round(n * 8) / 8;
}

/** Линии сетки бланка: границы ячеек, без повторной обводки соседних клеток. */
function drawRules(pdf: jsPDF, sheet: HTMLElement, origin: DOMRect, sx: number, sy: number) {
  const edges = new Set<string>();
  const nodes = sheet.querySelectorAll<HTMLElement>('*');
  nodes.forEach((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width < 0.5 || rect.height < 0.5) return;
    const x1 = (rect.left - origin.left) * sx;
    const y1 = (rect.top - origin.top) * sy;
    const x2 = (rect.right - origin.left) * sx;
    const y2 = (rect.bottom - origin.top) * sy;
    const sides: Array<[string, string, string, number, number, number, number]> = [
      [style.borderTopWidth, style.borderTopStyle, style.borderTopColor, x1, y1, x2, y1],
      [style.borderRightWidth, style.borderRightStyle, style.borderRightColor, x2, y1, x2, y2],
      [style.borderBottomWidth, style.borderBottomStyle, style.borderBottomColor, x1, y2, x2, y2],
      [style.borderLeftWidth, style.borderLeftStyle, style.borderLeftColor, x1, y1, x1, y2],
    ];
    for (const [width, borderStyle, color, ax, ay, bx, by] of sides) {
      if (parseFloat(width) < 0.5) continue;
      if (borderStyle === 'none' || borderStyle === 'hidden') continue;
      if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') continue;
      const horizontal = Math.abs(ay - by) < 0.05;
      if (horizontal) {
        const y = quant((ay + by) / 2);
        const a = quant(Math.min(ax, bx));
        const b = quant(Math.max(ax, bx));
        if (b - a >= 0.3) edges.add(`h:${y}:${a}:${b}`);
      } else {
        const x = quant((ax + bx) / 2);
        const a = quant(Math.min(ay, by));
        const b = quant(Math.max(ay, by));
        if (b - a >= 0.3) edges.add(`v:${x}:${a}:${b}`);
      }
    }
  });

  pdf.setDrawColor(0);
  pdf.setLineWidth(0.15);
  edges.forEach((edge) => {
    const [kind, p, a, b] = edge.split(':');
    const mid = Number(p);
    const from = Number(a);
    const to = Number(b);
    if (kind === 'h') pdf.line(from, mid, to, mid);
    else pdf.line(mid, from, mid, to);
  });
}

function drawText(pdf: jsPDF, sheet: HTMLElement, origin: DOMRect, sx: number, sy: number) {
  const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const raw = node.textContent ?? '';
    const text = raw.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    const parent = node.parentElement;
    if (text && parent) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.2 && r.height > 0.2);
      if (rects.length) {
        const style = getComputedStyle(parent);
        const weight = Number.parseInt(style.fontWeight, 10) || 400;
        const fontPt = (Number.parseFloat(style.fontSize) || 12) * 0.75;
        pdf.setTextColor(0);
        pdf.setFont('Roboto', weight >= 600 ? 'bold' : 'normal');
        pdf.setFontSize(fontPt);

        if (rects.length > 1) {
          const box = parent.getBoundingClientRect();
          const align = style.textAlign === 'center' || style.textAlign === 'right' ? style.textAlign : 'left';
          const pad = 1.5;
          const innerLeft = box.left + pad;
          const innerWidth = Math.max(box.width - pad * 2, 4);
          const xPx = align === 'center' ? innerLeft + innerWidth / 2 : align === 'right' ? innerLeft + innerWidth : innerLeft;
          pdf.text(text, (xPx - origin.left) * sx, (rects[0].top - origin.top) * sy, {
            align,
            maxWidth: innerWidth * sx,
            baseline: 'top',
          });
        } else {
          const rect = rects[0];
          const limit = Math.max(rect.width * sx, 2);
          let size = fontPt;
          pdf.setFontSize(size);
          while (size > 5 && pdf.getTextWidth(text) > limit + 0.3) {
            size -= 0.3;
            pdf.setFontSize(size);
          }
          pdf.text(text, (rect.left - origin.left) * sx, (rect.top - origin.top) * sy, {
            maxWidth: limit + 0.4,
            baseline: 'top',
          });
        }
      }
    }
    node = walker.nextNode();
  }
}

function drawSheet(pdf: jsPDF, sheet: HTMLElement) {
  const origin = sheet.getBoundingClientRect();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const sx = pageWidth / origin.width;
  const sy = pageHeight / origin.height;
  drawRules(pdf, sheet, origin, sx, sy);
  drawText(pdf, sheet, origin, sx, sy);
}

export async function downloadSheetsPdf(container: HTMLElement, filename: string): Promise<void> {
  const sheets = container.querySelectorAll<HTMLElement>('.pdf-sheet');
  if (!sheets.length) return;

  const pdf = new jsPDF({
    orientation: sheetOrientation(sheets[0]),
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  await ensureFonts(pdf);

  for (let i = 0; i < sheets.length; i += 1) {
    const sheet = sheets[i];
    const orientation = sheetOrientation(sheet);
    if (i > 0) pdf.addPage('a4', orientation);
    drawSheet(pdf, sheet);
  }

  pdf.save(filename);
}
