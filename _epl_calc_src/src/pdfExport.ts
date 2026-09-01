import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type Orientation = 'portrait' | 'landscape';

function sheetOrientation(el: HTMLElement): Orientation {
  return el.dataset.orientation === 'landscape' ? 'landscape' : 'portrait';
}

export async function downloadSheetsPdf(container: HTMLElement, filename: string): Promise<void> {
  const sheets = container.querySelectorAll<HTMLElement>('.pdf-sheet');
  if (!sheets.length) return;

  const firstOrientation = sheetOrientation(sheets[0]);
  const pdf = new jsPDF({ orientation: firstOrientation, unit: 'mm', format: 'a4' });

  for (let i = 0; i < sheets.length; i += 1) {
    const sheet = sheets[i];
    const orientation = sheetOrientation(sheet);
    if (i > 0) pdf.addPage('a4', orientation);

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    const canvas = await html2canvas(sheet, {
      backgroundColor: '#ffffff',
      logging: false,
      scale: 2,
      windowWidth: sheet.scrollWidth,
    } as Parameters<typeof html2canvas>[1]);

    const imgData = canvas.toDataURL('image/png');
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const width = canvas.width * ratio;
    const height = canvas.height * ratio;
    const x = margin + (maxWidth - width) / 2;

    pdf.addImage(imgData, 'PNG', x, margin, width, height);
  }

  pdf.save(filename);
}
