/**
 * tirtha/yatraExport.ts — keepsake PDF for a yatra.
 * =====================================================================
 * Lazy-loads pdfmake ONLY when the devotee taps "Keepsake PDF" — the
 * library never enters the initial bundle. A beautiful, printable
 * memory of the pilgrimage: cover, visits in chronological order,
 * reflections, and a closing blessing.
 */
import { getVisitsForYatra } from './tirthaStore';
import type { Yatra } from './types';

function fmtDate(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    const locale = lang === 'bn' ? 'bn-BD' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

const BLESSINGS: Record<string, string> = {
  en: 'May every step of this yatra live in your heart forever. 🙏',
  hi: 'इस यात्रा का हर कदम आपके हृदय में सदा बसा रहे। 🙏',
  bn: 'এই যাত্রার প্রতিটি পদক্ষেপ আপনার হৃদয়ে চিরকাল বেঁচে থাকুক। 🙏',
};

const TITLES: Record<string, string> = {
  en: 'Tirtha Diary — a keepsake',
  hi: 'तीर्थ डायरी — एक स्मृति',
  bn: 'তীর্থ ডায়েরি — একটি স্মৃতি',
};

export async function exportYatraPdf(uid: string, yatra: Yatra, lang: string): Promise<void> {
  const l = lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';
  const visits = getVisitsForYatra(uid, yatra.id).sort((a, b) =>
    a.visitedAt < b.visitedAt ? -1 : 1
  );

  // Lazy: pdfmake downloads only on this explicit tap.
  const { ensurePdfFonts } = await import('../utils/pdfSanatani');
  await ensurePdfFonts();
  const pdfMake: any = (await import('pdfmake/build/pdfmake')).default;

  const content: any[] = [
    { text: '🪔', fontSize: 48, alignment: 'center', margin: [0, 40, 0, 8] },
    { text: yatra.name, fontSize: 28, bold: true, alignment: 'center', color: '#92400e', margin: [0, 0, 0, 4] },
    { text: TITLES[l], fontSize: 12, italics: true, alignment: 'center', color: '#78716c', margin: [0, 0, 0, 24] },
  ];

  if (yatra.reflection) {
    content.push({
      text: `"${yatra.reflection}"`,
      fontSize: 12,
      italics: true,
      alignment: 'center',
      color: '#57534e',
      margin: [24, 0, 24, 24],
    });
  }

  content.push({ canvas: [{ type: 'line', x1: 60, y1: 0, x2: 455, y2: 0, lineWidth: 1, lineColor: '#fcd34d' }], margin: [0, 0, 0, 20] });

  for (const v of visits) {
    content.push(
      { text: `🛕 ${v.templeName}`, fontSize: 15, bold: true, color: '#44403c', margin: [0, 12, 0, 2] },
      { text: fmtDate(v.visitedAt, l), fontSize: 10, color: '#a8a29e', margin: [0, 0, 0, 4] },
    );
    if (v.note) {
      content.push({ text: `"${v.note}"`, fontSize: 11, italics: true, color: '#57534e', margin: [0, 0, 0, 6] });
    }
  }

  content.push(
    { text: '', margin: [0, 24, 0, 0] },
    { canvas: [{ type: 'line', x1: 60, y1: 0, x2: 455, y2: 0, lineWidth: 1, lineColor: '#fcd34d' }], margin: [0, 0, 0, 16] },
    { text: BLESSINGS[l], fontSize: 12, italics: true, alignment: 'center', color: '#92400e' },
    {
      text: l === 'bn' ? '॥ তমসো মা জ্যোতির্গময় ॥' : l === 'hi' ? '॥ तमसो मा ज्योतिर्गमय ॥' : '॥ tamaso mā jyotirgamaya ॥',
      fontSize: 11,
      alignment: 'center',
      color: '#a8a29e',
      margin: [0, 12, 0, 0],
    },
  );

  const safeName = yatra.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'yatra';
  await new Promise<void>((resolve, reject) => {
    try {
      const pdf = pdfMake.createPdf({
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content,
        defaultStyle: { font: 'Roboto' },
      });
      pdf.download(`${safeName}_keepsake.pdf`);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}
