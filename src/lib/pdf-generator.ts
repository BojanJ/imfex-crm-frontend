import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateMultiPagePdf(
  containerElement: HTMLElement,
  filename?: string
): Promise<{ pdf: jsPDF; pdfBase64: string }> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  // Query child page sections if available (e.g. #printable-offer-document > div)
  const pageElements = Array.from(containerElement.children) as HTMLElement[];

  const appendCanvasSlices = (canvas: HTMLCanvasElement, isFirstPage: boolean) => {
    const pageHeightPx = Math.floor((canvas.width * pdfHeight) / pdfWidth);
    let position = 0;
    let sliceIndex = 0;

    while (position < canvas.height) {
      const remaining = canvas.height - position;
      // Avoid creating a nearly-empty trailing page for 1-3px rounding overflow
      if (sliceIndex > 0 && remaining < 8) break;

      const sliceHeightPx = Math.min(pageHeightPx, remaining);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          position,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx
        );
      }

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      const sliceHeightMm = (sliceHeightPx * pdfWidth) / canvas.width;

      if (!isFirstPage || sliceIndex > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, sliceHeightMm);
      position += pageHeightPx;
      sliceIndex++;
    }
  };

  if (pageElements.length > 1) {
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const renderedHeightMm = (canvas.height * pdfWidth) / canvas.width;
      if (renderedHeightMm <= pdfHeight + 2) {
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(renderedHeightMm, pdfHeight));
      } else {
        appendCanvasSlices(canvas, i === 0);
      }
    }
  } else {
    const canvas = await html2canvas(containerElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    appendCanvasSlices(canvas, true);
  }

  const dataUri = pdf.output('datauristring');
  // Strip out any data URI header if present to extract pure base64
  const pdfBase64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;

  if (filename) {
    pdf.save(filename);
  }

  return { pdf, pdfBase64 };
}
