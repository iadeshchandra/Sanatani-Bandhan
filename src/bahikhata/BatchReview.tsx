import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { BatchActor, BatchCommitSummary, ImportBatch, ImportRow } from './types';
import { TARGET_FIELDS } from './types';
import { bk, fieldLabel, type BkLang } from './copy';
import {
  defaultedSummary, reanalyzeRow,
  type ExistingNandiLike, type ExistingPerson,
} from './dedupe';
import { buildMappedFromFields, coerceEnumWords } from './mapping';
import { parseAmount } from './normalize';
import { applyTransition } from './bahikhataStore';
import { resolveVaultUrl } from '../lib/fileVault';
import { useToast } from '../context/ToastContext';
import { RowCard } from './RegisterMode';

/* ------------------------------------------------------------------ */
/* Batch review — the control that makes the append-only ledger safe.  */
/* Needs-fix rows first, duplicates pre-marked off, every defaulted    */
/* field disclosed ("gotra assumed Kashyapa — 6 rows"), the paper      */
/* page one tap away. Approve & Commit writes under the approver's     */
/* own session; Reject speaks plainly back to the entrant.             */
/* ------------------------------------------------------------------ */

interface Props {
  batch: ImportBatch;
  lang: BkLang;
  actor: BatchActor;
  canApprove: boolean;
  existingMembers: ExistingPerson[];
  existingHerd: ExistingNandiLike[];
  onUpdate: (b: ImportBatch) => void;
  onCommit: (b: ImportBatch) => BatchCommitSummary;
  onBack: () => void;
}

export const BatchReview: React.FC<Props> = ({
  batch, lang, actor, canApprove, existingMembers, existingHerd, onUpdate, onCommit, onBack,
}) => {
  const { showToast } = useToast();
  const [rejectReason, setRejectReason] = useState('');
  const [committing, setCommitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [obAmount, setObAmount] = useState(batch.openingBalance?.amount ? String(batch.openingBalance.amount) : '');
  const [obFund, setObFund] = useState(batch.openingBalance?.fundLabel || '');
  const [obDate, setObDate] = useState(batch.openingBalance?.asOfDate || new Date().toISOString().slice(0, 10));
  const [obVerified, setObVerified] = useState(!!batch.openingBalance?.verified);

  const isEntrant = actor.uid === batch.enteredBy.uid;
  const readOnly = batch.state === 'committed' || (batch.state === 'pending' && !canApprove);
  const fields = TARGET_FIELDS[batch.target];

  const groups = useMemo(() => {
    const needsFix = batch.rows.filter((r) => r.state === 'needs_fix');
    const ok = batch.rows.filter((r) => r.state === 'ok');
    const out = batch.rows.filter((r) => r.state === 'duplicate' || r.state === 'excluded');
    return { needsFix, ok, out };
  }, [batch.rows]);

  const defaults = useMemo(() => defaultedSummary(batch.rows), [batch.rows]);

  const othersCtx = (rowId: string) => ({
    existingMembers,
    existingHerd,
    priorRows: batch.rows.filter((r) => r.rowId !== rowId),
  });

  const patchRow = (row: ImportRow, patch: Partial<ImportRow>) => {
    onUpdate({ ...batch, rows: batch.rows.map((r) => (r.rowId === row.rowId ? { ...r, ...patch } : r)) });
  };

  const toggleApprove = (row: ImportRow) => {
    if (row.state === 'duplicate') {
      // Reviewer override: a "duplicate" the human vouches for.
      patchRow(row, { state: 'ok', approved: true });
    } else if (row.state === 'ok') {
      patchRow(row, { approved: !row.approved });
    }
  };

  const toggleExclude = (row: ImportRow) => {
    if (row.state === 'excluded') {
      const judged = reanalyzeRow(batch.target, { ...row, state: 'ok' }, othersCtx(row.rowId));
      patchRow(row, judged);
    } else {
      patchRow(row, { state: 'excluded', approved: false });
    }
  };

  const startEdit = (row: ImportRow) => {
    const f: Record<string, string> = {};
    for (const def of fields) {
      const v = row.mapped[def.key];
      f[def.key] = v === null || v === undefined ? '' : String(v);
    }
    setEditForm(f);
    setEditingRowId(row.rowId);
  };

  const saveEdit = (row: ImportRow) => {
    const mapped = coerceEnumWords(batch.target, buildMappedFromFields(batch.target, editForm));
    const judged = reanalyzeRow(batch.target, { ...row, mapped }, othersCtx(row.rowId));
    patchRow(row, judged);
    setEditingRowId(null);
  };

  const saveOpening = () => {
    const amount = parseAmount(obAmount) ?? 0;
    onUpdate({
      ...batch,
      openingBalance: { amount, fundLabel: obFund.trim(), asOfDate: obDate, verified: obVerified },
    });
    showToast('✓', 'success');
  };

  const handleCommit = () => {
    setCommitting(true);
    try {
      const summary = onCommit(batch);
      showToast(bk(lang, 'committedToast', { added: summary.added }), 'success');
    } catch (err: any) {
      showToast(
        err?.message === 'herd-commit-unavailable'
          ? 'Open this batch from the Goshala desk to commit herd rows.'
          : 'Commit failed — no rows were written. Please try again.',
        'error'
      );
    } finally {
      setCommitting(false);
    }
  };

  const openPhoto = async (ref: string) => {
    const url = await resolveVaultUrl(ref);
    if (url) setPhotoUrl(url);
  };

  const renderRow = (row: ImportRow) => (
    <div key={row.rowId}>
      <RowCard row={row} lang={lang} />
      {!readOnly && batch.state !== 'rejected' && (
        <div className="flex flex-wrap gap-2 mt-1.5 ml-1">
          {(row.state === 'ok' || row.state === 'duplicate') && (
            <label className="flex items-center gap-2 min-h-[44px] px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 accent-emerald-600"
                checked={row.approved && row.state === 'ok'}
                onChange={() => toggleApprove(row)}
              />
              {bk(lang, 'includeRow')}
            </label>
          )}
          <button type="button" onClick={() => startEdit(row)} className="min-h-[44px] px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-stone-700">
            {bk(lang, 'editRow')}
          </button>
          <button type="button" onClick={() => toggleExclude(row)} className="min-h-[44px] px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-stone-700">
            {row.state === 'excluded' ? bk(lang, 'includeRow') : bk(lang, 'excludeRow')}
          </button>
        </div>
      )}
      {editingRowId === row.rowId && (
        <div className="mt-2 bg-white border-2 border-amber-300 rounded-2xl p-4 space-y-2">
          {fields.map((def) => (
            <label key={def.key} className="block">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{fieldLabel(lang, def.key)}</span>
              {def.kind === 'enum' ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {def.options!.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, [def.key]: o.value }))}
                      className={`min-h-[44px] px-3 py-1.5 rounded-xl border-2 text-xs font-bold ${
                        editForm[def.key] === o.value ? 'bg-amber-600 border-amber-700 text-white' : 'bg-white border-stone-300 text-stone-700'
                      }`}
                    >
                      {o[lang]}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  value={editForm[def.key] || ''}
                  type={def.kind === 'date' ? 'date' : 'text'}
                  onChange={(e) => setEditForm((f) => ({ ...f, [def.key]: e.target.value }))}
                />
              )}
            </label>
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={() => saveEdit(row)} className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black">
              {bk(lang, 'updateRow')}
            </button>
            <button type="button" onClick={() => setEditingRowId(null)} className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-100 border border-stone-300 text-xs font-bold">
              {bk(lang, 'cancelEdit')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-bold text-amber-800 min-h-[44px]">
        {bk(lang, 'backBtn')}
      </button>

      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-2">
        <h3 className="font-black text-lg text-stone-900">{bk(lang, 'reviewTitle')}</h3>
        <p className="text-sm font-bold text-stone-700">{batch.label}</p>
        <p className="text-xs text-stone-500">
          {bk(lang, 'enteredBy')}: {batch.enteredBy.name} ({batch.enteredBy.role}) · {batch.rows.length} {bk(lang, 'rowsWord')}
          {batch.reviewedBy && <> · {bk(lang, 'reviewedBy')}: {batch.reviewedBy.name}</>}
        </p>
        <p className="text-sm text-stone-600 leading-relaxed">{bk(lang, 'reviewIntro')}</p>
        {defaults.map((d) => (
          <p key={d.field} className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            ⚠ {bk(lang, 'assumedLine', { field: fieldLabel(lang, d.field), value: d.value || '—', count: d.count })}
          </p>
        ))}
        {batch.state === 'rejected' && batch.rejectReason && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-800">
            <strong>{bk(lang, 'rejectedBanner')}</strong> {batch.rejectReason}
          </div>
        )}
        {readOnly && batch.state === 'pending' && (
          <p className="text-xs text-stone-500">{canApprove ? bk(lang, 'readOnlyNote') : bk(lang, 'cannotApproveNote')}</p>
        )}
        {batch.commitSummary && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-sm text-emerald-900 font-semibold">
            ✓ {batch.commitSummary.added} {bk(lang, 'summaryAdded')} · {batch.commitSummary.skippedDuplicates} {bk(lang, 'summarySkipped')} · {batch.commitSummary.treasuryLines} {bk(lang, 'summaryTreasury')}
            {batch.commitSummary.openingBalanceWritten && <> · {bk(lang, 'summaryOpening')}</>}
          </div>
        )}
      </div>

      {batch.pagePhotoRefs.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-stone-700 mb-2">{bk(lang, 'pagePhotos')}</p>
          <div className="flex flex-wrap gap-2">
            {batch.pagePhotoRefs.map((p) => (
              <button
                key={p.pageNo}
                type="button"
                onClick={() => openPhoto(p.ref)}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-100 border border-stone-300 text-xs font-bold text-stone-700"
              >
                📷 {bk(lang, 'pageWord')} {p.pageNo}
              </button>
            ))}
          </div>
        </div>
      )}

      {groups.needsFix.length > 0 && (
        <section className="space-y-2">
          <h4 className="font-black text-amber-800">⚠ {bk(lang, 'groupNeedsFix')} ({groups.needsFix.length})</h4>
          {groups.needsFix.map(renderRow)}
        </section>
      )}
      {groups.ok.length > 0 && (
        <section className="space-y-2">
          <h4 className="font-black text-emerald-800">✓ {bk(lang, 'groupOk')} ({groups.ok.length})</h4>
          {groups.ok.map(renderRow)}
        </section>
      )}
      {groups.out.length > 0 && (
        <section className="space-y-2">
          <h4 className="font-black text-stone-500">{bk(lang, 'groupDuplicates')} ({groups.out.length})</h4>
          {groups.out.map(renderRow)}
        </section>
      )}

      {batch.target === 'donors' && canApprove && batch.state === 'pending' && (
        <div className="bg-white border-2 border-emerald-300 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="font-black text-stone-900">{bk(lang, 'openingTitle')}</h4>
          <p className="text-xs text-stone-500 leading-relaxed">{bk(lang, 'openingIntro')}</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{bk(lang, 'openingAmount')}</span>
              <input className="w-full min-h-[48px] rounded-xl border border-stone-300 px-3 py-2" inputMode="numeric" value={obAmount} onChange={(e) => setObAmount(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{bk(lang, 'openingFund')}</span>
              <input className="w-full min-h-[48px] rounded-xl border border-stone-300 px-3 py-2" value={obFund} onChange={(e) => setObFund(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{bk(lang, 'openingAsOf')}</span>
              <input className="w-full min-h-[48px] rounded-xl border border-stone-300 px-3 py-2" type="date" value={obDate} onChange={(e) => setObDate(e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2.5 font-bold text-sm text-stone-800 cursor-pointer min-h-[44px]">
            <input type="checkbox" className="w-5 h-5 accent-emerald-600" checked={obVerified} onChange={(e) => setObVerified(e.target.checked)} />
            {bk(lang, 'openingVerify')}
          </label>
          <button type="button" onClick={saveOpening} className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-800 text-white text-xs font-black">
            ✓ {bk(lang, 'updateRow')}
          </button>
        </div>
      )}

      {batch.state === 'pending' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
          {canApprove && (
            <>
              <button
                type="button"
                onClick={handleCommit}
                disabled={committing}
                className="w-full min-h-[56px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow disabled:opacity-50"
              >
                {committing ? bk(lang, 'committing') : bk(lang, 'approveCommit')}
              </button>
              <div className="flex gap-2">
                <input
                  className="flex-1 min-h-[48px] rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  placeholder={bk(lang, 'rejectPlaceholder')}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => onUpdate(applyTransition(batch, 'reject', actor, { rejectReason }))}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black"
                >
                  {bk(lang, 'rejectBtn')}
                </button>
              </div>
            </>
          )}
          {isEntrant && (
            <button
              type="button"
              onClick={() => onUpdate(applyTransition(batch, 'withdraw', actor))}
              className="min-h-[48px] px-4 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-700"
            >
              {bk(lang, 'withdrawBtn')}
            </button>
          )}
        </div>
      )}

      {batch.state === 'rejected' && isEntrant && (
        <button
          type="button"
          onClick={() => onUpdate(applyTransition(batch, 'reopen', actor))}
          className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-amber-600 text-white font-black shadow"
        >
          {bk(lang, 'continueBtn')} — {bk(lang, 'editRow')}
        </button>
      )}

      {photoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPhotoUrl(null)}>
          <button type="button" className="absolute top-4 right-4 text-white min-h-[44px] min-w-[44px]" onClick={() => setPhotoUrl(null)}>
            <X className="w-7 h-7" />
          </button>
          <img src={photoUrl} alt="Register page" className="max-h-[90vh] max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
};
