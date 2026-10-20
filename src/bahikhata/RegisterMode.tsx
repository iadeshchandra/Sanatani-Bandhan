import React, { useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, AlertTriangle, CopyX, Undo2, Send, BookOpen } from 'lucide-react';
import type { ImportBatch, ImportRow } from './types';
import { TARGET_FIELDS } from './types';
import { bk, fieldLabel, type BkLang } from './copy';
import { analyzeRow, reanalyzeRow, type AnalyzeContext, type ExistingNandiLike, type ExistingPerson } from './dedupe';
import { buildMappedFromFields, coerceEnumWords } from './mapping';
import { displayDigits } from './normalize';
import { uploadFile } from '../lib/fileVault';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Register Mode — the screen looks like the page. One row at a time   */
/* as a big card (never a spreadsheet grid); context fields stay       */
/* filled from the last row; pickers over typing; Bengali/Devanagari   */
/* digits normalized before storage; validation speaks warmly and      */
/* marks the row needs_fix instead of blocking the page.               */
/* ------------------------------------------------------------------ */

interface Props {
  batch: ImportBatch;
  lang: BkLang;
  existingMembers: ExistingPerson[];
  existingHerd: ExistingNandiLike[];
  picklists: { breeds: string[]; gotras: string[] };
  actorUid: string;
  onUpdate: (b: ImportBatch) => void;
  onSubmit: (b: ImportBatch) => void;
  onBack: () => void;
}

export const RegisterMode: React.FC<Props> = ({
  batch, lang, existingMembers, existingHerd, picklists, actorUid, onUpdate, onSubmit, onBack,
}) => {
  const { showToast } = useToast();
  const fields = TARGET_FIELDS[batch.target];
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const initialForm = useMemo(() => {
    const f: Record<string, string> = {};
    const last = batch.rows[batch.rows.length - 1];
    for (const def of fields) {
      if (def.persistent && last) f[def.key] = String(last.raw[def.key] ?? '');
      else f[def.key] = '';
    }
    if (batch.target === 'herd') {
      if (!f.sex) f.sex = 'cow';
      if (!f.source) f.source = 'donated';
    }
    return f;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.id]);
  const [form, setForm] = useState<Record<string, string>>(initialForm);

  const ctxFor = (rows: ImportRow[]): AnalyzeContext => ({
    existingMembers, existingHerd, priorRows: rows,
  });

  const pageRows = batch.rows.filter((r) => r.pageNo === batch.currentPage);
  const pageCount = useMemo(
    () => new Set(batch.rows.map((r) => r.pageNo)).size,
    [batch.rows]
  );

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const resetFormAfterAdd = (kept: Record<string, string>) => {
    const next: Record<string, string> = {};
    for (const def of fields) next[def.key] = def.persistent ? kept[def.key] || '' : '';
    if (batch.target === 'herd') {
      next.sex = kept.sex || 'cow';
      next.source = kept.source || 'donated';
    }
    setForm(next);
  };

  const handleAddOrSave = () => {
    const raw = { ...form };
    const mapped = coerceEnumWords(batch.target, buildMappedFromFields(batch.target, raw));
    if (editingRowId) {
      const idx = batch.rows.findIndex((r) => r.rowId === editingRowId);
      if (idx >= 0) {
        const others = batch.rows.filter((r) => r.rowId !== editingRowId);
        const judged = reanalyzeRow(
          batch.target,
          { ...batch.rows[idx], raw, mapped },
          ctxFor(others)
        );
        const rows = [...batch.rows];
        rows[idx] = judged;
        onUpdate({ ...batch, rows });
      }
      setEditingRowId(null);
      resetFormAfterAdd(raw);
      return;
    }
    const a = analyzeRow(batch.target, mapped, ctxFor(batch.rows));
    const row: ImportRow = {
      rowId: `row_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      pageNo: batch.currentPage,
      raw,
      mapped: a.mapped,
      state: a.state,
      issues: a.issues,
      defaultedFields: a.defaultedFields,
      approved: a.state === 'ok',
    };
    onUpdate({ ...batch, rows: [...batch.rows, row] });
    showToast(bk(lang, 'rowAdded'), 'success');
    resetFormAfterAdd(raw);
  };

  const handleEditRow = (row: ImportRow) => {
    setForm({ ...row.raw });
    setEditingRowId(row.rowId);
    if (row.pageNo !== batch.currentPage) onUpdate({ ...batch, currentPage: row.pageNo });
  };

  const toggleExclude = (row: ImportRow) => {
    const rows = batch.rows.map((r) => {
      if (r.rowId !== row.rowId) return r;
      if (r.state === 'excluded') {
        const others = batch.rows.filter((x) => x.rowId !== row.rowId);
        return reanalyzeRow(batch.target, { ...r, state: 'ok' as const }, ctxFor(others));
      }
      return { ...r, state: 'excluded' as const, approved: false };
    });
    onUpdate({ ...batch, rows });
  };

  const undoLast = () => {
    if (!batch.rows.length) return;
    onUpdate({ ...batch, rows: batch.rows.slice(0, -1) });
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !actorUid) return;
    setPhotoBusy(true);
    try {
      const res = await uploadFile(file, {
        visibility: 'private',
        category: 'document',
        ownerUid: actorUid,
        fileName: file.name,
      });
      onUpdate({
        ...batch,
        pagePhotoRefs: [
          ...batch.pagePhotoRefs.filter((p) => p.pageNo !== batch.currentPage),
          { pageNo: batch.currentPage, ref: res.url, fileName: file.name },
        ],
      });
      showToast(bk(lang, 'photoAttached'), 'success');
    } catch {
      showToast(bk(lang, 'photoFailed'), 'warning');
    } finally {
      setPhotoBusy(false);
    }
  };

  const pagePhoto = batch.pagePhotoRefs.find((p) => p.pageNo === batch.currentPage);
  const persistentDefs = fields.filter((f) => f.persistent);

  const inputCls =
    'w-full min-h-[48px] rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <div className="space-y-4">
      {/* Header: provenance + running counts */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3">
        <button type="button" onClick={onBack} className="text-sm font-bold text-amber-800 min-h-[44px]">
          {bk(lang, 'backBtn')}
        </button>
        <label className="block">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{bk(lang, 'batchLabel')}</span>
          <input
            className={inputCls}
            value={batch.label}
            onChange={(e) => onUpdate({ ...batch, label: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 font-bold">
            📖 {bk(lang, 'pageWord')} {displayDigits(batch.currentPage, lang)}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 font-semibold">
            {displayDigits(batch.rows.length, lang)} {bk(lang, 'rowsWord')} · {displayDigits(Math.max(pageCount, 1), lang)} {bk(lang, 'pageWord').toLowerCase()}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 font-semibold">
            {bk(lang, 'pageWord')} {displayDigits(batch.currentPage, lang)}: {displayDigits(pageRows.length, lang)}
          </span>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={photoBusy}
            className="px-3 py-1.5 rounded-full bg-emerald-600 text-white font-bold min-h-[44px] disabled:opacity-50"
          >
            <Camera className="w-4 h-4 inline mr-1" />
            {pagePhoto ? `✓ ${bk(lang, 'photoAttached')}` : bk(lang, 'attachPhoto')}
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        </div>
        <p className="text-xs text-stone-500">{bk(lang, 'draftSaved')}</p>
        {batch.state === 'rejected' && batch.rejectReason && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-800">
            <strong>{bk(lang, 'rejectedBanner')}</strong> {batch.rejectReason}
          </div>
        )}
      </div>

      {/* Persistent-fields strip */}
      {persistentDefs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 text-sm text-amber-900 flex flex-wrap gap-x-3 gap-y-1 items-center">
          <span className="font-bold">{bk(lang, 'sameForNext')}</span>
          {persistentDefs.map((d) => (
            <span key={d.key} className="px-2 py-0.5 rounded-lg bg-white border border-amber-200">
              {fieldLabel(lang, d.key)}: <strong>{form[d.key] || '—'}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Entry card — one row, like one line of the page */}
      <div className="bg-white border-2 border-amber-300 rounded-2xl p-4 shadow space-y-3">
        {fields.map((def) => {
          const label = fieldLabel(lang, def.key);
          if (def.kind === 'enum') {
            return (
              <div key={def.key}>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                  {label}{def.required ? ' *' : ` (${bk(lang, 'optional')})`}
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {def.options!.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setField(def.key, o.value)}
                      className={`min-h-[48px] px-4 py-2 rounded-xl border-2 font-bold text-sm transition ${
                        form[def.key] === o.value
                          ? 'bg-amber-600 border-amber-700 text-white'
                          : 'bg-white border-stone-300 text-stone-700'
                      }`}
                    >
                      {o[lang]}
                    </button>
                  ))}
                </div>
              </div>
            );
          }
          const listId = def.picklistFrom ? `bk-list-${def.picklistFrom}` : undefined;
          return (
            <label key={def.key} className="block">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                {label}{def.required ? ' *' : ` (${bk(lang, 'optional')})`}
              </span>
              <input
                className={inputCls}
                value={form[def.key] || ''}
                list={listId}
                inputMode={
                  def.kind === 'phone' ? 'tel'
                  : def.kind === 'number' || def.kind === 'amount' || def.kind === 'year' ? 'numeric'
                  : def.kind === 'date' ? undefined
                  : 'text'
                }
                type={def.kind === 'date' ? 'date' : 'text'}
                placeholder={def.kind === 'date' ? 'dd/mm/yyyy' : undefined}
                onChange={(e) => setField(def.key, e.target.value)}
              />
              {def.picklistFrom === 'breeds' && (
                <datalist id="bk-list-breeds">{picklists.breeds.map((b) => <option key={b} value={b} />)}</datalist>
              )}
              {def.picklistFrom === 'gotras' && (
                <datalist id="bk-list-gotras">{picklists.gotras.map((g) => <option key={g} value={g} />)}</datalist>
              )}
            </label>
          );
        })}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={handleAddOrSave}
            className="flex-1 min-h-[52px] px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-base shadow transition"
          >
            {editingRowId ? bk(lang, 'updateRow') : bk(lang, 'addRow')}
          </button>
          {editingRowId && (
            <button
              type="button"
              onClick={() => { setEditingRowId(null); resetFormAfterAdd(form); }}
              className="min-h-[52px] px-4 py-3 rounded-xl bg-stone-100 border border-stone-300 font-bold text-stone-700"
            >
              {bk(lang, 'cancelEdit')}
            </button>
          )}
          <button
            type="button"
            onClick={undoLast}
            disabled={!batch.rows.length}
            className="min-h-[52px] px-4 py-3 rounded-xl bg-white border border-stone-300 font-bold text-stone-600 disabled:opacity-40"
          >
            <Undo2 className="w-4 h-4 inline mr-1" />{bk(lang, 'undoLast')}
          </button>
        </div>
      </div>

      {/* This page's rows */}
      {pageRows.length > 0 && (
        <div className="space-y-2">
          {pageRows.map((row) => (
            <RowCard
              key={row.rowId}
              row={row}
              lang={lang}
              onEdit={() => handleEditRow(row)}
              onToggleExclude={() => toggleExclude(row)}
            />
          ))}
        </div>
      )}

      {/* Page done + submit */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onUpdate({ ...batch, currentPage: batch.currentPage + 1 })}
          className="min-h-[52px] px-5 py-3 rounded-xl bg-white border-2 border-amber-400 text-amber-900 font-black"
        >
          <BookOpen className="w-4 h-4 inline mr-1" />{bk(lang, 'pageDone')}
        </button>
        <button
          type="button"
          onClick={() => onSubmit(batch)}
          disabled={batch.rows.length === 0}
          className="flex-1 min-h-[52px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black disabled:opacity-40 shadow"
        >
          <Send className="w-4 h-4 inline mr-1" />{bk(lang, 'submitForReview')}
        </button>
      </div>
    </div>
  );
};

export const RowCard: React.FC<{
  row: ImportRow;
  lang: BkLang;
  onEdit?: () => void;
  onToggleExclude?: () => void;
}> = ({ row, lang, onEdit, onToggleExclude }) => {
  const m = row.mapped;
  const title = m.fullName || m.name || '—';
  const detail = [
    m.tagId ? `🏷 ${m.tagId}` : '',
    m.breed || '',
    m.phone ? `📞 ${displayDigits(m.phone, lang)}` : '',
    m.gotra || '',
    typeof m.lifetimeDonated === 'number' && m.lifetimeDonated > 0 ? `🪔 ${displayDigits(m.lifetimeDonated, lang)}` : '',
    typeof m.donationAmount === 'number' && m.donationAmount > 0 ? `🎁 ${displayDigits(m.donationAmount, lang)}` : '',
  ].filter(Boolean).join(' · ');
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        row.state === 'excluded' ? 'bg-stone-50 border-stone-200 opacity-60'
        : row.state === 'duplicate' ? 'bg-rose-50 border-rose-200'
        : row.state === 'needs_fix' ? 'bg-amber-50 border-amber-300'
        : 'bg-white border-stone-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-stone-900 truncate">{title}</p>
          {detail && <p className="text-xs text-stone-500">{detail}</p>}
        </div>
        <span className="shrink-0">
          {row.state === 'ok' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          {row.state === 'needs_fix' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
          {row.state === 'duplicate' && <CopyX className="w-5 h-5 text-rose-500" />}
          {row.state === 'excluded' && <CopyX className="w-5 h-5 text-stone-400" />}
        </span>
      </div>
      {row.issues.map((iss, i) => (
        <p key={i} className="text-xs text-stone-600 mt-1">• {iss}</p>
      ))}
      {row.defaultedFields.length > 0 && (
        <p className="text-[11px] text-amber-700 mt-1">
          ⚠ {row.defaultedFields.map((f) => fieldLabel(lang, f)).join(', ')} — {lang === 'bn' ? 'সিস্টেম পূরণ করেছে' : lang === 'hi' ? 'सिस्टम ने भरा' : 'filled by the system'}
        </p>
      )}
      {(onEdit || onToggleExclude) && (
        <div className="flex gap-2 mt-2">
          {onEdit && (
            <button type="button" onClick={onEdit} className="min-h-[44px] px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-stone-700">
              {bk(lang, 'editRow')}
            </button>
          )}
          {onToggleExclude && (
            <button type="button" onClick={onToggleExclude} className="min-h-[44px] px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-stone-700">
              {row.state === 'excluded' ? bk(lang, 'includeRow') : bk(lang, 'excludeRow')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
