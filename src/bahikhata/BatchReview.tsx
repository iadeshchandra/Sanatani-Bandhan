import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type {
  BatchActor, BatchCommitSummary, ImportBatch, ImportRow, RegisterProfile, ScanCell,
} from './types';
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
import { confirmCell, unconfirmedRedCells } from './scan/cellConfidence';
import { bestProposal } from './scan/corrections';
import {
  applyLlmRecheck, llmRecheckGate, type LlmRecheckGate,
} from './scan/llmRecheck';
import { loadWorkingImage } from './scan/capture';
import type { UndoResult } from './undo';
import { VerificationReport } from './VerificationReport';

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
  /** Scan dictionaries (the org's own word-lists) for proposal chips
   *  and the AI re-check. Optional — typed/CSV batches don't need it. */
  dictionaries?: Record<string, string[]>;
  /** The register profile this batch was scanned with (learning). */
  profile?: RegisterProfile | null;
  /** Correction-learning hook: a cell's machine read was vouched
   *  as-is (acceptedAsRead) or corrected to a final value. */
  onCellLearned?: (field: string, readText: string, finalText: string, acceptedAsRead: boolean) => void;
  /** Committed-batch undo, executed by the Desk against live stores.
   *  Absent = undo not offered in this mount. */
  onUndo?: (b: ImportBatch) => UndoResult | null;
  onUpdate: (b: ImportBatch) => void;
  onCommit: (b: ImportBatch) => BatchCommitSummary;
  onBack: () => void;
}

export const BatchReview: React.FC<Props> = ({
  batch, lang, actor, canApprove, existingMembers, existingHerd,
  dictionaries, profile, onCellLearned, onUndo,
  onUpdate, onCommit, onBack,
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
  /* Phase 2 scan-review state */
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; field: string } | null>(null);
  const [highlight, setHighlight] = useState<{ pageNo: number; cell: ScanCell } | null>(null);
  const [photoPage, setPhotoPage] = useState<number | null>(null);
  const [showWorking, setShowWorking] = useState(false);
  const [workingUrl, setWorkingUrl] = useState<string | null>(null);
  const [llmGate, setLlmGate] = useState<LlmRecheckGate | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);
  const [undoArm, setUndoArm] = useState(false);
  const [undoResult, setUndoResult] = useState<UndoResult | null>(null);

  const isEntrant = actor.uid === batch.enteredBy.uid;
  const readOnly = batch.state === 'committed' || batch.state === 'undone' || (batch.state === 'pending' && !canApprove);
  const hasCells = batch.rows.some((r) => r.cells && Object.keys(r.cells).length > 0);

  useEffect(() => {
    if (!hasCells) return;
    let alive = true;
    void llmRecheckGate().then((g) => { if (alive) setLlmGate(g); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.id, hasCells]);
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
    // Correction learning: a field the reviewer actually changed vs
    // the machine's read counts as "not accepted as read".
    if (row.cells && onCellLearned) {
      for (const def of fields) {
        const cell = row.cells[def.key];
        if (!cell) continue;
        const before = row.mapped[def.key] === null || row.mapped[def.key] === undefined ? '' : String(row.mapped[def.key]);
        if ((editForm[def.key] || '') !== before && (editForm[def.key] || '') !== cell.text) {
          onCellLearned(def.key, cell.text, editForm[def.key] || '', false);
        }
      }
    }
    const mapped = coerceEnumWords(batch.target, buildMappedFromFields(batch.target, editForm));
    let judged = reanalyzeRow(batch.target, { ...row, mapped }, othersCtx(row.rowId));
    // Accuracy honesty: a scan cell the reviewer edited by hand was
    // human-touched (its read text stays as history; the flag feeds
    // the verification report's touched count).
    if (judged.cells) {
      const cells = { ...judged.cells };
      let changedCells = false;
      for (const def of fields) {
        const c = cells[def.key];
        if (c && (editForm[def.key] || '') !== c.text && (editForm[def.key] || '') !== '') {
          cells[def.key] = { ...c, touched: true };
          changedCells = true;
        }
      }
      if (changedCells) judged = { ...judged, cells };
    }
    patchRow(row, judged);
    setEditingRowId(null);
  };

  /* ---------------- Phase 2: scan-cell actions ---------------------- */

  const replaceRow = (next: ImportRow) => {
    onUpdate({ ...batch, rows: batch.rows.map((r) => (r.rowId === next.rowId ? next : r)) });
  };

  /** Accept a proposed value (dictionary or AI) for one cell: the
   *  row's value changes through the SAME mapping funnel as a manual
   *  edit, the cell is marked human-vouched, and the profile learns. */
  const acceptCellValue = (row: ImportRow, field: string, value: string) => {
    const strings: Record<string, string> = {};
    for (const def of fields) {
      const v = row.mapped[def.key];
      strings[def.key] = v === null || v === undefined ? '' : String(v);
    }
    strings[field] = value;
    const mapped = coerceEnumWords(batch.target, buildMappedFromFields(batch.target, strings));
    let judged = reanalyzeRow(batch.target, { ...row, mapped }, othersCtx(row.rowId));
    const cell = judged.cells?.[field];
    if (cell) {
      judged = {
        ...judged,
        cells: {
          ...judged.cells,
          [field]: { ...cell, text: value, confirmed: true, touched: true, proposal: undefined, llmProposal: undefined },
        },
      };
    }
    replaceRow(judged);
    onCellLearned?.(field, row.cells?.[field]?.text ?? '', value, false);
  };

  const acceptAllLlm = (row: ImportRow) => {
    if (!row.cells) return;
    let working = row;
    for (const [field, cell] of Object.entries(row.cells)) {
      if (cell.llmProposal && cell.llmProposal !== cell.text) {
        const strings: Record<string, string> = {};
        for (const def of fields) {
          const v = working.mapped[def.key];
          strings[def.key] = v === null || v === undefined ? '' : String(v);
        }
        strings[field] = cell.llmProposal;
        const mapped = coerceEnumWords(batch.target, buildMappedFromFields(batch.target, strings));
        let judged = reanalyzeRow(batch.target, { ...working, mapped }, othersCtx(row.rowId));
        const jc = judged.cells?.[field];
        if (jc) {
          judged = {
            ...judged,
            cells: {
              ...judged.cells,
              [field]: { ...jc, text: cell.llmProposal, confirmed: true, touched: true, proposal: undefined, llmProposal: undefined },
            },
          };
        }
        onCellLearned?.(field, cell.text, cell.llmProposal, false);
        working = judged;
      }
    }
    replaceRow(working);
  };

  const confirmCellHere = (row: ImportRow, field: string) => {
    const judged = confirmCell(row, field);
    replaceRow(judged);
    const cell = row.cells?.[field];
    if (cell) onCellLearned?.(field, cell.text, cell.text, true);
  };

  const runLlmRecheck = async () => {
    setLlmBusy(true);
    try {
      const updated = await applyLlmRecheck(batch.rows, batch.target, dictionaries || {});
      const count = updated.reduce(
        (n, r) => n + Object.values(r.cells || {}).filter((c) => c.llmProposal).length,
        0
      );
      if (updated !== batch.rows) onUpdate({ ...batch, rows: updated });
      showToast(count > 0 ? bk(lang, 'aiRecheckDone', { count }) : bk(lang, 'aiRecheckNone'), 'success');
    } finally {
      setLlmBusy(false);
    }
  };

  const runUndo = () => {
    if (!onUndo) return;
    const res = onUndo(batch);
    setUndoResult(res);
    setUndoArm(false);
    if (res && res.blocked.length === 0) {
      showToast(
        bk(lang, 'undoDone', {
          nandis: res.nandisRemoved, people: res.devoteesDeleted,
          totals: res.totalsRestored, reversals: res.reversalsWritten,
        }),
        'success'
      );
    } else {
      showToast(bk(lang, 'undoBlocked'), 'error');
    }
  };

  const photoUrlFor = async (b: ImportBatch, pageNo: number): Promise<string | null> => {
    const p = b.pagePhotoRefs.find((x) => x.pageNo === pageNo);
    if (!p) return null;
    return (await resolveVaultUrl(p.ref)) ?? null;
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
    // Red-cell gate: money and phone cells the machine flagged must
    // have been vouched by a human before any of this becomes real.
    const blockedRows = batch.rows.filter(
      (r) => r.approved && r.state === 'ok' && unconfirmedRedCells(r).length > 0
    );
    if (blockedRows.length > 0) {
      showToast(bk(lang, 'redGateNote'), 'error');
      return;
    }
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

  const openPhoto = async (ref: string, pageNo?: number) => {
    const url = await resolveVaultUrl(ref);
    if (url) {
      setPhotoUrl(url);
      setPhotoPage(pageNo ?? null);
      setShowWorking(false);
    }
  };

  const openCellPhoto = (row: ImportRow, cell: ScanCell) => {
    const ref = batch.pagePhotoRefs.find((p) => p.pageNo === row.pageNo);
    if (!ref) return;
    setHighlight({ pageNo: row.pageNo, cell });
    void openPhoto(ref.ref, row.pageNo);
  };

  const toggleWorkingPhoto = async () => {
    if (showWorking) { setShowWorking(false); return; }
    if (photoPage === null) return;
    const blob = await loadWorkingImage(batch.id, photoPage);
    if (blob) {
      if (workingUrl) URL.revokeObjectURL(workingUrl);
      setWorkingUrl(URL.createObjectURL(blob));
      setShowWorking(true);
    }
  };

  const CELL_CLS_STYLE: Record<ScanCell['cls'], string> = {
    green: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-400 bg-amber-50 text-amber-900',
    red: 'border-rose-400 bg-rose-50 text-rose-900',
  };

  /** Phase 2: per-cell confidence strip for scanned rows — colour is
   *  the machine's honesty; tapping a cell opens its reasons, any
   *  dictionary/AI proposals (diff-style), the vouch button, and the
   *  photo region it was read from. */
  const renderCells = (row: ImportRow) => {
    if (!row.cells) return null;
    const entries = Object.entries(row.cells);
    if (!entries.length) return null;
    const selField = selectedCell?.rowId === row.rowId ? selectedCell.field : null;
    const cell = selField ? row.cells[selField] : null;
    const dictProposal = cell && selField
      ? cell.proposal || bestProposal(cell.text, (dictionaries || {})[selField] || [], profile?.learnedPairs?.[selField])
      : null;
    const llmCount = entries.filter(([, c]) => c.llmProposal).length;
    return (
      <div className="mt-2 ml-1 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {entries.map(([field, c]) => (
            <button
              key={field}
              type="button"
              onClick={() => setSelectedCell(selField === field ? null : { rowId: row.rowId, field })}
              className={`min-h-[44px] px-2.5 py-1.5 rounded-lg border-2 text-[11px] font-bold ${CELL_CLS_STYLE[c.cls]} ${selField === field ? 'ring-2 ring-amber-500' : ''}`}
            >
              {c.cls === 'green' ? '🟢' : c.cls === 'amber' ? '🟡' : '🔴'} {fieldLabel(lang, field)}: {c.text || '—'}
              {c.confirmed ? ' ✓' : ''}
              {c.llmProposal ? ' ✨' : ''}
            </button>
          ))}
        </div>
        {llmCount > 0 && !readOnly && (
          <button
            type="button"
            onClick={() => acceptAllLlm(row)}
            className="min-h-[44px] px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-black"
          >
            {bk(lang, 'acceptRowFixes')}
          </button>
        )}
        {cell && selField && (
          <div className="rounded-xl border border-stone-300 bg-white p-3 space-y-2">
            <p className="text-sm font-black text-stone-800">
              {fieldLabel(lang, selField)} — “{cell.text}” · {Math.round(cell.confidence)}%
            </p>
            {cell.reasons.map((r, i) => (
              <p key={i} className="text-xs text-stone-500">• {r}</p>
            ))}
            {dictProposal && dictProposal !== cell.text && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-700">
                  {bk(lang, 'cellProposal', { to: dictProposal, from: cell.text })}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => acceptCellValue(row, selField, dictProposal)}
                    className="min-h-[44px] px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black"
                  >
                    {bk(lang, 'cellAcceptFix', { to: dictProposal })}
                  </button>
                )}
              </div>
            )}
            {cell.llmProposal && cell.llmProposal !== cell.text && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-violet-800">
                  ✨ {bk(lang, 'cellAiProposal', { to: cell.llmProposal, from: cell.text })}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => acceptCellValue(row, selField, cell.llmProposal!)}
                    className="min-h-[44px] px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-black"
                  >
                    {bk(lang, 'cellAcceptFix', { to: cell.llmProposal })}
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!cell.confirmed && !readOnly && (
                <button
                  type="button"
                  onClick={() => confirmCellHere(row, selField)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-black"
                >
                  {bk(lang, 'cellConfirm')}
                </button>
              )}
              <button
                type="button"
                onClick={() => openCellPhoto(row, cell)}
                className="min-h-[44px] px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-stone-700"
              >
                {bk(lang, 'showOnPhoto')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRow = (row: ImportRow) => (
    <div key={row.rowId}>
      <RowCard row={row} lang={lang} />
      {renderCells(row)}
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

      {hasCells && batch.state !== 'committed' && batch.state !== 'undone' && llmGate?.state === 'not-downloaded' && (
        <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 leading-relaxed">
          {bk(lang, 'aiNotDownloaded')}
        </p>
      )}
      {hasCells && batch.state !== 'committed' && batch.state !== 'undone' && llmGate?.state === 'ready' && !readOnly && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={llmBusy}
            onClick={runLlmRecheck}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black disabled:opacity-50"
          >
            {llmBusy ? bk(lang, 'aiRecheckRunning') : bk(lang, 'aiRecheck')}
          </button>
        </div>
      )}

      {batch.pagePhotoRefs.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-stone-700 mb-2">{bk(lang, 'pagePhotos')}</p>
          <div className="flex flex-wrap gap-2">
            {batch.pagePhotoRefs.map((p) => (
              <button
                key={p.pageNo}
                type="button"
                onClick={() => { setHighlight(null); void openPhoto(p.ref, p.pageNo); }}
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

      {(batch.state === 'committed' || batch.state === 'undone') && (
        <VerificationReport
          lang={lang}
          batch={batch}
          actor={actor}
          canSeal={canApprove}
          photoUrlFor={photoUrlFor}
          onSeal={(b) => onUpdate(b)}
        />
      )}

      {batch.state === 'undone' && (
        <p className="text-sm font-bold text-stone-600 bg-stone-100 border border-stone-300 rounded-xl px-3.5 py-2.5">
          ↩ {bk(lang, 'stateUndone')}
          {batch.undoneBy && <> · {batch.undoneBy.name}</>}
        </p>
      )}

      {batch.state === 'committed' && onUndo && canApprove && (
        <div className="bg-white border-2 border-rose-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="font-black text-stone-900">{bk(lang, 'undoBtn')}</h4>
          <p className="text-sm text-stone-600 leading-relaxed">{bk(lang, 'undoWarn')}</p>
          {!undoArm ? (
            <button
              type="button"
              onClick={() => setUndoArm(true)}
              className="min-h-[48px] px-4 py-2 rounded-xl bg-white border-2 border-rose-400 text-rose-700 text-sm font-black"
            >
              {bk(lang, 'undoBtn')}
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runUndo}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-black"
              >
                {bk(lang, 'undoBtn')} — ✓
              </button>
              <button
                type="button"
                onClick={() => setUndoArm(false)}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-stone-100 border border-stone-300 text-sm font-bold text-stone-700"
              >
                {bk(lang, 'cancelEdit')}
              </button>
            </div>
          )}
          {undoResult && (
            <div className="space-y-1.5">
              {undoResult.blocked.map((b, i) => (
                <p key={i} className="text-sm font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">⛔ {b}</p>
              ))}
              {undoResult.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">⚠ {w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {photoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPhotoUrl(null)}>
          <button type="button" className="absolute top-4 right-4 text-white min-h-[44px] min-w-[44px]" onClick={() => setPhotoUrl(null)}>
            <X className="w-7 h-7" />
          </button>
          {photoPage !== null && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void toggleWorkingPhoto(); }}
              className="absolute top-4 left-4 min-h-[44px] px-3 py-2 rounded-xl bg-white/90 text-stone-800 text-xs font-black"
            >
              {showWorking ? '📷 ' + bk(lang, 'pageWord') : '🔍 ' + bk(lang, 'machineSaw')}
            </button>
          )}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={showWorking && workingUrl ? workingUrl : photoUrl}
              alt="Register page"
              className="max-h-[90vh] max-w-full rounded-xl block"
            />
            {highlight && photoPage === highlight.pageNo && highlight.cell.bbox && (
              <div
                className="absolute border-[3px] border-amber-400 bg-amber-400/25 rounded pointer-events-none"
                style={{
                  left: `${highlight.cell.bbox.x0 * 100}%`,
                  top: `${highlight.cell.bbox.y0 * 100}%`,
                  width: `${Math.max(1, (highlight.cell.bbox.x1 - highlight.cell.bbox.x0) * 100)}%`,
                  height: `${Math.max(1, (highlight.cell.bbox.y1 - highlight.cell.bbox.y0) * 100)}%`,
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
