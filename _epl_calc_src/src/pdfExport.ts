import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadSheetsPdf(container: HTMLElement, filename: string): Promise<void> {
  const sheets = container.querySelectorAll<HTMLElement>('.pdf-sheet');
  if (!sheets.length) return;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  for (let i = 0; i < sheets.length; i += 1) {
    if (i > 0) pdf.addPage();

    const canvas = await html2canvas(sheets[i], {
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: sheets[i].scrollWidth,
    } as Parameters<typeof html2canvas>[1]);

    const imgData = canvas.toDataURL('image/png');
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const width = canvas.width * ratio;
    const height = canvas.height * ratio;

    pdf.addImage(imgData, 'PNG', margin, margin, width, height);
  }

  pdf.save(filename);
}
