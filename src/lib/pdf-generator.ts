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

  if (pageElements.length > 1) {
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }
  } else {
    // Fallback if there is a single long container: render entire element and slice canvas vertically
    const canvas = await html2canvas(containerElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgWidth = pdfWidth;
    const pageHeightPx = Math.floor((canvas.width * pdfHeight) / pdfWidth);
    let position = 0;
    let pageIndex = 0;

    while (position < canvas.height) {
      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(pageHeightPx, canvas.height - position);

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          position,
          canvas.width,
          pageCanvas.height,
          0,
          0,
          canvas.width,
          pageCanvas.height
        );
      }

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      const sliceHeightMm = (pageCanvas.height * pdfWidth) / canvas.width;

      if (pageIndex > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, sliceHeightMm);
      position += pageHeightPx;
      pageIndex++;
    }
  }

  const dataUri = pdf.output('datauristring');
  // Strip out any data URI header if present to extract pure base64
  const pdfBase64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;

  if (filename) {
    pdf.save(filename);
  }

  return { pdf, pdfBase64 };
}
