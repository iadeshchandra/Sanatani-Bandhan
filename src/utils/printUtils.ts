import { Capacitor } from '@capacitor/core';
import { TreasuryTransaction, WorkspaceConfig, PoojaBooking } from '../types';

/**
 * Text centering utility for standard 32-character ESC/POS 80mm line widths
 */
const centerText = (text: string, width = 32): string => {
  const trimmed = text.trim();
  if (trimmed.length >= width) return trimmed.substring(0, width);
  const leftPadding = Math.floor((width - trimmed.length) / 2);
  const rightPadding = width - trimmed.length - leftPadding;
  return ' '.repeat(leftPadding) + trimmed + ' '.repeat(rightPadding);
};

/**
 * Formats a key-value row with left-aligned label and right-aligned value
 */
const formatKeyValue = (key: string, value: string, width = 32): string => {
  const k = key.trim();
  const v = value.trim();
  const spaceLeft = width - k.length - v.length;
  if (spaceLeft > 0) {
    return k + ' '.repeat(spaceLeft) + v;
  }
  return `${k}: ${v}`;
};

/**
 * Generates raw ESC/POS monospace text payload for thermal printers
 */
export const formatEscPosReceipt = (transaction: any, workspace: any): string => {
  const trustName = (workspace?.name || 'Sanatani Bandhan Trust').toUpperCase();
  const trustAddress = workspace?.address || workspace?.city || '';
  const dateStr = transaction?.date
    ? new Date(transaction.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN');
  const rcptNo = transaction?.taxReceiptNumber || transaction?.id || `TX-${Date.now().toString().slice(-6)}`;
  const donor = transaction?.devoteeName || transaction?.donorName || 'Sanatani Devotee';
  const purpose = transaction?.purpose || transaction?.category || 'General Mandir Seva';
  const amount = Number(transaction?.amount || 0).toFixed(2);
  const paymentMode = transaction?.paymentMode || 'Cash / Counter';

  const separator = '--------------------------------';
  const doubleSeparator = '================================';

  return [
    doubleSeparator,
    centerText(trustName),
    trustAddress ? centerText(trustAddress) : '',
    separator,
    centerText('*** DONATION RECEIPT ***'),
    separator,
    formatKeyValue('Receipt No', String(rcptNo).slice(-12)),
    formatKeyValue('Date', dateStr),
    formatKeyValue('Pay Mode', paymentMode),
    separator,
    formatKeyValue('Donor', donor.length > 18 ? donor.slice(0, 18) : donor),
    formatKeyValue('Seva/Purpose', purpose.length > 18 ? purpose.slice(0, 18) : purpose),
    separator,
    formatKeyValue('TOTAL AMOUNT', `INR ${amount}`),
    separator,
    centerText('May Sri Hari shower eternal grace.'),
    centerText('॥ धर्मो रक्षति रक्षितः ॥'),
    doubleSeparator,
    '\n\n\n', // Paper feed for manual tear-off
  ]
    .filter(Boolean)
    .join('\n');
};

/**
 * Generates raw ESC/POS monospace text payload for queue/token slips
 */
export const formatEscPosToken = (booking: any, workspace: any): string => {
  const trustName = (workspace?.name || 'Sanatani Bandhan Mandir').toUpperCase();
  const tokenNo = booking?.tokenNumber || booking?.bookingId || booking?.id || `TOK-${Date.now().toString().slice(-4)}`;
  const pujaName = booking?.poojaType || booking?.poojaName || booking?.purpose || 'Darshan & Puja Seva';
  const devoteeName = booking?.devoteeName || 'Devotee';
  const dateStr = booking?.date || booking?.tithiDate || new Date().toLocaleDateString('en-IN');
  const timeSlot = booking?.timeSlot || 'During Darshan Hours';
  const dakshina = Number(booking?.dakshinaINR || booking?.amount || booking?.dakshinaAmount || 0).toFixed(2);

  const separator = '--------------------------------';
  const doubleSeparator = '================================';

  return [
    doubleSeparator,
    centerText(trustName),
    separator,
    centerText('*** PUJA DARSHAN TOKEN ***'),
    centerText(`TOKEN: ${tokenNo}`),
    separator,
    formatKeyValue('Puja/Seva', pujaName.length > 18 ? pujaName.slice(0, 18) : pujaName),
    formatKeyValue('Devotee', devoteeName.length > 18 ? devoteeName.slice(0, 18) : devoteeName),
    formatKeyValue('Date', dateStr),
    formatKeyValue('Time Slot', timeSlot.length > 18 ? timeSlot.slice(0, 18) : timeSlot),
    dakshina !== '0.00' ? formatKeyValue('Dakshina Paid', `INR ${dakshina}`) : '',
    separator,
    centerText('Present at Sanctum Counter'),
    centerText('॥ शुभम् भवतु ॥'),
    doubleSeparator,
    '\n\n\n',
  ]
    .filter(Boolean)
    .join('\n');
};

/**
 * Web fallback: renders and prints thermal receipt inside a hidden iframe
 */
const printHtmlViaHiddenIframe = (htmlContent: string): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        resolve();
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.warn('[Thermal Print] Native print dialog error:', printErr);
        }

        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch {
            // Ignore removal errors
          }
          resolve();
        }, 1000);
      }, 300);
    } catch (e) {
      console.error('[Thermal Print] Failed to print via iframe:', e);
      resolve();
    }
  });
};

/**
 * 1. Physical ESC/POS thermal printing for donation counters
 * Hybrid support: Capacitor native Bluetooth/Serial plugin vs Web 80mm iframe fallback
 */
export const printThermalReceipt = async (
  transaction: TreasuryTransaction | any,
  workspace: WorkspaceConfig | any
): Promise<string | void> => {
  // Check if running on Android/iOS via Capacitor
  if (Capacitor.isNativePlatform()) {
    const escposPayload = formatEscPosReceipt(transaction, workspace);
    console.log('[Native Print Triggered]', escposPayload);

    // If an ESC/POS Bluetooth printer plugin is registered on window/Capacitor, dispatch safely
    try {
      const globalWindow = window as any;
      if (globalWindow.BluetoothSerial?.write) {
        globalWindow.BluetoothSerial.write(escposPayload);
      } else if (globalWindow.Capacitor?.Plugins?.Printer?.print) {
        await globalWindow.Capacitor.Plugins.Printer.print({ content: escposPayload });
      }
    } catch (pluginErr) {
      console.warn('[Native Print] Printer plugin dispatch warning:', pluginErr);
    }

    return escposPayload;
  }

  // Web Browser Fallback: 80mm thermal roll print dialog
  const trustName = workspace?.name || 'Sanatani Bandhan Trust';
  const trustAddress = [workspace?.address, workspace?.city].filter(Boolean).join(', ');
  const dateStr = transaction?.date
    ? new Date(transaction.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN');
  const rcptNo = transaction?.taxReceiptNumber || transaction?.id || `TX-${Date.now().toString().slice(-6)}`;
  const donorName = transaction?.devoteeName || transaction?.donorName || 'Sanatani Devotee';
  const purpose = transaction?.purpose || transaction?.category || 'General Mandir Seva';
  const amount = Number(transaction?.amount || 0).toFixed(2);
  const paymentMode = transaction?.paymentMode || 'Cash / Counter';
  const currencySymbol = workspace?.currencySymbol || '₹';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Thermal Receipt</title>
        <style>
          @page {
            margin: 0;
            size: 80mm auto;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            width: 76mm;
            margin: 0 auto;
            padding: 3mm 2mm;
            font-size: 13px;
            color: #000;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-xl { font-size: 16px; }
          .text-lg { font-size: 14px; }
          .text-sm { font-size: 11px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .label { font-weight: bold; }
          .val { text-align: right; max-width: 65%; word-break: break-word; }
          .amount-box {
            font-size: 16px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
          }
          .footer-space { height: 12mm; }
        </style>
      </head>
      <body>
        <div class="text-center font-bold text-xl">${trustName}</div>
        ${trustAddress ? `<div class="text-center text-sm">${trustAddress}</div>` : ''}
        <div class="divider"></div>
        <div class="text-center font-bold text-lg">DONATION RECEIPT</div>
        <div class="divider"></div>
        
        <div class="row"><span class="label">Receipt No:</span> <span class="val">${rcptNo}</span></div>
        <div class="row"><span class="label">Date:</span> <span class="val">${dateStr}</span></div>
        <div class="row"><span class="label">Payment Mode:</span> <span class="val">${paymentMode}</span></div>
        
        <div class="divider"></div>
        <div class="row"><span class="label">Donor:</span> <span class="val">${donorName}</span></div>
        <div class="row"><span class="label">Purpose:</span> <span class="val">${purpose}</span></div>
        
        <div class="divider"></div>
        <div class="amount-box">
          <span>TOTAL AMOUNT:</span>
          <span>${currencySymbol} ${amount}</span>
        </div>
        <div class="double-divider"></div>
        
        <div class="text-center text-sm" style="margin-top: 6px;">
          Thank you for your sacred seva contribution.
        </div>
        <div class="text-center font-bold text-sm" style="margin-top: 2px;">
          ॥ धर्मो रक्षति रक्षितः ॥
        </div>
        <div class="footer-space"></div>
      </body>
    </html>
  `;

  await printHtmlViaHiddenIframe(htmlContent);
};

/**
 * 2. Standard Token Slip Generator for Queue and Puja Bookings
 * Hybrid support: Capacitor native Bluetooth/Serial plugin vs Web 80mm iframe fallback
 */
export const printTokenSlip = async (
  booking: PoojaBooking | any,
  workspace: WorkspaceConfig | any
): Promise<string | void> => {
  // Native Android/iOS via Capacitor
  if (Capacitor.isNativePlatform()) {
    const escposPayload = formatEscPosToken(booking, workspace);
    console.log('[Native Print Triggered]', escposPayload);

    try {
      const globalWindow = window as any;
      if (globalWindow.BluetoothSerial?.write) {
        globalWindow.BluetoothSerial.write(escposPayload);
      } else if (globalWindow.Capacitor?.Plugins?.Printer?.print) {
        await globalWindow.Capacitor.Plugins.Printer.print({ content: escposPayload });
      }
    } catch (pluginErr) {
      console.warn('[Native Print] Printer plugin dispatch warning:', pluginErr);
    }

    return escposPayload;
  }

  // Web Browser Fallback: 80mm queue token slip
  const trustName = workspace?.name || 'Sanatani Bandhan Mandir';
  const tokenNo = booking?.tokenNumber || booking?.bookingId || booking?.id || `TOK-${Date.now().toString().slice(-4)}`;
  const pujaName = booking?.poojaType || booking?.poojaName || booking?.purpose || 'Darshan & Puja Seva';
  const devoteeName = booking?.devoteeName || 'Devotee';
  const dateStr = booking?.date || booking?.tithiDate || new Date().toLocaleDateString('en-IN');
  const timeSlot = booking?.timeSlot || 'During Darshan Hours';
  const dakshina = Number(booking?.dakshinaINR || booking?.amount || booking?.dakshinaAmount || 0);
  const currencySymbol = workspace?.currencySymbol || '₹';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Token Slip</title>
        <style>
          @page {
            margin: 0;
            size: 80mm auto;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            width: 76mm;
            margin: 0 auto;
            padding: 3mm 2mm;
            font-size: 13px;
            color: #000;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .token-banner {
            border: 2px solid #000;
            padding: 6px;
            margin: 6px 0;
            font-size: 20px;
            font-weight: bold;
            text-align: center;
          }
          .text-lg { font-size: 15px; }
          .text-sm { font-size: 11px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .label { font-weight: bold; }
          .val { text-align: right; max-width: 65%; word-break: break-word; }
          .footer-space { height: 12mm; }
        </style>
      </head>
      <body>
        <div class="text-center font-bold text-lg">${trustName}</div>
        <div class="text-center text-sm">॥ श्री शुभ सेवा दर्शन टोकन ॥</div>
        
        <div class="token-banner">TOKEN #${tokenNo}</div>
        
        <div class="divider"></div>
        <div class="row"><span class="label">Puja / Seva:</span> <span class="val font-bold">${pujaName}</span></div>
        <div class="row"><span class="label">Devotee:</span> <span class="val">${devoteeName}</span></div>
        <div class="row"><span class="label">Date:</span> <span class="val">${dateStr}</span></div>
        <div class="row"><span class="label">Timing Slot:</span> <span class="val">${timeSlot}</span></div>
        ${dakshina > 0 ? `<div class="row"><span class="label">Dakshina:</span> <span class="val font-bold">${currencySymbol} ${dakshina.toFixed(2)}</span></div>` : ''}
        
        <div class="double-divider"></div>
        <div class="text-center text-sm font-bold">
          Present this token slip at the Sanctum Sanctorum for Pushpanjali & Prasadam.
        </div>
        <div class="text-center text-sm" style="margin-top: 4px;">
          ॥ शुभम् भवतु ॥
        </div>
        <div class="footer-space"></div>
      </body>
    </html>
  `;

  await printHtmlViaHiddenIframe(htmlContent);
};
