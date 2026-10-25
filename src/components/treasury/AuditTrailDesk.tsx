import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { CashCustodyProvider, useCashCustody, verifyChain } from '../../cashcustody/cashCustodyStore';
import { ChainTab } from '../../cashcustody/ChainTab';
import type { CustodyEvent } from '../../cashcustody/types';
import {
  AuditEntry,
  buildAuditEntries,
  applyTrailFilters,
  extractCategories,
  extractActors,
  findProvenance,
  provenanceHash,
  buildTransparencySnapshot,
  formatLakhCrore,
  formatINRFull,
  formatTrailDate,
  shortHash,
  trailToCSV,
  fingerprintEntries,
  downloadTextFile,
} from '../../lib/auditTrail';
import { resolveWorkspaceCurrency } from '../../lib/treasuryDisplay';
import { useWorkspaceCurrency } from '../../hooks/useWorkspaceInr';
import { TransparencyView } from './TransparencyView';
import { MalaThread } from '../common/MalaThread';
import {
  SANATANI_COLORS,
  SANATANI_FONTS,
  sacredHeader,
  sacredFooter,
  sectionTitle,
  invocationFor,
  blessingFor,
} from '../../utils/sanataniTheme';
import { generateCryptoDocRef, pdfEngineHandles } from '../../utils/pdfSanatani';

/* ------------------------------------------------------------------ */
/* Pillar 4 — Audit Trail desk.                                        */
/*                                                                     */
/* The 10-second test: donor asks "where did my money go?" → trustee   */
/* opens this and shows a beautiful, verifiable trail.                 */
/*                                                                     */
/* RBAC: the raw money trail is trustee/accountant-only — enforced     */
/* here with checkPermission (sidebar gating is the outer layer).      */
/* The Transparency tab renders ONLY the leak-proof aggregate          */
/* snapshot; devotees never see raw entries.                           */
/*                                                                     */
/* OFFLINE: custody chain lives in per-workspace localStorage; the     */
/* treasury list falls back to the on-device cache. Chain verification */
/* needs no network.                                                   */
/* ------------------------------------------------------------------ */

const T: React.FC<{ en: string; bn: string; hi?: string; className?: string }> = ({ en, bn, hi, className }) => {
  const { safeTranslate } = useLanguage();
  return <span className={className}>{safeTranslate('auditTrail.label', en, bn, hi)}</span>;
};

const TAB_DEFS = [
  { id: 'trail', en: 'Money Trail', bn: 'অর্থের পথ', hi: 'धन पथ' },
  { id: 'chain', en: 'Custody Chain', bn: 'হেফাজত শৃঙ্খল', hi: 'अभिरक्षा श्रृंखला' },
  { id: 'transparency', en: 'Transparency', bn: 'স্বচ্ছতা', hi: 'पारदर्शिता' },
] as const;

type TabId = (typeof TAB_DEFS)[number]['id'];

/* ------------------------------ PDF ------------------------------ */



function downloadDocDef(docDef: any, fileName: string, timeoutMs = 25000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error('PDF generation timed out')); }
    }, timeoutMs);
    const done = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } };
    const fail = (e: any) => { if (!settled) { settled = true; clearTimeout(timer); reject(e); } };
    (async () => {
      try {
        const { createPdf } = await pdfEngineHandles();
        const pdf = createPdf(docDef);
        pdf.download(fileName);
        // getBlob's callback fires after layout; a throw inside pdfmake
        // (e.g. missing font) may surface as a window error instead, so
        // the timeout above guarantees we never hang the UI.
        pdf.getBlob(() => done());
      } catch (e) {
        fail(e);
      }
    })();
  });
}

/** Fallback report: English-only, built-in fonts. Used when the Sanatani
 *  font pack is unavailable — the trustee still gets the full report. */
function buildFallbackDocDef(
  entries: AuditEntry[],
  orgName: string,
  chainStatus: { intact: boolean | null; events: number },
  fingerprint: string,
  symbol = '₹'
): any {
  const totalIn = entries.filter((e) => e.type === 'Income').reduce((s, e) => s + e.amount, 0);
  const totalOut = entries.filter((e) => e.type === 'Expense').reduce((s, e) => s + e.amount, 0);
  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [24, 24, 24, 24],
    content: [
      { text: orgName, fontSize: 16, bold: true, alignment: 'center' },
      { text: 'AUDIT TRAIL — MONEY MOVEMENT', fontSize: 12, bold: true, alignment: 'center', margin: [0, 4, 0, 2] },
      {
        text: `Generated ${formatTrailDate(new Date().toISOString())}  •  ${entries.length} entries  •  In ${formatINRFull(totalIn, symbol)}  •  Out ${formatINRFull(totalOut, symbol)}  •  Net ${formatINRFull(totalIn - totalOut, symbol)}  •  Chain: ${chainStatus.intact === true ? 'INTACT' : chainStatus.intact === false ? 'BROKEN' : 'n/a'}`,
        fontSize: 8, alignment: 'center', margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          widths: ['10%', '14%', '15%', '22%', '7%', '11%', '11%', '10%'],
          body: [
            ['Date', 'Actor', 'Action', 'Purpose', 'Type', 'Amount', 'Balance', 'Chain'].map((h) => ({ text: h, bold: true, fontSize: 7 })),
            ...entries.map((e) => [
              { text: formatTrailDate(e.date), fontSize: 7 },
              { text: e.actor, fontSize: 7 },
              { text: e.action, fontSize: 7 },
              { text: e.purpose, fontSize: 7 },
              { text: e.type === 'Income' ? 'IN' : 'OUT', fontSize: 7, bold: true },
              { text: formatINRFull(e.amount, symbol), fontSize: 7, alignment: 'right' },
              { text: formatINRFull(e.balance, symbol), fontSize: 7, alignment: 'right' },
              { text: e.chained ? 'CHAINED' : 'ledger', fontSize: 7 },
            ]),
          ],
        },
      },
      { text: `Document fingerprint (SHA-256): ${fingerprint}`, fontSize: 7, margin: [0, 8, 0, 0] },
    ],
  };
}

async function exportTrailPDF(
  entries: AuditEntry[],
  orgName: string,
  workspace: any,
  chainStatus: { intact: boolean | null; events: number }
): Promise<void> {
  const sym = resolveWorkspaceCurrency(workspace).symbol;
  const { richFonts: rich } = await pdfEngineHandles();
  const fingerprint = fingerprintEntries(entries).slice(0, 32);
  const fileName = `Audit_Trail_${new Date().toISOString().slice(0, 10)}.pdf`;

  if (!rich) {
    // Font pack missing (e.g. stale PWA shell) — still deliver the report.
    await downloadDocDef(buildFallbackDocDef(entries, orgName, chainStatus, fingerprint, sym), fileName);
    return;
  }

  const totalIn = entries.filter((e) => e.type === 'Income').reduce((s, e) => s + e.amount, 0);
  const totalOut = entries.filter((e) => e.type === 'Expense').reduce((s, e) => s + e.amount, 0);

  const summaryCell = (label: string, dev: string, value: number, color: string): any => ({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: label, font: SANATANI_FONTS.body, fontSize: 7, bold: true, color: SANATANI_COLORS.stone, alignment: 'center' },
          { text: dev, font: SANATANI_FONTS.devanagari, fontSize: 7, color: SANATANI_COLORS.stone, alignment: 'center' },
          { text: formatINRFull(value, sym), font: SANATANI_FONTS.body, fontSize: 12, bold: true, color, alignment: 'center', margin: [0, 3, 0, 0] },
        ],
        margin: [0, 6, 0, 6],
      }]],
    },
    layout: {
      hLineWidth: () => 0.75, vLineWidth: () => 0.75,
      hLineColor: () => color, vLineColor: () => color,
      fillColor: () => SANATANI_COLORS.white,
    },
  });

  const rows = entries.map((e) => {
    const isInc = e.type === 'Income';
    return [
      formatTrailDate(e.date),
      e.actor,
      e.action,
      { text: e.purpose, fontSize: 6.5 },
      { text: isInc ? 'IN' : 'OUT', bold: true, color: isInc ? '#2F9E44' : SANATANI_COLORS.kumkum },
      { text: formatINRFull(e.amount, sym), bold: true, alignment: 'right' },
      { text: formatINRFull(e.balance, sym), alignment: 'right', color: SANATANI_COLORS.stone },
      e.chained ? { text: 'CHAINED', bold: true, fontSize: 6.5, color: '#2F9E44' } : { text: 'ledger', fontSize: 6.5, color: SANATANI_COLORS.stone },
    ];
  });

  const content: any[] = [
    sacredHeader({ trustName: orgName, invocation: invocationFor(workspace) }),
    sectionTitle('AUDIT TRAIL — MONEY MOVEMENT', 'धन प्रवाह लेखा'),
    {
      text: `Generated ${formatTrailDate(new Date().toISOString())}  •  ${entries.length} entries  •  Custody chain: ${
        chainStatus.intact === true ? `INTACT (${chainStatus.events} sealed events)` : chainStatus.intact === false ? 'BROKEN — INVESTIGATE' : 'not available on this device'
      }`,
      font: SANATANI_FONTS.body, fontSize: 8, color: SANATANI_COLORS.stone, alignment: 'center', margin: [0, 0, 0, 6],
    },
    {
      columns: [
        summaryCell('TOTAL IN', 'कुल आय', totalIn, '#2F9E44'),
        summaryCell('TOTAL OUT', 'कुल व्यय', totalOut, SANATANI_COLORS.kumkum),
        summaryCell('NET', 'शुद्ध शेष', totalIn - totalOut, SANATANI_COLORS.saffron),
      ],
      columnGap: 10,
      margin: [0, 0, 0, 6],
    },
    {
      table: {
        headerRows: 1,
        widths: ['10%', '13%', '14%', '18%', '7%', '13%', '13%', '12%'],
        body: [
          ['Date', 'Actor', 'Action', 'Purpose', 'Type', 'Amount', 'Balance', 'Provenance'].map((h) => ({
            text: h, font: SANATANI_FONTS.body, fontSize: 7, bold: true, color: SANATANI_COLORS.white,
          })),
          ...rows.map((r) =>
            r.map((c: any) => {
              const base = typeof c === 'object' && c !== null && 'text' in c ? c : { text: String(c ?? '') };
              return { font: SANATANI_FONTS.body, fontSize: 7, color: SANATANI_COLORS.umber, ...base };
            })
          ),
        ],
      },
      layout: {
        fillColor: (rowIndex: number) =>
          rowIndex === 0 ? SANATANI_COLORS.saffron : rowIndex % 2 === 0 ? SANATANI_COLORS.white : SANATANI_COLORS.cream,
        hLineWidth: () => 0.4, vLineWidth: () => 0.4,
        hLineColor: () => SANATANI_COLORS.sandalwood, vLineColor: () => SANATANI_COLORS.sandalwood,
        paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3,
      },
      margin: [0, 6, 0, 6],
    },
    {
      text: [
        { text: 'Document fingerprint (SHA-256): ', bold: true, fontSize: 7, color: SANATANI_COLORS.stone },
        { text: fingerprint, fontSize: 7, color: SANATANI_COLORS.stone },
      ],
      margin: [0, 4, 0, 0],
    },
    {
      text: 'Entries marked CHAINED trace back to SHA-256 hash-chained custody events (hundi > counting > bank). Entries marked "ledger" are direct treasury vouchers.',
      font: SANATANI_FONTS.body, fontSize: 7, color: SANATANI_COLORS.stone, margin: [0, 2, 0, 0],
    },
    sacredFooter({ blessing: blessingFor(workspace), docRef: generateCryptoDocRef('AUDT') }),
  ];

  // Local sacred frame (full-width single table). The shared tripleBorder
  // helper nests an auto-sized column that collapses content width in some
  // pdfmake builds — this frame keeps the ledger table full-bleed.
  const frame = {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          {
            table: {
              widths: ['*'],
              body: [[{ stack: content }]],
            },
            layout: {
              hLineWidth: () => 1.2, vLineWidth: () => 1.2,
              hLineColor: () => SANATANI_COLORS.saffron, vLineColor: () => SANATANI_COLORS.saffron,
              paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 10, paddingBottom: () => 10,
            },
          },
        ],
      }]],
    },
    layout: {
      hLineWidth: () => 0.6, vLineWidth: () => 0.6,
      hLineColor: () => SANATANI_COLORS.gold, vLineColor: () => SANATANI_COLORS.gold,
      paddingLeft: () => 5, paddingRight: () => 5, paddingTop: () => 5, paddingBottom: () => 5,
    },
  };

  const docDef = {
    pageSize: 'A4',
    pageOrientation: 'landscape' as const,
    pageMargins: [24, 24, 24, 24] as any,
    content: [frame],
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };

  try {
    await downloadDocDef(docDef, fileName);
  } catch (e) {
    // Rich layout failed mid-flight (e.g. a font vanished) — fall back.
    console.warn('[auditTrail] rich PDF failed, using fallback layout', e);
    await downloadDocDef(buildFallbackDocDef(entries, orgName, chainStatus, fingerprint, sym), fileName);
  }
}

/* ------------------------- timeline entry ------------------------- */

const TimelineCard: React.FC<{
  entry: AuditEntry;
  hash: string | null;
  onShowChain: (entry: AuditEntry) => void;
}> = ({ entry, hash, onShowChain }) => {
  const wsCurrency = useWorkspaceCurrency();
  const isInc = entry.type === 'Income';
  return (
    <div className="relative pl-10 sm:pl-12 pb-4">
      {/* rail */}
      <div className="absolute left-[15px] sm:left-[19px] top-10 bottom-0 w-px bg-gradient-to-b from-amber-500/50 to-amber-500/10" aria-hidden />
      <div className={`absolute left-2 sm:left-3 top-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-base font-black shadow ${
        isInc ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300' : 'bg-red-500/15 border-red-500/50 text-red-300'
      }`} aria-hidden>
        {isInc ? '+' : '−'}
      </div>

      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 sm:p-4 hover:border-amber-500/40 transition-colors">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-0.5 tabular-nums">
                {formatTrailDate(entry.date)}
              </span>
              {entry.auditVerified && (
                <span className="text-[11px] font-bold text-emerald-300" title="Audit verified">✓</span>
              )}
            </div>
            <div className="text-sm sm:text-base font-bold text-amber-100 mt-1.5">{entry.action}</div>
            <div className="text-xs text-temple-300 mt-0.5">{entry.purpose}</div>
            <div className="text-[11px] text-temple-400 mt-1">
              {entry.actor} · {entry.paymentMode}
              {entry.referenceNo ? ` · ${entry.referenceNo}` : ''}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-lg sm:text-xl font-black tabular-nums ${isInc ? 'text-emerald-300' : 'text-red-300'}`}>
              {isInc ? '+' : '−'}{formatLakhCrore(entry.amount, wsCurrency.symbol)}
            </div>
            <div className="text-[11px] text-temple-400 tabular-nums">
              <T en="Balance" bn="স্থিতি" hi="शेष" /> {formatINRFull(entry.balance, wsCurrency.symbol)}
            </div>
          </div>
        </div>

        {/* provenance / hash badge */}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          {entry.chained && hash ? (
            <button
              type="button"
              onClick={() => onShowChain(entry)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors cursor-pointer"
              title="Tap to see the hash-chained custody events behind this entry"
            >
              <span aria-hidden>⛓️</span>
              <span className="font-mono tabular-nums">{shortHash(hash)}</span>
              <span className="text-emerald-200/70 font-normal">
                <T en="tap to verify" bn="যাচাই দেখুন" hi="सत्यापित देखें" />
              </span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-xs text-temple-400">
              📒 <T en="Direct ledger voucher" bn="সরাসরি ভাউচার" hi="प्रत्यक्ष वाउचर" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* --------------------------- main desk --------------------------- */

const AuditTrailInner: React.FC = () => {
  const wsCurrency = useWorkspaceCurrency();
  const { treasury } = useData();
  const { activeWorkspace, checkPermission } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const custody = useCashCustody();

  const [tab, setTab] = useState<TabId>('trail');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');
  const [actor, setActor] = useState('');
  const [query, setQuery] = useState('');
  const [chainedOnly, setChainedOnly] = useState(false);
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; at: number }>(null);
  const [drawerEntry, setDrawerEntry] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  const allowed = checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']);

  const entries = useMemo(() => buildAuditEntries(treasury || []), [treasury]);
  const filtered = useMemo(
    () => applyTrailFilters(entries, { from, to, category, actor, query, chainedOnly }),
    [entries, from, to, category, actor, query, chainedOnly]
  );
  const categories = useMemo(() => extractCategories(entries), [entries]);
  const actors = useMemo(() => extractActors(entries), [entries]);

  const chainBrokenAt = useMemo(
    () => (custody.state.events.length ? verifyChain(custody.state.events) : -1),
    [custody.state.events]
  );
  const chainIntact = custody.state.events.length === 0 ? null : chainBrokenAt === -1;

  const totals = useMemo(() => {
    const tin = filtered.filter((e) => e.type === 'Income').reduce((s, e) => s + e.amount, 0);
    const tout = filtered.filter((e) => e.type === 'Expense').reduce((s, e) => s + e.amount, 0);
    return { tin, tout, net: tin - tout };
  }, [filtered]);

  const snapshot = useMemo(
    () => buildTransparencySnapshot(entries, activeWorkspace?.name || 'Sanatani Bandhan', {
      intact: chainIntact,
      events: custody.state.events.length,
    }),
    [entries, activeWorkspace, chainIntact, custody.state.events.length]
  );

  const provenance: CustodyEvent[] = useMemo(
    () => (drawerEntry ? findProvenance(custody.state, drawerEntry) : []),
    [drawerEntry, custody.state]
  );

  if (!allowed) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <div className="text-3xl mb-2">🔒</div>
        <div className="text-red-200 font-bold">
          <T en="Audit trail is restricted to trustees and accountants." bn="অডিট ট্রেইল শুধুমাত্র ট্রাস্টি ও হিসাবরক্ষকের জন্য।" hi="ऑडिट ट्रेल केवल ट्रस्टी और लेखाकार के लिए है।" />
        </div>
      </div>
    );
  }

  const runVerify = () => {
    const at = verifyChain(custody.state.events);
    setVerifyResult({ ok: at === -1, at });
  };

  const handleCSV = () => {
    downloadTextFile(
      `Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`,
      trailToCSV(filtered)
    );
  };

  const handlePDF = async () => {
    setExporting(true);
    try {
      await exportTrailPDF(filtered, activeWorkspace?.name || 'Sanatani Bandhan', activeWorkspace, {
        intact: chainIntact,
        events: custody.state.events.length,
      });
    } finally {
      setExporting(false);
    }
  };

  const inputCls =
    'rounded-xl bg-white/[0.05] border border-white/15 text-amber-100 text-sm px-3 py-2.5 min-h-[44px] focus:outline-none focus:border-amber-400 placeholder:text-temple-500';

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-temple-950 via-temple-900 to-temple-950 shadow-2xl overflow-hidden">
      {/* header */}
      <div className="px-5 sm:px-8 pt-6 pb-5 border-b border-amber-500/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl" aria-hidden>⛓️</span>
              <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
                <T en="Audit Trail" bn="অডিট ট্রেইল" hi="ऑडिट ट्रेल" />
              </h2>
              {chainIntact === true && (
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 rounded-full px-2.5 py-1">
                  ✓ <T en="Chain intact" bn="শৃঙ্খল অক্ষত" hi="श्रृंखला अक्षत" />
                </span>
              )}
              {chainIntact === false && (
                <span className="text-[11px] font-bold text-red-300 bg-red-500/15 border border-red-500/40 rounded-full px-2.5 py-1">
                  ⚠ <T en="Chain broken" bn="শৃঙ্খল ভাঙা" hi="श्रृंखला टूटी" />
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-temple-300 mt-1.5 max-w-2xl">
              <T
                en="Every rupee's journey — stamped, sequenced, and tamper-evident. Works offline: the chain lives on this device."
                bn="প্রতিটি টাকার যাত্রা — সিলমোহরযুক্ত ও অপরিবর্তনীয়। অফলাইনে কাজ করে।"
                hi="हर रुपये की यात्रा — मुहरबंद और छेड़छाड़-रहित। ऑफ़लाइन काम करता है।"
              />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runVerify}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              ⛓️ <T en="Verify integrity" bn="অখণ্ডতা যাচাই" hi="अखंडता सत्यापित करें" />
            </button>
            <button
              type="button"
              onClick={handleCSV}
              className="min-h-[44px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/20 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              📥 CSV
            </button>
            <button
              type="button"
              onClick={handlePDF}
              disabled={exporting}
              className="min-h-[44px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/20 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {exporting ? '…' : '📄'} <T en="PDF report" bn="পিডিএফ রিপোর্ট" hi="पीडीएफ रिपोर्ट" />
            </button>
          </div>
        </div>

        {verifyResult && (
          <div
            role="status"
            className={`mt-4 rounded-2xl border p-4 flex items-start gap-3 ${
              verifyResult.ok
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-red-500/10 border-red-500/40'
            }`}
          >
            <span className="text-2xl" aria-hidden>{verifyResult.ok ? '✅' : '🚨'}</span>
            <div className="text-sm">
              {verifyResult.ok ? (
                <>
                  <div className="font-black text-emerald-300">
                    <T en="Integrity verified — every link in the custody chain checks out." bn="যাচাই সফল — শৃঙ্খলের প্রতিটি লিংক ঠিক আছে।" hi="सत्यापन सफल — श्रृंखला की हर कड़ी सही है।" />
                  </div>
                  <div className="text-emerald-200/70 text-xs mt-1 tabular-nums">
                    {custody.state.events.length} <T en="sealed events re-hashed and re-linked, newest to oldest. Any edit to any record would break a link." bn="টি সিল করা ইভেন্ট পুনঃযাচাই করা হয়েছে।" hi="सील की गई घटनाएँ पुनः सत्यापित।" />
                  </div>
                </>
              ) : (
                <>
                  <div className="font-black text-red-300">
                    <T en="Chain broken — investigate before proceeding." bn="শৃঙ্খল ভাঙা — তদন্ত করুন।" hi="श्रृंखला टूटी — जाँच करें।" />
                  </div>
                  <div className="text-red-200/70 text-xs mt-1 tabular-nums">
                    <T en="First broken link" bn="প্রথম ভাঙা লিংক" hi="पहली टूटी कड़ी" /> #{verifyResult.at + 1}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* tabs */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist">
          {TAB_DEFS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-bold border transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-temple-950 border-amber-500 shadow-lg shadow-amber-600/30'
                  : 'bg-white/[0.04] text-temple-300 border-white/15 hover:border-amber-500/40'
              }`}
            >
              <T en={t.en} bn={t.bn} hi={t.hi} />
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 sm:px-8 py-6">
        {tab === 'trail' && (
          <div>
            {/* totals */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
              {[
                { label: safeTranslate('auditTrail.in', 'In', 'আয়', 'आय'), v: totals.tin, tone: 'text-emerald-300' },
                { label: safeTranslate('auditTrail.out', 'Out', 'ব্যয়', 'व्यय'), v: totals.tout, tone: 'text-red-300' },
                { label: safeTranslate('auditTrail.net', 'Net', 'নিট', 'शुद्ध'), v: totals.net, tone: 'text-amber-300' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 sm:p-4 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-temple-400">{s.label}</div>
                  <div className={`text-lg sm:text-2xl font-black tabular-nums mt-1 ${s.tone}`}>{formatLakhCrore(s.v, wsCurrency.symbol)}</div>
                </div>
              ))}
            </div>

            {/* filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} aria-label="From date" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} aria-label="To date" />
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} aria-label="Category">
                <option value="">{safeTranslate('auditTrail.allCat', 'All categories', 'সব বিভাগ', 'सभी श्रेणियाँ')}</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={actor} onChange={(e) => setActor(e.target.value)} className={inputCls} aria-label="Actor">
                <option value="">{safeTranslate('auditTrail.allActors', 'All actors', 'সবাই', 'सभी')}</option>
                {actors.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={safeTranslate('auditTrail.search', 'Search…', 'খুঁজুন…', 'खोजें…')}
                className={`${inputCls} col-span-2 sm:col-span-1`}
                aria-label="Search trail"
              />
              <button
                type="button"
                onClick={() => setChainedOnly(!chainedOnly)}
                aria-pressed={chainedOnly}
                className={`min-h-[44px] rounded-xl border text-xs font-bold px-3 transition-all cursor-pointer ${
                  chainedOnly
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-white/[0.04] border-white/15 text-temple-300'
                }`}
              >
                ⛓️ <T en="Chained only" bn="শুধু শৃঙ্খলযুক্ত" hi="केवल श्रृंखलाबद्ध" />
              </button>
            </div>

            {/* timeline */}
            <div className="text-xs text-temple-400 mb-3 tabular-nums">
              {filtered.length} <T en="entries" bn="টি এন্ট্রি" hi="प्रविष्टियाँ" />
              {(from || to || category || actor || query || chainedOnly) && (
                <button
                  type="button"
                  onClick={() => { setFrom(''); setTo(''); setCategory(''); setActor(''); setQuery(''); setChainedOnly(false); }}
                  className="ml-3 underline text-amber-300 cursor-pointer"
                >
                  <T en="Clear filters" bn="ফিল্টার মুছুন" hi="फ़िल्टर हटाएँ" />
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
                <div className="text-temple-100 text-sm font-bold">
                  {safeTranslate('vibe.sevakTrailEmptyTitle', 'The trail is quiet here', 'পথ এখানে নীরব', 'पथ यहाँ शांत है')}
                </div>
                <p className="text-temple-300 text-sm mt-1.5">
                  {safeTranslate('vibe.sevakTrailEmpty', 'No entries answer to these filters. The trail itself is safe — vouchers and hundi deposits appear here as they are posted.', 'এই ফিল্টারগুলোর উত্তর নেই। পথ নিজে নিরাপদ — ভাউচার ও হুন্ডি জমা হলেই এখানে দেখা যাবে।', 'इन फ़िल्टरों का कोई उत्तर नहीं। पथ स्वयं सुरक्षित है — वाउचर और हुंडी जमा होते ही यहाँ दिखेंगे।')}
                </p>
              </div>
            ) : (
              <div>
                {filtered.slice().reverse().map((e) => (
                  <TimelineCard
                    key={e.id}
                    entry={e}
                    hash={e.chained ? provenanceHash(custody.state, e) : null}
                    onShowChain={setDrawerEntry}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'chain' && (
          <div className="rounded-2xl bg-stone-50 p-3 sm:p-5 text-stone-800">
            <ChainTab />
          </div>
        )}

        {tab === 'transparency' && (
          <div>
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 mb-5 text-xs sm:text-sm text-sky-200">
              <span className="font-bold">👁 <T en="Trustee preview — " bn="ট্রাস্টি প্রিভিউ — " hi="ट्रस्टी पूर्वावलोकन — " /></span>
              <T
                en="this is exactly what devotees see: purpose totals only. No names, no individual entries, no ledger. The summary is built from aggregates that cannot leak raw records."
                bn="ভক্তরা ঠিক এটাই দেখেন: শুধুমাত্র উদ্দেশ্য-ভিত্তিক মোট। কোনো নাম বা লেজার নয়।"
                hi="भक्त ठीक यही देखते हैं: केवल उद्देश्य-वार कुल। कोई नाम या लेज़र नहीं।"
              />
            </div>
            <TransparencyView snapshot={snapshot} />
          </div>
        )}
      </div>

      {/* provenance drawer */}
      {drawerEntry && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawerEntry(null)} />
          <div className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-temple-950 border border-amber-500/40 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">⛓️ <T en="Chain of custody" bn="হেফাজত শৃঙ্খল" hi="अभिरक्षा श्रृंखला" /></div>
                <div className="text-base font-black text-amber-200 mt-1">{drawerEntry.action}</div>
                <div className="text-xs text-temple-300 tabular-nums">
                  {formatTrailDate(drawerEntry.date)} · {formatINRFull(drawerEntry.amount, wsCurrency.symbol)}
                  {drawerEntry.slipNo ? ` · ${drawerEntry.slipNo}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerEntry(null)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white/[0.06] border border-white/20 text-amber-200 font-bold cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-temple-400 mb-4">
              <T
                en="Each event below stores the SHA-256 hash of the one before it. Editing any record breaks every later link."
                bn="প্রতিটি ইভেন্ট আগেরটির SHA-256 হ্যাশ সংরক্ষণ করে।"
                hi="प्रत्येक घटना पिछली घटना का SHA-256 हैश रखती है।"
              />
            </p>
            {/* VIBE B3 — the chain of custody as a mala: one bead per
                linked event; beads at/after the desk's own verified
                break (verifyChain over the full custody chain, seq
                compared) hollow out. Presentation only. */}
            {provenance.length > 0 ? (
              <MalaThread
                tone="dark"
                breakLabel={safeTranslate('vibe.malaBreakHere', 'The thread breaks here', 'সুতো এখানে ছিন্ন', 'धागा यहाँ टूटता है')}
                beads={provenance.map((ev, i) => {
                  const sortedFull = [...custody.state.events].sort(
                    (a, b) => (a.seq ?? 0) - (b.seq ?? 0)
                  );
                  const breakSeq =
                    chainBrokenAt >= 0 ? sortedFull[chainBrokenAt]?.seq : undefined;
                  return {
                    id: ev.id,
                    seqLabel: `#${i + 1}`,
                    title: ev.kind.replace(/_/g, ' '),
                    detail: ev.details,
                    hashShort: shortHash(ev.hash, 8),
                    broken: breakSeq !== undefined && (ev.seq ?? 0) >= breakSeq,
                    expandedContent: (
                      <div className="font-mono text-[10px] text-temple-300 break-all space-y-1 tabular-nums">
                        <div><span className="text-temple-500">hash:</span> {ev.hash}</div>
                        <div><span className="text-temple-500">prev:</span> {ev.prevHash}</div>
                        <div><span className="text-temple-500">actor:</span> <span className="font-sans">{ev.actor}</span></div>
                      </div>
                    ),
                  };
                })}
              />
            ) : (
              <p className="text-sm text-temple-300">
                <T en="No linked custody events found on this device." bn="এই ডিভাইসে কোনো লিংকড ইভেন্ট পাওয়া যায়নি।" hi="इस डिवाइस पर कोई लिंक्ड घटना नहीं मिली।" />
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/** Provider-wrapped entry point — mounts the per-workspace custody store. */
export const AuditTrailView: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <CashCustodyProvider workspaceId={activeWorkspace?.id || 'default'}>
      <AuditTrailInner />
    </CashCustodyProvider>
  );
};

export default AuditTrailView;
