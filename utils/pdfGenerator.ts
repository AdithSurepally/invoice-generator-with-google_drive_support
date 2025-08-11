


import type { InvoiceData, DocType } from '../types';
import { numberToWords } from '../utils/numberToWords';
import { UPI_ID } from '../constants';
import { BRANDING_CONFIG } from '../config';
import QRCode from 'qrcode';

const { jsPDF } = (window as any).jspdf;

const formatCurrencyForPdf = (amount: number) => {
  const numberPart = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${numberPart}`;
};

const fetchImageAsBase64 = (url: string): Promise<string | null> =>
  fetch(url)
    .then(response => {
      if (!response.ok) {
        console.warn(`Failed to fetch image at ${url}. Status: ${response.status}`);
        return null; // Return null instead of throwing an error
      }
      return response.blob();
    })
    .then(blob => {
      if (!blob) return null;
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            console.warn(`FileReader result for ${url} was not a string.`);
            resolve(null);
          }
        };
        reader.onerror = (e) => {
            console.error(`FileReader error for ${url}:`, e);
            resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    })
    .catch(error => {
        console.error(`Network error fetching image at ${url}:`, error);
        return null; // Return null on any other error
    });

/**
 * Creates and returns a jsPDF document instance for the invoice/quotation.
 * This is the core PDF generation logic, now reusable for preview and download.
 * @param data The InvoiceData object containing all information.
 * @param docType The type of document to generate ('invoice' or 'quotation').
 * @returns A promise that resolves with the jsPDF document instance.
 */
export const createPdfDoc = async (data: InvoiceData, docType: DocType) => {
  const { company, quote, customer, bank, items, transport, termsAndConditions } = data;

  const subtotal = items.reduce((acc, item) => acc + item.rate * item.qty, 0);
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const total = subtotal + cgst + sgst + transport.cost;

  let logoBase64: string | null = null;
  let qrCodePngBase64: string | null = null;
  let upiUrl: string | null = null;

  try {
    logoBase64 = await fetchImageAsBase64('/logo.png');

    if (docType === 'invoice') {
      const payeeName = encodeURIComponent(company.name);
      const transactionNote = encodeURIComponent(quote.no);
      const amount = total.toFixed(2);
      
      upiUrl = `upi://pay?pa=${UPI_ID}&pn=${payeeName}&am=${amount}&tn=${transactionNote}&cu=INR`;
      
      qrCodePngBase64 = await QRCode.toDataURL(upiUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 256,
      });

    } else { // 'quotation'
      if (BRANDING_CONFIG.WEBSITE_URL) {
        qrCodePngBase64 = await QRCode.toDataURL(BRANDING_CONFIG.WEBSITE_URL, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 256,
        });
      }
    }
  } catch (error) {
    console.error("Failed to generate QR code for PDF:", error);
    alert("Could not generate the QR code. The PDF will be created without it. Please check the console for details.");
    qrCodePngBase64 = null; // Ensure QR is null on error so PDF can still be created
  }
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  let y = margin + 8;

  // --- Header ---
  if (logoBase64) {
    try {
        const logoW = 58;
        const logoH = 16;
        doc.addImage(logoBase64, 'PNG', margin, y - logoH / 2, logoW, logoH);
    } catch (e) {
        console.warn("Could not add company logo to PDF:", e);
        doc.setFontSize(10);
        doc.text('[Company Logo]', margin, y);
    }
  } else {
    doc.setFontSize(8);
    doc.text('[Company Logo Not Found]', margin, y);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(docType.toUpperCase(), pageW / 2, y, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const companyDetailsX = pageW - margin;
  let companyY = y - 8;
  doc.text(company.name, companyDetailsX, companyY, { align: 'right' }); companyY += 4;
  
  const addressMaxWidth = contentW / 2.8; 
  const addressLines = doc.splitTextToSize(company.address, addressMaxWidth);
  doc.text(addressLines, companyDetailsX, companyY, { align: 'right' });
  companyY += addressLines.length * 4;

  doc.text(`GSTIN: ${company.gstin}`, companyDetailsX, companyY, { align: 'right' }); companyY += 4;
  doc.text(`Contact: ${company.contactPerson} (${company.phone})`, companyDetailsX, companyY, { align: 'right' });

  y = Math.max(y, companyY) + 6;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  
  y += 6;

  // --- Invoice & Customer Info Boxes ---
  const infoBoxW = contentW / 2;
  doc.setFontSize(8.5);

  let leftDetails: { label: string; value: string; valueIsBold?: boolean }[] = [];
  let rightDetails: { label: string; value: string; valueIsBold?: boolean }[] = [];

  if (docType === 'invoice') {
    // Format invoice number for PDF to follow Indian Financial Year (April-March)
    const dateForYear = new Date(quote.date);
    const month = dateForYear.getMonth(); // 0-11
    
    // If month is Jan, Feb, Mar (0,1,2), financial year started in the previous calendar year.
    const financialYearStart = month < 3 ? dateForYear.getFullYear() - 1 : dateForYear.getFullYear();
    const financialYearEndShort = (financialYearStart + 1).toString().slice(-2);
    const numberPart = quote.no.split('-').pop() || '001';
    const formattedInvoiceNo = `INV_${numberPart}/${financialYearStart}-${financialYearEndShort}`;

    leftDetails = [
      { label: 'Invoice No.:', value: formattedInvoiceNo },
      { label: 'Date of Invoice:', value: quote.date },
      { label: 'Made For:', value: customer.name, valueIsBold: true },
      { label: 'Delivery Address:', value: transport.deliveryAddress },
      { label: 'State:', value: customer.state },
    ];
    rightDetails = [
      { label: 'Consignee GST:', value: customer.consigneeGst },
      { label: 'Customer No.:', value: customer.number },
      { label: 'Mode of Transport:', value: transport.mode },
      { label: 'Place of Supply:', value: transport.placeOfSupply },
      { label: 'Vehicle No.:', value: transport.vehicleNo },
    ];
  } else { // Quotation
    leftDetails = [
      { label: 'Quote No.:', value: quote.no },
      { label: 'Date of Quote:', value: quote.date },
      { label: 'Made For:', value: customer.name, valueIsBold: true },
      { label: 'Delivery Address:', value: transport.deliveryAddress },
      { label: 'State:', value: customer.state },
    ];
    rightDetails = [
      { label: 'Consignee GST:', value: customer.consigneeGst },
      { label: 'Customer No.:', value: customer.number },
      { label: 'Valid through:', value: quote.validThrough },
      { label: 'Mode of Transport:', value: transport.mode },
      { label: 'Place of Supply:', value: transport.placeOfSupply },
      { label: 'Vehicle No.:', value: transport.vehicleNo },
    ];
  }

  const valueMaxWidth = infoBoxW - 32 - 8;
  const labelMaxWidthForCalc = 32 - 8; // approx width of label column

  const calculateInfoBoxHeight = (details: { label: string, value: string }[]) => {
    let contentHeight = 0;
    const desiredLineHeightMM = 5;
    details.forEach(detail => {
      const labelLines = doc.splitTextToSize(detail.label, labelMaxWidthForCalc);
      const valueLines = doc.splitTextToSize(detail.value, valueMaxWidth);
      const rowLines = Math.max(labelLines.length, valueLines.length);
      contentHeight += rowLines * desiredLineHeightMM;
    });
    return 8 + contentHeight;
  };

  const drawInfoContent = (x: number, startY: number, details: { label: string, value: string, valueIsBold?: boolean }[]) => {
    const boxPadding = 4;
    let textY = startY + boxPadding + 2;
    const labelX = x + boxPadding;
    const valueX = labelX + 32;
    const valueDrawingMaxWidth = infoBoxW - (valueX - x) - boxPadding;
    const labelDrawingMaxWidth = valueX - labelX - boxPadding;

    const desiredLineHeightMM = 5;
    const fontSizeMM = doc.getFontSize() / doc.internal.scaleFactor;
    const lineHeightFactor = desiredLineHeightMM / fontSizeMM;

    details.forEach(detail => {
      doc.setFont('helvetica', 'normal');
      const labelLines = doc.splitTextToSize(detail.label, labelDrawingMaxWidth);
      doc.text(labelLines, labelX, textY, { baseline: 'top', lineHeightFactor: lineHeightFactor });

      doc.setFont('helvetica', detail.valueIsBold ? 'bold' : 'normal');
      const valueLines = doc.splitTextToSize(detail.value, valueDrawingMaxWidth);
      doc.text(valueLines, valueX, textY, { baseline: 'top', lineHeightFactor: lineHeightFactor });
      doc.setFont('helvetica', 'normal');
      
      const rowLines = Math.max(labelLines.length, valueLines.length);
      textY += rowLines * desiredLineHeightMM;
    });
  };
  
  const leftBoxH = calculateInfoBoxHeight(leftDetails);
  const rightBoxH = calculateInfoBoxHeight(rightDetails);
  const maxBoxH = Math.max(leftBoxH, rightBoxH, 30);

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.setFillColor(242, 242, 242);
  doc.rect(margin, y, contentW, maxBoxH, 'F');
  doc.rect(margin, y, contentW, maxBoxH, 'S');
  doc.line(margin + infoBoxW, y, margin + infoBoxW, y + maxBoxH);

  drawInfoContent(margin, y, leftDetails);
  drawInfoContent(margin + infoBoxW, y, rightDetails);
  
  y += maxBoxH + 6;

  // --- Items Table ---
  const tableHeaders = ['Sl. No.', 'HSN', 'Description', 'Rate', 'Qty', 'Value'];
  const colWidths = [14, 16, contentW - 14 - 16 - 25 - 15 - 32, 25, 15, 32];
  
  const drawTableHeader = () => {
    doc.setFillColor(173, 173, 173);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    doc.rect(margin, y, contentW, 8, 'F');
    let currentX = margin;
    tableHeaders.forEach((header, i) => {
      doc.text(header, currentX + colWidths[i] / 2, y + 5.5, { align: 'center' });
      currentX += colWidths[i];
    });
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
  };
  
  drawTableHeader();

  items.forEach((item, index) => {
    const itemValue = item.rate * item.qty;
    const descriptionLines = doc.splitTextToSize(item.description, colWidths[2] - 4);
    const rowHeight = Math.max(8, (descriptionLines.length * 4) + 4);

    if (y + rowHeight > pageH - 60) {
      doc.addPage();
      y = margin;
      drawTableHeader();
    }

    doc.setDrawColor(222);
    const vCenter = y + rowHeight / 2;
    const topAlign = y + 3.5;

    let currentX = margin;
    doc.text((index + 1).toString(), currentX + colWidths[0] / 2, vCenter, { align: 'center', baseline: 'middle' });
    currentX += colWidths[0];
    doc.text(item.hsn, currentX + colWidths[1] / 2, vCenter, { align: 'center', baseline: 'middle' });
    currentX += colWidths[1];
    doc.text(descriptionLines, currentX + 2, topAlign, { align: 'left', baseline: 'top' });
    currentX += colWidths[2];
    doc.text(formatCurrencyForPdf(item.rate), currentX + colWidths[3] - 2, vCenter, { align: 'right', baseline: 'middle' });
    currentX += colWidths[3];
    doc.text(item.qty.toString(), currentX + colWidths[4] / 2, vCenter, { align: 'center', baseline: 'middle' });
    currentX += colWidths[4];
    doc.text(formatCurrencyForPdf(itemValue), currentX + colWidths[5] - 2, vCenter, { align: 'right', baseline: 'middle' });
    
    let lineX = margin;
    doc.line(lineX, y, lineX, y + rowHeight);
    colWidths.forEach(w => {
        lineX += w;
        doc.line(lineX, y, lineX, y + rowHeight);
    });
    doc.line(margin, y + rowHeight, margin + contentW, y + rowHeight);
    
    y += rowHeight;
  });
  
  // --- POST-TABLE SECTIONS ---
  y += 5;

  const postTableStartY = y;

  const totalsBoxWidth = contentW * 0.45;
  const totalsX = pageW - margin - totalsBoxWidth;
  
  const totalLinesData = [
    { label: 'Subtotal:', value: formatCurrencyForPdf(subtotal) },
    { label: 'CGST @ 9%:', value: formatCurrencyForPdf(cgst) },
    { label: 'SGST @ 9%:', value: formatCurrencyForPdf(sgst) },
    { label: 'Transportation:', value: formatCurrencyForPdf(transport.cost) }
  ];

  const regularLineHeight = 6;
  const totalLineHeight = 8;
  const totalsBoxHeight = (regularLineHeight * totalLinesData.length) + totalLineHeight;

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.rect(totalsX, postTableStartY, totalsBoxWidth, totalsBoxHeight, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0);
  
  totalLinesData.forEach((line, index) => {
    const lineY = postTableStartY + (index * regularLineHeight);
    doc.text(line.label, totalsX + 4, lineY + 4.5);
    doc.text(line.value, pageW - margin - 4, lineY + 4.5, { align: 'right' });
    if (index < totalLinesData.length - 1) {
      doc.setLineWidth(0.2);
      doc.line(totalsX + 1, lineY + regularLineHeight, totalsX + totalsBoxWidth - 1, lineY + regularLineHeight);
    }
  });

  const totalLineY = postTableStartY + (regularLineHeight * totalLinesData.length);
  doc.setLineWidth(0.4);
  doc.line(totalsX, totalLineY, totalsX + totalsBoxWidth, totalLineY);
  
  doc.setFillColor(196, 196, 196);
  doc.rect(totalsX, totalLineY, totalsBoxWidth, totalLineHeight, 'F');
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsX + 4, totalLineY + 5.5);
  doc.text(formatCurrencyForPdf(total), pageW - margin - 4, totalLineY + 5.5, { align: 'right' });

  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  
  const amountWordsBoxX = margin;
  const amountWordsBoxY = postTableStartY;
  const amountWordsBoxWidth = contentW - totalsBoxWidth - 4;
  const amountValue = `${numberToWords(total)} Rupees Only.`;
  const boxPadding = 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const labelWidth = doc.getTextWidth('Amount in Words: ');
  doc.setFont('helvetica', 'normal');
  const amountTextLines = doc.splitTextToSize(amountValue, amountWordsBoxWidth - labelWidth - (boxPadding * 2));
  
  const amountWordsContentHeight = amountTextLines.length * 4;
  const amountWordsBoxHeight = amountWordsContentHeight + (boxPadding * 2);

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.rect(amountWordsBoxX, amountWordsBoxY, amountWordsBoxWidth, amountWordsBoxHeight, 'S');

  let contentYInBox = amountWordsBoxY + boxPadding;
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words:', amountWordsBoxX + boxPadding, contentYInBox + 1, { baseline: 'top' });
  doc.setFont('helvetica', 'normal');
  doc.text(amountTextLines, amountWordsBoxX + boxPadding + labelWidth, contentYInBox + 1, { baseline: 'top' });
  
  const gstTextY = amountWordsBoxY + amountWordsBoxHeight + 4;
  doc.setFont('helvetica', 'bold');
  doc.text('18% GST EXTRA', amountWordsBoxX, gstTextY);
  
  const leftSectionHeight = amountWordsBoxHeight + 5;
  y = postTableStartY + Math.max(totalsBoxHeight, leftSectionHeight) + 10;

  // --- Footer Section (Bank, T&C) ---
  if (y > pageH - 85) {
      doc.addPage();
      y = margin;
  }

  const footerBoxW = (contentW - 8) / 2;
  doc.setFontSize(8);

  const bankLines = [
    `Bank Name: ${bank.name}`, `Account Name: ${bank.accountName}`, `Account No: ${bank.accountNumber}`,
    `IFSC Code: ${bank.ifsc}`, `Branch: ${bank.branch}`
  ];

  // --- New T&C calculation & drawing logic ---
  const tncContentWidth = footerBoxW - 8;
  const tncLineHeight = 4.5;

  let calculatedTncHeight = 0;
  const tncLinesForCalc = termsAndConditions.split('\n');
  tncLinesForCalc.forEach(line => {
      if (line.trim() === '') {
          calculatedTncHeight += tncLineHeight;
          return;
      }
      const match = line.match(/^(\d+[\.\)]\s*)/);
      if (match) {
          const prefix = match[0];
          const restOfText = line.substring(prefix.length);
          const indent = doc.getTextWidth(prefix);
          const splitText = doc.splitTextToSize(restOfText, tncContentWidth - indent);
          calculatedTncHeight += splitText.length * tncLineHeight;
      } else {
          const splitText = doc.splitTextToSize(line, tncContentWidth);
          calculatedTncHeight += splitText.length * tncLineHeight;
      }
  });

  const bankBoxHeight = 8 + bankLines.length * 5 + 4;
  const tncBoxHeight = 8 + calculatedTncHeight + 4;
  const footerBoxHeight = Math.max(bankBoxHeight, tncBoxHeight);
  
  // Draw Bank Box
  doc.setDrawColor(200);
  doc.rect(margin, y, footerBoxW, footerBoxHeight, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Information', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(bankLines, margin + 4, y + 13, { lineHeightFactor: 1.5 });
  
  // Draw T&C Box and content
  const tncX = margin + footerBoxW + 8;
  doc.rect(tncX, y, footerBoxW, footerBoxHeight, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions', tncX + 4, y + 6);
  doc.setFont('helvetica', 'normal');

  let tncDrawY = y + 13;
  const tncDrawX = tncX + 4;
  const tncLinesToDraw = termsAndConditions.split('\n');

  tncLinesToDraw.forEach(line => {
      if (line.trim() === '') {
          tncDrawY += tncLineHeight;
          return;
      }
      const match = line.match(/^(\d+[\.\)]\s*)/);
      if (match) {
          const prefix = match[0];
          const restOfText = line.substring(prefix.length);
          const indent = doc.getTextWidth(prefix);
          const splitText = doc.splitTextToSize(restOfText, tncContentWidth - indent);
          
          doc.text(prefix + splitText[0], tncDrawX, tncDrawY, { baseline: 'top' });
          tncDrawY += tncLineHeight;

          for (let i = 1; i < splitText.length; i++) {
              doc.text(splitText[i], tncDrawX + indent, tncDrawY, { baseline: 'top' });
              tncDrawY += tncLineHeight;
          }
      } else {
          const splitText = doc.splitTextToSize(line, tncContentWidth);
          for (let i = 0; i < splitText.length; i++) {
              doc.text(splitText[i], tncDrawX, tncDrawY, { baseline: 'top' });
              tncDrawY += tncLineHeight;
          }
      }
  });
  // --- End of new T&C logic ---

  // --- Final Signature Footer ---
  const finalFooterY = pageH - 40;
  y = Math.max(y + footerBoxHeight + 5, finalFooterY);
  if (y > pageH - 40 && y < finalFooterY) { 
    y = finalFooterY;
  } else if (y > pageH - 40) {
    doc.addPage();
    y = finalFooterY;
  }
  
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentW, y);
  const footerTopY = y;

  const signatureY = footerTopY + 20;

  const qrCodeSize = 24;
  const qrX = pageW / 2 - qrCodeSize / 2;
  const qrY = footerTopY; 

  if (qrCodePngBase64) {
    try {
        doc.addImage(qrCodePngBase64, 'PNG', qrX, qrY, qrCodeSize, qrCodeSize);
        if (docType === 'quotation') {
            if (BRANDING_CONFIG.WEBSITE_URL) {
                doc.link(qrX, qrY, qrCodeSize, qrCodeSize, { url: BRANDING_CONFIG.WEBSITE_URL });
                const linkText = BRANDING_CONFIG.QUOTATION_QR_TEXT || 'Visit our Website';
                const textY = qrY + qrCodeSize + 4;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 255); // Style text as a link
                doc.textWithLink(linkText, pageW / 2, textY, { align: 'center', url: BRANDING_CONFIG.WEBSITE_URL });
                doc.setTextColor(0, 0, 0); // Reset text color
            } else {
                 doc.setFont('helvetica', 'bold');
                 doc.setFontSize(8);
                 doc.text('Scan for Details', pageW / 2, qrY + qrCodeSize + 4, { align: 'center' });
            }
        } else { // It's an invoice
            if (upiUrl) {
                doc.link(qrX, qrY, qrCodeSize, qrCodeSize, { url: upiUrl });
                const linkText = 'Scan or Click to Pay';
                const textY = qrY + qrCodeSize + 4;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 255); // Style text as a link
                doc.textWithLink(linkText, pageW / 2, textY, { align: 'center', url: upiUrl });
                doc.setTextColor(0, 0, 0); // Reset text color
            } else {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.text('Scan to Pay', pageW / 2, qrY + qrCodeSize + 4, { align: 'center' });
            }
        }
    } catch(e) {
      console.warn("Could not add QR code image to PDF:", e);
      doc.text('[QR Code Error]', pageW / 2, qrY + qrCodeSize/2, {align: 'center'});
    }
  } else {
    doc.setFontSize(8);
    doc.text('[QR Code Not Available]', pageW / 2, qrY + qrCodeSize/2, {align: 'center'});
  }

  doc.setFont('helvetica', 'normal');
  doc.text('___________________________', margin, signatureY);
  doc.text('___________________________', pageW - margin, signatureY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('Receiver Sign', margin, signatureY + 5);
  doc.text('Authorized Signature', pageW - margin, signatureY + 5, { align: 'right' });
  
  doc.text('Thank You for Business. We are Looking forward to you!', pageW / 2, signatureY + 12, { align: 'center' });
  
  return doc;
};


/**
 * Generates and triggers the download of the PDF.
 * @param data The InvoiceData object.
 * @param docType The type of document.
 */
export const downloadPdf = async (data: InvoiceData, docType: DocType) => {
    try {
        const doc = await createPdfDoc(data, docType);
        
        const docPrefix = docType === 'invoice' ? 'INV' : 'QUO';
        const dateString = data.quote.date.replace(/-/g, ''); // YYYY-MM-DD -> YYYYMMDD
        
        const quoteNoParts = data.quote.no.split('-');
        const numberPart = quoteNoParts.length > 2 ? quoteNoParts[2] : '1';
        const invoiceNumber = String(parseInt(numberPart, 10)).padStart(6, '0');
        
        const customerPhone = data.customer.number.replace(/\D/g, '');

        const fileName = `${docPrefix}_${dateString}_${invoiceNumber}_${customerPhone}.pdf`;

        doc.save(fileName);
    } catch (error) {
        console.error("Error during PDF download initiation:", error);
        alert(`An unexpected error occurred during PDF generation: ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Generates the PDF and returns it as a Blob.
 * @param data The InvoiceData object.
 * @param docType The type of document.
 * @returns A promise that resolves with the PDF Blob.
 */
export const generatePdfBlob = async (data: InvoiceData, docType: DocType): Promise<Blob> => {
    const doc = await createPdfDoc(data, docType);
    return doc.output('blob');
};