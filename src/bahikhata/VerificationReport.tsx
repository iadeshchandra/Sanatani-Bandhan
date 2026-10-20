import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import type { BatchActor, ImportBatch, ImportRow, SpotCheck } from './types';
import { TARGET_FIELDS } from './types';
import { bk, fieldLabel, type BkLang } from './copy';
import { buildVerification, freshSpotChecks } from './verification';
import { displayDigits } from './normalize';

/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — the closing verification report.          */
/*                                                                     */
/* Rendered for committed batches: counts vs the entrant's pages,      */
/* the double-keyed money check, the org's own accuracy numbers, and   */
/* three deterministic spot-checks the trustee compares against the    */
/* photos with their own eyes. Sealing is the trustee's act — it       */
/* writes batch.verification (spot-check ticks + totals verdict) and   */
/* is what makes the report a record rather than a screenshot.         */
/* ------------------------------------------------------------------ */

interface Props {
  lang: BkLang;
  batch: ImportBatch;
  actor: BatchActor;
  canSeal: boolean;
  /** Resolve a page's evidence photo to a displayable URL. */
  photoUrlFor: (batch: ImportBatch, pageNo: number) => Promise<string | null>;
  onSeal: (batch: ImportBatch) => void;
}

const rowSummary = (row: ImportRow, target: ImportBatch['target']): string => {
  const parts: string[] = [];
  for (const def of TARGET_FIELDS[target]) {
    const v = row.mapped[def.key];
    if (v === undefined || v === '' || v === null) continue;
    parts.push(`${def.key}: ${String(v)}`);
    if (parts.length >= 4) break;
  }
  return parts.join(' · ');
};

/** Union of a row's cell boxes, as CSS percentages over the photo. */
const rowRegion = (row: ImportRow): { left: string; top: string; width: string; height: string } | null => {
  if (!row.cells) return null;
  const boxes = Object.values(row.cells)
    .map((c) => c.bbox)
    .filter((b): b is NonNullable<typeof b> => !!b);
  if (!boxes.length) return null;
  const x0 = Math.min(...boxes.map((b) => b.x0));
  const y0 = Math.min(...boxes.map((b) => b.y0));
  const x1 = Math.max(...boxes.map((b) => b.x1));
  const y1 = Math.max(...boxes.map((b) => b.y1));
  return {
    left: `${x0 * 100}%`, top: `${y0 * 100}%`,
    width: `${Math.max(1, (x1 - x0) * 100)}%`, height: `${Math.max(1, (y1 - y0)) * 100}%`,
  };
};

const SpotPhoto: React.FC<{ batch: ImportBatch; row: ImportRow; photoUrlFor: Props['photoUrlFor'] }> = ({ batch, row, photoUrlFor }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void photoUrlFor(batch, row.pageNo).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [batch, row.pageNo, photoUrlFor]);
  const region = rowRegion(row);
  if (!url) return null;
  return (
    <div className="relative rounded-xl overflow-hidden border border-stone-300 bg-stone-900">
      <img src={url} alt={`Page ${row.pageNo}`} className="w-full max-h-56 object-contain" />
      {region && (
        <div
          className="absolute border-[3px] border-amber-400 bg-amber-400/20 rounded"
          style={region}
        />
      )}
    </div>
  );
};

export const VerificationReport: React.FC<Props> = ({ lang, batch, actor, canSeal, photoUrlFor, onSeal }) => {
  const data = buildVerification(batch);
  const existing = batch.verification;
  const [checks, setChecks] = useState<SpotCheck[]>(
    existing?.spotChecks?.length ? existing.spotChecks : freshSpotChecks(batch)
  );
  const sealed = !!existing;
  const allOk = checks.length > 0 && checks.every((c) => c.ok);
  const byRowId = new Map(batch.rows.map((r) => [r.rowId, r]));

  const toggle = (rowId: string) =>
    setChecks((cs) => cs.map((c) => (c.rowId === rowId ? { ...c, ok: !c.ok } : c)));

  const handleSeal = () => {
    onSeal({
      ...batch,
      verification: {
        sealedBy: actor,
        sealedAt: Date.now(),
        spotChecks: checks,
        totalsMatch: data.totalsMatch,
        mismatchedPages: data.mismatchedPages,
      },
    });
  };

  const d = (n: number | string) => displayDigits(n, lang);

  return (
    <section className="bg-white border-2 border-emerald-200 rounded-3xl p-4 shadow-sm space-y-4">
      <h3 className="font-black text-lg text-stone-900 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-700" /> {bk(lang, 'verifyTitle')}
      </h3>
      <p className="text-sm text-stone-600 leading-relaxed">{bk(lang, 'verifyIntro')}</p>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
          <dt className="text-xs font-bold text-stone-500 uppercase tracking-wide">{bk(lang, 'verifyPages')}</dt>
          <dd className="font-black text-xl text-stone-900 mt-1">{d(data.pagesPhotographed)}</dd>
        </div>
        <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
          <dt className="text-xs font-bold text-stone-500 uppercase tracking-wide">{bk(lang, 'verifyRows')}</dt>
          <dd className="font-black text-xl text-stone-900 mt-1">
            {d(data.rowsRead)} · {d(data.rowsCommitted)} · {d(data.rowsRead - data.rowsCommitted)}
          </dd>
        </div>
      </dl>

      {data.hasMoneyCheck && (
        <div className={`rounded-xl border p-3.5 text-sm font-semibold ${data.totalsMatch ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'}`}>
          <p>{bk(lang, 'verifyMoney', { keyed: d(data.keyedTotal), actual: d(data.approvedLineTotal) })}</p>
          <p className="mt-1">
            {data.totalsMatch
              ? bk(lang, 'verifyMoneyOk')
              : bk(lang, 'verifyMoneyBad', { pages: data.mismatchedPages.map((p) => d(p)).join(', ') })}
          </p>
        </div>
      )}

      {data.accuracy.totalCells > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-sm space-y-1.5">
          <p className="font-bold text-amber-950">
            {bk(lang, 'verifyAccuracy', {
              green: d(data.accuracy.autoGreen),
              total: d(data.accuracy.totalCells),
              touched: d(data.accuracy.touched),
            })}
          </p>
          {data.accuracy.perPage.map((p) => (
            <p key={p.pageNo} className="text-amber-900">
              {bk(lang, 'verifyPageLine', { page: d(p.pageNo), green: d(p.autoGreen), total: d(p.total) })}
            </p>
          ))}
        </div>
      )}

      {checks.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-black text-stone-800">{bk(lang, 'spotCheckTitle')}</h4>
          {checks.map((c) => {
            const row = byRowId.get(c.rowId);
            if (!row) return null;
            return (
              <div key={c.rowId} className="rounded-2xl border border-stone-200 p-3 space-y-2">
                <p className="text-sm font-semibold text-stone-800">
                  {bk(lang, 'pageWord')} {d(c.pageNo)} — {rowSummary(row, batch.target) || row.rowId}
                </p>
                <SpotPhoto batch={batch} row={row} photoUrlFor={photoUrlFor} />
                <button
                  type="button"
                  disabled={sealed}
                  onClick={() => toggle(c.rowId)}
                  className={`min-h-[48px] w-full px-4 py-2 rounded-xl font-black text-sm ${
                    c.ok ? 'bg-emerald-600 text-white' : 'bg-white border-2 border-stone-300 text-stone-700'
                  } disabled:opacity-60`}
                >
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  {bk(lang, 'spotCheckOk')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {sealed ? (
        <p className="text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
          🪔 {bk(lang, 'sealedLine', {
            name: existing!.sealedBy.name,
            date: d(new Date(existing!.sealedAt).toLocaleDateString()),
          })}
        </p>
      ) : (
        canSeal && (
          <button
            type="button"
            disabled={!allOk || checks.length === 0}
            onClick={handleSeal}
            className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black disabled:opacity-40"
          >
            {bk(lang, 'sealBtn')}
          </button>
        )
      )}
    </section>
  );
};
