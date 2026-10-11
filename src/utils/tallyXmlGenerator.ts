/**
 * Tally Prime XML Generator Utility (Financial Bridge)
 * Generates XML envelopes adhering to Tally Prime / Tally 9 import schema.
 */

export interface TallyTransaction {
  id: string;
  date: string;
  amount: number;
  donorName: string;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | string;
  category?: string;
  pan?: string;
  referenceNo?: string;
}

/**
 * Formats standard ISO or YYYY-MM-DD dates into Tally's YYYYMMDD format.
 */
const formatTallyDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr.replace(/[^0-9]/g, '').slice(0, 8);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  } catch {
    return '20260926';
  }
};

/**
 * Escapes XML reserved characters.
 */
const escapeXml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Generates Tally Prime compliant XML string containing Vouchers import package.
 */
export const generateTallyVoucherXml = (
  transactions: TallyTransaction[],
  companyName: string = 'Sri Sanatan Mandir Trust'
): string => {
  const safeCompany = escapeXml(companyName);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<ENVELOPE>\n';
  xml += '  <HEADER>\n';
  xml += '    <TALLYREQUEST>Import Data</TALLYREQUEST>\n';
  xml += '  </HEADER>\n';
  xml += '  <BODY>\n';
  xml += '    <IMPORTDATA>\n';
  xml += '      <REQUESTDESC>\n';
  xml += '        <REPORTNAME>Vouchers</REPORTNAME>\n';
  xml += '        <STATICVARIABLES>\n';
  xml += `          <SVCURRENTCOMPANY>${safeCompany}</SVCURRENTCOMPANY>\n`;
  xml += '        </STATICVARIABLES>\n';
  xml += '      </REQUESTDESC>\n';
  xml += '      <REQUESTDATA>\n';

  transactions.forEach((t) => {
    const tallyDate = formatTallyDate(t.date);
    const safeDonor = escapeXml(t.donorName || 'Anonymous Devotee');
    const safeMode = escapeXml(t.paymentMode || 'Cash');
    const safeCategory = escapeXml(t.category || 'General Donation (Daan)');
    const amountVal = Math.abs(Number(t.amount) || 0).toFixed(2);
    const debitLedger = safeMode.toLowerCase() === 'cash' ? 'Cash Account' : `Temple Bank Account (${safeMode})`;

    const narration = escapeXml(
      `Dharmic Chanda/Donation from ${safeDonor} via ${safeMode} - Receipt #${t.id} [${safeCategory}]${t.pan ? ` PAN: ${t.pan}` : ''}`
    );

    xml += '        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n';
    xml += '          <VOUCHER VCHTYPE="Receipt" ACTION="Create">\n';
    xml += `            <DATE>${tallyDate}</DATE>\n`;
    xml += `            <EFFECTIVEDATE>${tallyDate}</EFFECTIVEDATE>\n`;
    xml += '            <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>\n';
    xml += `            <NARRATION>${narration}</NARRATION>\n`;
    xml += `            <REFERENCE>${escapeXml(t.referenceNo || t.id)}</REFERENCE>\n`;
    xml += '            <PARTYLEDGERNAME>' + debitLedger + '</PARTYLEDGERNAME>\n';
    xml += '            <BASICBASEPARTYNAME>' + safeDonor + '</BASICBASEPARTYNAME>\n';

    // Debit Leg (Cash / Bank receives funds)
    xml += '            <ALLLEDGERENTRIES.LIST>\n';
    xml += `              <LEDGERNAME>${debitLedger}</LEDGERNAME>\n`;
    xml += '              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n';
    xml += '              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>\n';
    xml += `              <AMOUNT>-${amountVal}</AMOUNT>\n`;
    xml += '            </ALLLEDGERENTRIES.LIST>\n';

    // Credit Leg (Donation Income)
    xml += '            <ALLLEDGERENTRIES.LIST>\n';
    xml += '              <LEDGERNAME>Donation Income - General Corpus</LEDGERNAME>\n';
    xml += '              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n';
    xml += '              <ISPARTYLEDGER>No</ISPARTYLEDGER>\n';
    xml += `              <AMOUNT>${amountVal}</AMOUNT>\n`;
    xml += '            </ALLLEDGERENTRIES.LIST>\n';

    xml += '          </VOUCHER>\n';
    xml += '        </TALLYMESSAGE>\n';
  });

  xml += '      </REQUESTDATA>\n';
  xml += '    </IMPORTDATA>\n';
  xml += '  </BODY>\n';
  xml += '</ENVELOPE>';

  return xml;
};

export default generateTallyVoucherXml;
