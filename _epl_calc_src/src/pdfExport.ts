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

    const canvas = await html2canvas(sheet, {
      backgroundColor: '#ffffff',
      logging: false,
      scale: 2,
      width: sheet.offsetWidth,
      height: sheet.offsetHeight,
      windowWidth: sheet.offsetWidth,
      windowHeight: sheet.offsetHeight,
      useCORS: true,
    } as Parameters<typeof html2canvas>[1]);

    const imgData = canvas.toDataURL('image/png');

    // Вписываем с сохранением пропорций (а не растягиваем на всю страницу) —
    // PNG-бланки сняты с реальных сканов и не обязаны совпадать по пропорциям с A4.
    const imgRatio = canvas.width / canvas.height;
    const pageRatio = pageWidth / pageHeight;
    let drawWidth = pageWidth;
    let drawHeight = pageHeight;
    if (imgRatio > pageRatio) {
      drawHeight = pageWidth / imgRatio;
    } else {
      drawWidth = pageHeight * imgRatio;
    }
    const offsetX = (pageWidth - drawWidth) / 2;
    const offsetY = (pageHeight - drawHeight) / 2;

    pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawWidth, drawHeight);
  }

  pdf.save(filename);
}
