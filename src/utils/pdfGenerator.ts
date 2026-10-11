import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
import { get } from 'idb-keyval';
import QRCode from 'qrcode';
import { generateSecureQRToken } from './qrUtils';
import { DevoteeMember, TreasuryTransaction, WorkspaceConfig, PoojaBooking } from '../types';

/**
 * Generate cryptographic doc ref: DOC REF: SB-XXXX-XXXX-XXXX
 */
export const generateCryptoDocRef = (prefix = 'SB'): string => {
  const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DOC REF: ${prefix}-${segment()}-${segment()}-${segment()}`;
};

/**
 * Resolve active workspace logo safely with format inspection
 */
export const getActiveWorkspaceLogo = async (workspaceId: string): Promise<string | null> => {
  try {
    const customLogo = await get(`sb_logo_${workspaceId}`);
    if (customLogo && customLogo.startsWith('data:image/')) {
      return customLogo;
    }
  } catch (e) {
    console.warn('Could not read custom workspace logo', e);
  }
  return null;
};

/**
 * Safely fetches an image from URL and converts to base64 for jsPDF
 */
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  if (url.startsWith('data:image/')) return url;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Helper to inspect Base64 image format safely for jsPDF
 */
const getImageFormat = (base64String: string): 'JPEG' | 'PNG' | 'WEBP' => {
  if (base64String.includes('image/png')) return 'PNG';
  if (base64String.includes('image/webp')) return 'WEBP';
  return 'JPEG';
};

/**
 * Helper to convert numerical amounts into English words (Indian numbering system)
 * Formats: Crores, Lakhs, Thousands, Hundreds, and Paise
 */
export const numberToWords = (num: number): string => {
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const whole = Math.floor(num);

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const convertLessThanOneThousand = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  };

  let remainder = whole;
  let words = '';

  const crore = Math.floor(remainder / 10000000);
  remainder %= 10000000;
  if (crore > 0) {
    words += convertLessThanOneThousand(crore) + ' Crore ';
  }

  const lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  if (lakh > 0) {
    words += convertLessThanOneThousand(lakh) + ' Lakh ';
  }

  const thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  if (thousand > 0) {
    words += convertLessThanOneThousand(thousand) + ' Thousand ';
  }

  if (remainder > 0) {
    words += convertLessThanOneThousand(remainder) + ' ';
  }

  const paise = Math.round((num - whole) * 100);
  let paiseStr = '';
  if (paise > 0) {
    paiseStr = ` and ${convertLessThanOneThousand(paise)} Paise`;
  }

  return `${words.trim()} Rupees${paiseStr} Only`;
};

/**
 * 1. Smart Devotee / Member Card PDF
 */
export const generateDevoteeCardPDF = async (
  member: DevoteeMember,
  workspace: WorkspaceConfig,
  mode: 'save' | 'bloburl' = 'save'
): Promise<string | void> => {
  // CR80 Standard ID Card vertical (54 mm x 86 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [54, 86],
  });

  const qrData = generateSecureQRToken(member);

  const qrDataUrl = await QRCode.toDataURL(qrData, {
    margin: 0,
    width: 200,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  // Base background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 54, 86, 'F');

  // Top Accent Banner (Deep Amber/Saffron)
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 0, 54, 15, 'F');

  // Secondary thin gold line
  doc.setFillColor(251, 191, 36);
  doc.rect(0, 15, 54, 1.5, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(workspace.name.toUpperCase().substring(0, 30), 27, 7, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text('OFFICIAL IDENTITY CARD', 27, 11, { align: 'center' });

  // Photo Box
  const photoY = 21;
  const photoSize = 22;
  const photoX = (54 - photoSize) / 2;

  let drawn = false;
  if (member.avatarUrl) {
    try {
      const b64 = await fetchImageAsBase64(member.avatarUrl);
      if (b64) {
        const fmt = getImageFormat(b64);
        doc.addImage(b64, fmt, photoX, photoY, photoSize, photoSize);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(photoX, photoY, photoSize, photoSize);
        drawn = true;
      }
    } catch (e) {
      console.warn('Failed to load avatar for PDF', e);
    }
  }

  if (!drawn) {
    doc.setFillColor(243, 244, 246);
    doc.rect(photoX, photoY, photoSize, photoSize, 'F');
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.rect(photoX, photoY, photoSize, photoSize);

    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const initial = member.fullName.charAt(0).toUpperCase();
    doc.text(initial, 27, photoY + 14, { align: 'center' });
  }

  // Name & Identity
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(member.fullName.substring(0, 25), 27, 49, { align: 'center' });

  if (member.spiritualName) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(217, 119, 6);
    doc.text(`"${member.spiritualName}"`, 27, 52.5, { align: 'center' });
  }

  // Metadata Details Box
  const startY = member.spiritualName ? 55 : 53;

  doc.setFillColor(249, 250, 251);
  doc.rect(4, startY, 46, 13, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.rect(4, startY, 46, 13);

  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);

  // Row 1
  doc.text('ID NUMBER:', 6, startY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(member.id.substring(0, 15).toUpperCase(), 20, startY + 4);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('PHONE:', 6, startY + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(member.phone || 'N/A', 20, startY + 7.5);

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.text('BLOOD GRP:', 6, startY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(member.bloodGroup || 'N/A', 20, startY + 11);

  // QR Code
  doc.addImage(qrDataUrl, 'PNG', 4, 70, 13, 13);

  // Footer / Auth
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);
  doc.text('Scan for Verification', 10.5, 85, { align: 'center' });

  // Signature Line
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.2);
  doc.line(30, 80, 50, 80);
  doc.text('Authorized Signature', 40, 83, { align: 'center' });

  // Security strip at bottom
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 85, 54, 1, 'F');

  if (mode === 'bloburl') {
    return String(doc.output('bloburl'));
  } else {
    doc.save(`${member.fullName.replace(/\s+/g, '_')}_ID_Card.pdf`);
  }
};

/**
 * 2. Statutory 80G Tax Exemption Certificate Generator
 * Legally compliant with Section 80G(5)(vi) and Form 10BE filing rules.
 */
export const generate80GTaxReceipt = async (
  transaction: any,
  workspace: any,
  options?: {
    download?: boolean;
    returnType?: 'save' | 'blob' | 'bloburl' | 'doc';
    isCopy?: boolean;
  }
): Promise<jsPDF | string | Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const docRef = generateCryptoDocRef('80G');

  // Statutory Trust Profile Extraction
  const trustName = workspace?.name || 'Sanatani Bandhan Dharmik Trust';
  const trustRegNumber = workspace?.trustRegNumber || workspace?.registrationNumber || 'TRUST/VEDIC/2024/001';
  const exemption80GNumber = workspace?.taxExemptionNumber || workspace?.pan80GNumber || 'CIT(E)/80G/SB-2024-998';
  const trustPan = workspace?.panNumber || workspace?.trustPan || workspace?.taxPan || 'AAATS1234F';

  const addressComponents = [
    workspace?.address,
    workspace?.city,
    workspace?.state,
    workspace?.pincode,
    workspace?.country,
  ].filter(Boolean);
  const trustAddress = addressComponents.length > 0
    ? addressComponents.join(', ')
    : 'Near Sanctum Sanctorum, Kashi Vishwanath Complex, Varanasi, UP, 221001, India';

  // Transaction & Donor Details Extraction
  const donorName = transaction?.devoteeName || transaction?.donorName || 'Sanatani Devotee';
  const donorPan = transaction?.devoteePan || transaction?.donorPan || transaction?.pan || 'N/A (Required for Form 10BE)';
  const amount = Number(transaction?.amount || 0);
  const amountInWords = numberToWords(amount);
  const dateOfReceipt = transaction?.date || new Date().toISOString().split('T')[0];
  const receiptNo = transaction?.taxReceiptNumber || transaction?.receiptNo || `SB-80G-${String(transaction?.id || Date.now()).slice(-8).toUpperCase()}`;
  const paymentMode = transaction?.paymentMode || 'UPI / Digital';
  const referenceNo = transaction?.referenceNo || transaction?.utr || `TXN-${String(transaction?.id || '').slice(-8).toUpperCase()}`;
  const purpose = transaction?.purpose || transaction?.category || 'General Dharmic & Humanitarian Seva';

  // QR Code Payload for Instant Digital Verification
  const qrPayload = JSON.stringify({
    receiptNo,
    date: dateOfReceipt,
    amount,
    donor: donorName,
    donorPan,
    trustPan,
    exemption80G: exemption80GNumber,
    docRef,
  });

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 200 });
  } catch (err) {
    console.warn('QR Code generation failed for 80G receipt', err);
  }

  // Watermark if Copy
  if (options?.isCopy) {
    doc.setTextColor(240, 240, 240);
    doc.setFontSize(75);
    doc.setFont('helvetica', 'bold');
    doc.text('DUPLICATE COPY', 105, 150, { align: 'center', angle: -45 });
  }

  // Outer Decorative Double Border
  doc.setDrawColor(180, 83, 9); // Amber 700
  doc.setLineWidth(0.8);
  doc.rect(10, 10, 190, 277);

  doc.setDrawColor(245, 158, 11); // Amber 500
  doc.setLineWidth(0.3);
  doc.rect(11.5, 11.5, 187, 274);

  // Header Banner Background
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.rect(12, 12, 186, 36, 'F');

  // Trust Logo (if available)
  if (workspace?.logoUrl) {
    try {
      doc.addImage(workspace.logoUrl, 'PNG', 16, 16, 26, 26);
    } catch {
      // Fallback cleanly
    }
  }

  // Header Titles
  doc.setTextColor(146, 64, 14); // Amber 800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(trustName.toUpperCase(), 105, 22, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(doc.splitTextToSize(trustAddress, 150), 105, 28, { align: 'center' });

  // Statutory Trust Identifiers Subheader
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  const trustMetadataLine = `PAN: ${trustPan}   |   Trust Reg. No: ${trustRegNumber}   |   80G Exemption No: ${exemption80GNumber}`;
  doc.text(trustMetadataLine, 105, 42, { align: 'center' });

  // Certificate Title Bar
  doc.setFillColor(180, 83, 9); // Primary Amber 700
  doc.rect(12, 49, 186, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('STATUTORY DONATION RECEIPT & 80G TAX EXEMPTION CERTIFICATE', 105, 55.5, { align: 'center' });

  // Receipt Meta Grid
  doc.setFillColor(249, 250, 251);
  doc.rect(15, 63, 180, 16, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.rect(15, 63, 180, 16);

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Receipt Serial No:', 20, 69);
  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.text(receiptNo, 55, 69);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Date of Receipt:', 120, 69);
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.text(dateOfReceipt, 150, 69);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Payment Mode:', 20, 75);
  doc.setTextColor(17, 24, 39);
  doc.text(paymentMode, 55, 75);

  doc.setTextColor(107, 114, 128);
  doc.text('Ref / UTR No:', 120, 75);
  doc.setTextColor(17, 24, 39);
  doc.text(referenceNo, 150, 75);

  // Donor Details Table Box (Crucial for Form 10BE compliance)
  doc.setDrawColor(209, 213, 219);
  doc.setFillColor(255, 255, 255);
  doc.rect(15, 83, 180, 48, 'FD');

  doc.setFillColor(243, 244, 246);
  doc.rect(15, 83, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.text('DONOR DETAILS & FORM 10BE COMPLIANCE PARTICULARS', 20, 88.5);

  // Row 1: Donor Name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Donor Name:', 20, 98);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(donorName, 60, 98);

  // Row 2: Donor PAN (Bold & Flagged for IT compliance)
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Donor PAN / ID:', 20, 106);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(donorPan, 60, 106);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('(Mandatory for claiming rebate under Section 80G in Form 10BD/10BE)', 105, 106);

  // Row 3: Seva / Purpose
  doc.setFontSize(9);
  doc.text('Seva / Purpose:', 20, 114);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(purpose, 60, 114);

  // Row 4: Custody Handled By
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Handled By:', 20, 122);
  doc.setTextColor(17, 24, 39);
  doc.text(transaction?.handledBy || 'Mandir Treasury Desk', 60, 122);

  // Highlighted Donation Amount Box
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.rect(15, 135, 180, 26, 'FD');

  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Donation Amount: ${workspace?.currencySymbol || '₹'} ${amount.toLocaleString('en-IN')}/-`, 20, 144);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text(`Amount in Words: `, 20, 153);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(146, 64, 14);
  doc.text(amountInWords, 55, 153);

  // Mandatory Statutory Declarations
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(255, 255, 255);
  doc.rect(15, 166, 180, 42, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(180, 83, 9);
  doc.text('STATUTORY EXEMPTION DECLARATION', 20, 173);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text('"This donation is eligible for deduction under Section 80G(5)(vi) of the Income Tax Act, 1961."', 20, 180);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  const declarationBody =
    '1. We gratefully acknowledge this sacred contribution received for our religious, charitable, educational, and public welfare activities.\n' +
    `2. In accordance with CBDT Notification and Section 80G(5) rules, this transaction will be reported in the annual Statement of Donations in Form 10BD, and certificate Form 10BE will be generated using the Donor PAN specified above.\n` +
    '3. This receipt is digitally generated, cryptographically signed, and tamper-evident.';
  doc.text(doc.splitTextToSize(declarationBody, 170), 20, 187);

  // QR Code & Verification Block
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 20, 214, 35, 35);
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text('Scan for digital validation', 20, 252);
  }

  // Signatory & Seal Section
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.3);
  doc.line(130, 240, 185, 240);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text('Authorized Signatory / Managing Trustee', 130, 245);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`For ${trustName}`, 130, 250);
  doc.text('Audit & Finance Sub-Committee', 130, 254);

  // Footer Metadata
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text(docRef, 105, 268, { align: 'center' });
  doc.text(
    'Sanatani Bandhan • Universal Mandir Management Platform • Form 10BE Compliant',
    105,
    273,
    { align: 'center' }
  );

  // Delivery handling
  if (options?.returnType === 'blob') {
    return doc.output('blob');
  } else if (options?.returnType === 'bloburl') {
    return String(doc.output('bloburl'));
  }

  if (options?.download !== false) {
    doc.save(`80G_Receipt_${receiptNo}.pdf`);
  }

  return doc;
};

/**
 * 3. Standard Token / Counter Slip Generator
 * Designed for quick A5 / A4 print at Mandir counters, focusing on
 * Seva/Puja booked, date, and amount paid.
 */
export const generateCounterSlip = async (
  transaction: any,
  workspace: any,
  options?: { download?: boolean; returnType?: 'save' | 'blob' | 'bloburl' | 'doc' }
): Promise<jsPDF | string | Blob> => {
  // A5 format portrait (148mm x 210mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const trustName = workspace?.name || 'Sanatani Bandhan Mandir Trust';
  const tokenNo = transaction?.tokenNumber || transaction?.receiptNo || `TOK-${String(transaction?.id || Date.now()).slice(-6).toUpperCase()}`;
  const devoteeName = transaction?.devoteeName || transaction?.donorName || 'Sanatani Devotee';
  const sevaName = transaction?.sevaName || transaction?.poojaType || transaction?.purpose || transaction?.category || 'Darshan & Puja Seva';
  const amount = Number(transaction?.amount || transaction?.dakshinaAmount || 0);
  const dateStr = transaction?.date || transaction?.tithiDate || new Date().toISOString().split('T')[0];
  const timeSlot = transaction?.timeSlot || 'During Temple Darshan Hours';
  const paymentMode = transaction?.paymentMode || 'Cash / Counter';
  const handledBy = transaction?.handledBy || transaction?.assignedPurohit || 'Counter Sevadar';

  const qrData = JSON.stringify({
    tokenNo,
    devotee: devoteeName,
    seva: sevaName,
    amount,
    date: dateStr,
  });

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 160 });
  } catch (err) {
    console.warn('QR Code generation failed for counter slip', err);
  }

  // Border & Header
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.6);
  doc.rect(7, 7, 134, 196);

  // Top Saffron Banner
  doc.setFillColor(180, 83, 9);
  doc.rect(8, 8, 132, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(trustName.toUpperCase().substring(0, 36), 74, 16, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('॥ श्री शुभ सेवा रसीद एवं दर्शन टोकन ॥', 74, 23, { align: 'center' });

  // Token Meta Row
  doc.setFillColor(254, 243, 199);
  doc.rect(12, 34, 124, 13, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.rect(12, 34, 124, 13);

  doc.setFontSize(8.5);
  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOKEN NO: ${tokenNo}`, 16, 42);

  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${dateStr}`, 90, 42);

  // Devotee & Booking Details Box
  doc.setFillColor(249, 250, 251);
  doc.rect(12, 51, 124, 60, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.rect(12, 51, 124, 60);

  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Yajamana / Devotee:', 16, 60);
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.text(devoteeName, 55, 60);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Seva / Puja Booked:', 16, 70);
  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.text(sevaName, 55, 70);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Timing Slot:', 16, 80);
  doc.setTextColor(17, 24, 39);
  doc.text(timeSlot, 55, 80);

  doc.setTextColor(107, 114, 128);
  doc.text('Payment Mode:', 16, 90);
  doc.setTextColor(17, 24, 39);
  doc.text(paymentMode, 55, 90);

  doc.setTextColor(107, 114, 128);
  doc.text('Counter Sevadar:', 16, 100);
  doc.setTextColor(17, 24, 39);
  doc.text(handledBy, 55, 100);

  // Amount Highlight Box
  doc.setFillColor(254, 243, 199);
  doc.rect(12, 115, 124, 18, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.rect(12, 115, 124, 18);

  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Amount Paid: ${workspace?.currencySymbol || '₹'} ${amount.toLocaleString('en-IN')}/-`, 74, 126, { align: 'center' });

  // QR Code
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 56, 137, 36, 36);
  }

  // Footer Instructions
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text('Present this slip at Sanctum Counter for Pushpanjali & Prasadam.', 74, 178, { align: 'center' });
  doc.text('॥ धर्मो रक्षति रक्षितः ॥', 74, 184, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(156, 163, 175);
  doc.text('This is a counter slip. For statutory 80G tax receipt, please consult the Temple Office.', 74, 193, { align: 'center' });

  if (options?.returnType === 'blob') {
    return doc.output('blob');
  } else if (options?.returnType === 'bloburl') {
    return String(doc.output('bloburl'));
  }

  if (options?.download !== false) {
    doc.save(`CounterSlip_${tokenNo}.pdf`);
  }

  return doc;
};

/**
 * 4. Section 80G Bulk Tax Exemption Receipts
 */
export const generateBulkTaxReceiptsPDF = async (
  txs: TreasuryTransaction[],
  workspace: WorkspaceConfig
): Promise<void> => {
  if (txs.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    if (i > 0) doc.addPage();

    // Use statutory 80G page layout
    const singleDoc = (await generate80GTaxReceipt(tx, workspace, { download: false })) as jsPDF;
    // Copy content or generate inline
    const docRef = generateCryptoDocRef('TAX80G');
    const qrData = JSON.stringify({
      txId: tx.id,
      receiptNo: tx.taxReceiptNumber || `SB-TAX-${String(tx.id || '').slice(-6)}`,
      amount: tx.amount,
      date: tx.date,
      donor: tx.devoteeName,
      taxReg: workspace.taxExemptionNumber,
    });

    const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 180 });

    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    doc.setFillColor(254, 243, 199);
    doc.rect(11, 11, 188, 32, 'F');

    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(workspace.name, 105, 22, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(workspace.address + ', ' + workspace.city + ', ' + workspace.country, 105, 28, { align: 'center' });
    doc.text(`Trust Reg: ${workspace.trustRegNumber || 'TRUST/VEDIC/2024'} | 80G Exemption: ${workspace.taxExemptionNumber || 'CIT(E)/80G/SB-998'}`, 105, 34, { align: 'center' });

    doc.setFillColor(180, 83, 9);
    doc.rect(11, 44, 188, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('OFFICIAL DONATION & TAX EXEMPTION RECEIPT (SECTION 80G)', 105, 51, { align: 'center' });

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Receipt No: ${tx.taxReceiptNumber || 'TX-80G-' + tx.id}`, 20, 65);
    doc.text(`Date of Issue: ${tx.date}`, 140, 65);

    doc.text(`Payment Mode: ${tx.paymentMode}`, 20, 72);
    doc.text(`Ref/UTR No: ${tx.referenceNo || 'UPI-' + String(tx.id || '').slice(-8)}`, 140, 72);

    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    doc.rect(20, 80, 170, 45, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('Donor Name:', 25, 90);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(tx.devoteeName || 'Generous Sanatan Bhakta', 65, 90);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Seva / Purpose:', 25, 100);
    doc.setTextColor(17, 24, 39);
    doc.text(`${tx.category} - ${tx.purpose}`, 65, 100);

    doc.setTextColor(107, 114, 128);
    doc.text('Custody Handled By:', 25, 110);
    doc.setTextColor(17, 24, 39);
    doc.text(tx.handledBy || 'Treasury Sevadar', 65, 110);

    doc.setFillColor(254, 243, 199);
    doc.rect(20, 132, 170, 25, 'FD');
    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Total Amount Received: ${workspace.currencySymbol || '₹'} ${tx.amount.toLocaleString()}`, 25, 147);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    const legalNote = `This donation is eligible for deduction under Section 80G(5)(vi) of the Income Tax Act, 1961. We gratefully acknowledge this sacred contribution towards our Dharmic, educational, and charitable humanitarian activities.`;
    doc.text(doc.splitTextToSize(legalNote, 170), 20, 168);

    doc.addImage(qrDataUrl, 'PNG', 25, 195, 38, 38);
    doc.setFontSize(7);
    doc.text('Scan to verify digital audit stamp', 25, 238);

    doc.line(130, 225, 180, 225);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.text('Authorized Signatory', 135, 231);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`For ${workspace.name}`, 135, 236);

    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(docRef, 105, 268, { align: 'center' });
  }

  doc.save(`Bulk_80G_Receipts_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * 5. Single Tax Receipt PDF (Backward-compatible gateway to generate80GTaxReceipt)
 */
export const generateTaxReceiptPDF = async (
  tx: TreasuryTransaction,
  workspace: WorkspaceConfig,
  returnType: 'save' | 'blob' | 'bloburl' = 'save',
  isCopy: boolean = false,
  devoteePan: string = ''
): Promise<void | Blob | string> => {
  const enhancedTx = {
    ...tx,
    devoteePan: devoteePan || (tx as any).devoteePan || (tx as any).donorPan || 'N/A',
  };

  const result = await generate80GTaxReceipt(enhancedTx, workspace, {
    download: returnType === 'save',
    returnType,
    isCopy,
  });

  if (returnType === 'blob') {
    return result as Blob;
  } else if (returnType === 'bloburl') {
    return String(result);
  }
};

/**
 * 6. Sacred Sankalp & Pooja Booking Receipt
 */
export const generatePoojaSankalpPDF = async (
  booking: PoojaBooking,
  workspace: WorkspaceConfig
): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const docRef = generateCryptoDocRef('SANKALP');
  const qrData = JSON.stringify({
    bookingId: booking.id,
    pooja: booking.poojaName,
    devotee: booking.devoteeName,
    gotra: booking.gotra,
    tithi: booking.tithiDate,
  });

  const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 160 });

  doc.setFillColor(254, 243, 199);
  doc.rect(0, 0, 148, 210, 'F');

  doc.setFillColor(180, 83, 9);
  doc.rect(0, 0, 148, 22, 'F');

  if (workspace.logoUrl) {
    try {
      doc.addImage(workspace.logoUrl, 'PNG', 5, 4, 14, 14);
    } catch {
      // Fallback
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('॥ श्री शुभ संकल्प पत्रम् ॥', 74, 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text(workspace.name, 74, 16, { align: 'center' });

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(12);
  doc.text(booking.poojaName, 74, 34, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tithi / Date: ${booking.tithiDate} (${booking.timeSlot})`, 74, 40, { align: 'center' });

  // Details box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 46, 124, 60, 2, 2, 'F');

  doc.setTextColor(107, 114, 128);
  doc.text('Yajamana / Devotee:', 18, 56);
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.text(booking.devoteeName, 60, 56);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Gotra & Nakshatra:', 18, 66);
  doc.setTextColor(17, 24, 39);
  doc.text(`${booking.gotra} ${booking.nakshatra ? `| ${booking.nakshatra}` : ''}`, 60, 66);

  doc.setTextColor(107, 114, 128);
  doc.text('Assigned Purohit:', 18, 76);
  doc.setTextColor(17, 24, 39);
  doc.text(booking.purohitAssigned || 'Mandir Chief Priest', 60, 76);

  doc.setTextColor(107, 114, 128);
  doc.text('Dakshina Seva:', 18, 86);
  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.text(`${workspace.currencySymbol || '₹'} ${booking.dakshinaAmount} (${booking.paymentStatus})`, 60, 86);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Sankalp Prayer:', 18, 96);
  doc.setTextColor(17, 24, 39);
  doc.text(doc.splitTextToSize(booking.sankalpDescription, 68), 60, 96);

  // QR and footer
  doc.addImage(qrDataUrl, 'PNG', 54, 115, 40, 40);

  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('Present this slip at Mandir sanctum sanctorum for Pushpanjali', 74, 165, { align: 'center' });
  doc.text(docRef, 74, 195, { align: 'center' });
  doc.text('Made with ❤️ by TrackIQ Academy • Universal Community Management', 74, 200, { align: 'center' });

  doc.save(`Sankalp_${booking.id}.pdf`);
};

/**
 * 7. Devotee Donation History Statement
 */
export const generateDonationHistoryPDF = async (
  devotee: DevoteeMember,
  donations: TreasuryTransaction[],
  workspace: WorkspaceConfig
) => {
  const doc = new jsPDF();
  const logo = await getActiveWorkspaceLogo(workspace.id);

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, 10, 20, 20);
    } catch {
      // Fallback
    }
  }

  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text(workspace.name || 'Sanatani Bandhan', logo ? 40 : 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Donation History Statement', logo ? 40 : 14, 26);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Devotee Name: ${devotee.fullName}`, 14, 45);
  doc.text(`Devotee ID: ${devotee.id}`, 14, 52);
  if (devotee.phone) doc.text(`Phone: ${devotee.phone}`, 14, 59);
  if (devotee.gotra) doc.text(`Gotra: ${devotee.gotra}`, 14, 66);

  const total = donations.reduce((sum, d) => sum + d.amount, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Donations: Rs. ${total.toLocaleString()}`, 14, 76);

  autoTable(doc, {
    startY: 85,
    head: [['Date', 'Receipt No.', 'Category', 'Mode', 'Amount']],
    body: donations.map((d) => [
      new Date(d.date).toLocaleDateString(),
      d.id,
      d.category || 'General',
      d.paymentMode || 'Cash',
      `Rs. ${d.amount.toLocaleString()}`,
    ]),
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [44, 62, 80], textColor: 255 },
  });

  doc.save(`${devotee.fullName.replace(/\s+/g, '_')}_Donation_History.pdf`);
};

/**
 * 8. Annual Donation Summary PDF
 */
export const generateAnnualDonationSummaryPDF = async (
  devotee: DevoteeMember,
  donations: TreasuryTransaction[],
  workspace: WorkspaceConfig
) => {
  const doc = new jsPDF();
  const logo = await getActiveWorkspaceLogo(workspace.id);

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, 10, 20, 20);
    } catch {
      // Fallback
    }
  }

  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text(workspace.name || 'Sanatani Bandhan', logo ? 40 : 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Annual Donation Summary (Printable Overview)', logo ? 40 : 14, 26);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Devotee Name: ${devotee.fullName}`, 14, 45);
  doc.text(`Devotee ID: ${devotee.id}`, 14, 52);
  if (devotee.phone) doc.text(`Phone: ${devotee.phone}`, 14, 59);
  if (devotee.gotra) doc.text(`Gotra: ${devotee.gotra}`, 14, 66);

  const donationsByYear: Record<string, { count: number; total: number }> = {};
  donations.forEach((d) => {
    const year = new Date(d.date).getFullYear().toString();
    if (!donationsByYear[year]) {
      donationsByYear[year] = { count: 0, total: 0 };
    }
    donationsByYear[year].count += 1;
    donationsByYear[year].total += d.amount;
  });

  const years = Object.keys(donationsByYear).sort((a, b) => parseInt(b) - parseInt(a));
  const totalLifetime = donations.reduce((sum, d) => sum + d.amount, 0);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Lifetime Contribution: Rs. ${totalLifetime.toLocaleString()}`, 14, 76);

  autoTable(doc, {
    startY: 85,
    head: [['Financial Year', 'Total Receipts', 'Annual Contribution (Rs.)']],
    body: years.map((year) => [
      year,
      donationsByYear[year].count.toString(),
      `Rs. ${donationsByYear[year].total.toLocaleString()}`,
    ]),
    theme: 'striped',
    styles: { fontSize: 11, cellPadding: 5 },
    headStyles: { fillColor: [44, 62, 80], textColor: 255 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      2: { fontStyle: 'bold', halign: 'right' },
      1: { halign: 'center' },
    },
  });

  doc.autoPrint();
  window.open(String(doc.output('bloburl')), '_blank');
};

/**
 * 9. Treasury & Ledger Statement PDF
 */
export const generateTreasuryLedgerPDF = async (
  transactions: TreasuryTransaction[],
  workspace: WorkspaceConfig,
  reportTitle: string = 'Treasury & Expense Ledger Statement'
) => {
  const doc = new jsPDF();
  const logo = await getActiveWorkspaceLogo(workspace.id);
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, 10, 20, 20);
    } catch {
      // Fallback
    }
  }

  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text(workspace.name || 'Sanatani Bandhan', logo ? 40 : 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(reportTitle, logo ? 40 : 14, 26);

  const totalIncome = transactions.filter((t: any) => t.type === 'Income').reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t: any) => t.type === 'Expense').reduce((sum: number, t: any) => sum + t.amount, 0);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 45);
  doc.text(`Total Income: Rs. ${totalIncome.toLocaleString()}`, 14, 52);
  doc.text(`Total Expense: Rs. ${totalExpense.toLocaleString()}`, 14, 59);
  doc.text(`Net Balance: Rs. ${(totalIncome - totalExpense).toLocaleString()}`, 14, 66);

  autoTable(doc, {
    startY: 75,
    head: [['Date', 'Ref ID', 'Type', 'Category', 'Mode', 'Entity/Payee', 'Amount']],
    body: transactions.map((t: any) => [
      new Date(t.date).toLocaleDateString(),
      t.id,
      t.type,
      t.category,
      t.paymentMode,
      t.devoteeName || t.vendorName || '',
      `Rs. ${t.amount.toLocaleString()}`,
    ]),
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [44, 62, 80], textColor: 255 },
  });

  doc.save(`Treasury_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * 10. Community Poll / Resolution Report PDF
 */
export const generatePollReportPdf = (
  workspaceName: string,
  poll: any,
  devotees: DevoteeMember[] = []
) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(180, 83, 9);
  doc.text(workspaceName || 'Sanatani Bandhan', 14, 20);

  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55);
  doc.text(`Community Panchayat Resolution: ${poll?.title || 'Poll Report'}`, 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Category: ${poll?.category || 'Governance'} | Status: ${poll?.status || 'Active'}`, 14, 38);

  const voters = (poll?.votes || []).map((v: any) => {
    const devotee = devotees.find((d) => d.id === v.devoteeId);
    return [
      devotee?.fullName || v.devoteeName || v.devoteeId,
      v.choice || (v.inFavor ? 'In Favor' : 'Against'),
      v.timestamp ? new Date(v.timestamp).toLocaleDateString() : 'N/A',
    ];
  });

  autoTable(doc, {
    startY: 45,
    head: [['Devotee Member', 'Vote Cast', 'Timestamp']],
    body: voters.length > 0 ? voters : [['No recorded votes', '-', '-']],
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [180, 83, 9], textColor: 255 },
  });

  doc.save(`Resolution_${poll?.id || 'Report'}.pdf`);
};
