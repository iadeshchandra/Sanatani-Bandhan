import React, { useMemo, useRef, useState } from 'react';
import { BookOpen, Camera, CheckCircle2 } from 'lucide-react';
import type {
  BahiTarget, BatchActor, ColumnRegion, ImportBatch, RegisterProfile,
} from '../types';
import { TARGET_FIELDS } from '../types';
import { bk, fieldLabel, type BkLang } from '../copy';
import { createBatch } from '../bahikhataStore';
import type { AnalyzeContext } from '../dedupe';
import { uploadFile } from '../../lib/fileVault';
import { useToast } from '../../context/ToastContext';
import { PageCapture } from './PageCapture';
import {
  blobToImage, canvasGray, canvasToBlob, evidenceBlob, imageToCanvas,
  rowDarkness, bandBoundaries, toWorkingCanvas,
} from './preprocess';
import { saveWorkingImage } from './capture';
import { getOcrEngine } from './ocrEngine';
import { downloadPack, packSizeLabel, packStatus, removePack, type PackProgress } from './packDownload';
import { applyBand, createBandStream, rowsForPage, type BandStream, type OcrLine } from './scanRows';
import { clusterWordColumns, makeProfile } from './registerProfile';
import { applyLlmRecheck } from './llmRecheck';
import { displayDigits, parseAmount } from '../normalize';

/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — the scan door.                            */
/*                                                                     */
/* Order of operations is the trust design, not an accident:           */
/*  1. the page photo is saved to the File Vault FIRST (tenant-        */
/*     scoped, never public) — the paper is safe before any reading;   */
/*  2. the page reads in bands that stream into view;                  */
/*  3. rows land in a Phase 1 DRAFT batch — the two-key law is         */
/*     untouched: entry wide, commit only by the approver;             */
/*  4. if the on-device AI model happens to live on this phone, a      */
/*     re-check adds suggestions — the flow completes identically      */
/*     on phones where it does not.                                    */
/* ------------------------------------------------------------------ */

interface Props {
  lang: BkLang;
  workspaceId: string;
  actor: BatchActor;
  target: BahiTarget;
  batches: ImportBatch[];
  profiles: RegisterProfile[];
  existingMembers: AnalyzeContext['existingMembers'];
  existingHerd: AnalyzeContext['existingHerd'];
  dictionaries: Record<string, string[]>;
  onAddBatch: (b: ImportBatch) => void;
  onUpdateBatch: (b: ImportBatch) => void;
  onAddProfile: (p: RegisterProfile) => void;
  onOpenReview: (batchId: string) => void;
  onBack: () => void;
}

type Step = 'checking' | 'pack' | 'setup' | 'capture' | 'reading' | 'mapping' | 'pageDone';

/** Title lines are much taller than entry lines and sit at the very
 *  top — drop one so the book's name never becomes a fake row. */
function dropTitleLine(lines: OcrLine[], imgH: number): OcrLine[] {
  if (lines.length < 3) return lines;
  const heights = lines.map((l) => l.bbox.y1 - l.bbox.y0).sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length / 2)] || 0;
  const first = lines[0];
  if (median > 0 && first.bbox.y1 - first.bbox.y0 > 2 * median && first.bbox.y0 < imgH * 0.12) {
    return lines.slice(1);
  }
  return lines;
}

export const ScanImport: React.FC<Props> = (props) => {
  const {
    lang, workspaceId, actor, target, batches, profiles,
    existingMembers, existingHerd, dictionaries,
    onAddBatch, onUpdateBatch, onAddProfile, onOpenReview, onBack,
  } = props;
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('checking');
  const [packBusy, setPackBusy] = useState(false);
  const [packProgress, setPackProgress] = useState<PackProgress | null>(null);
  const [batchId, setBatchId] = useState<string>('');
  const [profileChoice, setProfileChoice] = useState<string>('new');
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState<BandStream | null>(null);
  const [pageTotal, setPageTotal] = useState('');
  const [lastAdded, setLastAdded] = useState(0);

  // Page-in-flight data (not in the batch until rows materialize).
  const pending = useRef<{
    lines: OcrLine[]; imgW: number; imgH: number; pageNo: number;
    candidates: ColumnRegion[]; samples: string[];
  } | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [profileName, setProfileName] = useState('');

  const draftBatches = useMemo(
    () => batches.filter((b) => b.target === target && b.state === 'draft'),
    [batches, target]
  );
  const targetProfiles = useMemo(
    () => profiles.filter((p) => p.target === target),
    [profiles, target]
  );
  const batch = batches.find((b) => b.id === batchId);
  // 'new' is an explicit choice (map a fresh book) — it must win over
  // any profile the batch already carries.
  const profile = profileChoice === 'new'
    ? undefined
    : targetProfiles.find((p) => p.id === profileChoice);

  React.useEffect(() => {
    let alive = true;
    void packStatus().then((s) => {
      if (alive) setStep(s === 'ready' ? 'setup' : 'pack');
    });
    return () => { alive = false; };
  }, []);

  const handleDownloadPack = async () => {
    setPackBusy(true);
    try {
      const s = await downloadPack(setPackProgress);
      if (s === 'ready') setStep('setup');
      else showToast(bk(lang, 'packFailed'), 'error');
    } catch {
      showToast(bk(lang, 'packFailed'), 'error');
    } finally {
      setPackBusy(false);
      setPackProgress(null);
    }
  };

  const startNewBatch = () => {
    const labelDefault =
      target === 'herd' ? 'Gai khata (scan) — ' : target === 'donors' ? 'Dan khata (scan) — ' : 'Sadasya khata (scan) — ';
    const b = createBatch({
      workspaceId,
      target,
      source: 'photo',
      label: labelDefault + new Date().toISOString().slice(0, 10),
      enteredBy: actor,
    });
    onAddBatch(b);
    setBatchId(b.id);
    return b;
  };

  const finishPage = async (
    current: ImportBatch,
    lines: OcrLine[],
    imgW: number,
    imgH: number,
    pageNo: number,
    prof: RegisterProfile | null
  ) => {
    const rows = rowsForPage({
      target, lines, profile: prof, imgW, imgH, pageNo, dictionaries,
      base: { existingMembers, existingHerd },
      idPrefix: `scan_${current.id}_p${pageNo}`,
    });
    // Re-scanning a page replaces that page's earlier MACHINE rows;
    // typed rows (no cells) are never touched by a rescan.
    const kept = current.rows.filter((r) => !(r.pageNo === pageNo && r.cells));
    const next: ImportBatch = {
      ...current,
      rows: [...kept, ...rows],
      currentPage: pageNo,
      ...(prof ? { profileId: prof.id } : {}),
    };
    if (target === 'donors' && pageTotal.trim()) {
      const amt = parseAmount(pageTotal);
      if (amt !== null && amt > 0) {
        next.pageTotals = { ...(next.pageTotals || {}), [pageNo]: amt };
      }
    }
    onUpdateBatch(next);
    setBatchId(next.id);
    setLastAdded(rows.length);
    setPageTotal('');
    setStep('pageDone');
    showToast(bk(lang, 'scanRowsAdded', { count: rows.length, page: pageNo }), 'success');

    // AI re-check: only when the model already lives on this phone.
    // Fire-and-forget — proposals merge into the draft when they land.
    void applyLlmRecheck(rows, target, dictionaries).then((updated) => {
      if (updated === rows) return;
      const byId = new Map(updated.map((r) => [r.rowId, r]));
      onUpdateBatch({
        ...next,
        rows: next.rows.map((r) => byId.get(r.rowId) || r),
      });
    });
  };

  const handleAcceptPhoto = async (file: File) => {
    const current = batch || startNewBatch();
    const pageNo = current.currentPage || 1;
    setBusy(true);
    try {
      const img = await blobToImage(file);
      const canvas = imageToCanvas(img, 2000);

      // 1) EVIDENCE FIRST — the page is safe before anything reads it.
      const evidence = await evidenceBlob(canvas);
      const up = await uploadFile(evidence, {
        visibility: 'crisis',
        category: 'document',
        ownerUid: actor.uid,
        tenantId: workspaceId,
        fileName: file.name || `page-${pageNo}.jpg`,
      });
      const withPhoto: ImportBatch = {
        ...current,
        pagePhotoRefs: [
          ...current.pagePhotoRefs.filter((p) => p.pageNo !== pageNo),
          { pageNo, ref: up.url, fileName: file.name },
        ],
      };
      onUpdateBatch(withPhoto);
      setBatchId(withPhoto.id);
      showToast(bk(lang, 'captureSavedFirst'), 'success');

      // 2) Working image (device-only) + bands.
      const working = toWorkingCanvas(canvas);
      await saveWorkingImage(withPhoto.id, pageNo, await canvasToBlob(working));
      const gray = canvasGray(working);
      const darkness = rowDarkness(gray, working.width, working.height);
      const cuts = bandBoundaries(darkness, Math.max(320, Math.round(working.height / 6)), 140);
      const bands: { y0: number; y1: number }[] = [];
      for (let i = 0; i + 1 < cuts.length; i++) bands.push({ y0: cuts[i], y1: cuts[i + 1] });

      // 3) Read, streaming.
      setStream(createBandStream(bands.length));
      setStep('reading');
      const engine = getOcrEngine();
      const rawLines = await engine.readPage(working, bands, (b) =>
        setStream((s) => (s ? applyBand(s, b) : s))
      );
      const lines = dropTitleLine(rawLines, working.height);

      // 4a) First page of a new book → teach the columns once.
      const prof = profile || null;
      if (!prof) {
        const words = lines.flatMap((l) => l.words);
        const candidates = clusterWordColumns(words, working.width, working.height);
        const samples = candidates.map((c) => {
          const inside = words.filter((w) => {
            const cx = working.width ? (w.bbox.x0 + w.bbox.x1) / 2 / working.width : 0;
            return cx >= c.x0 && cx < c.x1;
          });
          return inside.slice(0, 5).map((w) => w.text).join(' ');
        });
        pending.current = { lines, imgW: working.width, imgH: working.height, pageNo, candidates, samples };
        setAssignments({});
        setStep('mapping');
        return;
      }
      // 4b) Known book → rows straight into the draft.
      await finishPage(withPhoto, lines, working.width, working.height, pageNo, prof);
    } catch {
      showToast(bk(lang, 'readingFailed'), 'error');
      setStep('capture');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async () => {
    const p = pending.current;
    if (!p || !batch) return;
    const columns = p.candidates.map((c, i) => ({ ...c, field: assignments[i] || '' }));
    if (!columns.some((c) => c.field)) {
      showToast(bk(lang, 'mapColumnsIntro'), 'warning');
      return;
    }
    const prof = makeProfile({
      workspaceId,
      target,
      label: profileName.trim() || batch.label,
      script: 'mixed',
      columns,
      writerStyle: 'print',
    });
    onAddProfile(prof);
    setProfileChoice(prof.id);
    await finishPage(batch, p.lines, p.imgW, p.imgH, p.pageNo, prof);
    pending.current = null;
    showToast(bk(lang, 'profileSaved'), 'success');
  };

  /* ------------------------------ render ----------------------------- */

  if (step === 'checking') {
    return <p className="text-sm text-stone-500 py-6">…</p>;
  }

  if (step === 'pack') {
    return (
      <div className="space-y-4">
        <button type="button" onClick={onBack} className="text-sm font-bold text-amber-800 min-h-[44px]">{bk(lang, 'backBtn')}</button>
        <div className="bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="font-black text-lg text-stone-900">📷 {bk(lang, 'packTitle')}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{bk(lang, 'scanIntro')}</p>
          <p className="text-sm text-stone-600 leading-relaxed">{bk(lang, 'packIntro', { size: packSizeLabel() })}</p>
          <button
            type="button"
            disabled={packBusy}
            onClick={handleDownloadPack}
            className="w-full min-h-[56px] px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black disabled:opacity-50"
          >
            {packBusy && packProgress
              ? bk(lang, 'packDownloading', { done: packProgress.doneFiles, total: packProgress.totalFiles })
              : bk(lang, 'packDownload')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-bold text-amber-800 min-h-[44px]">{bk(lang, 'backBtn')}</button>

      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-2">
        <h3 className="font-black text-stone-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-700" /> {bk(lang, 'modePhoto')}
        </h3>
        <p className="text-sm text-stone-600 leading-relaxed">{bk(lang, 'scanIntro')}</p>
        <p className="text-xs font-bold text-emerald-700">{bk(lang, 'packReady')}</p>
        <button type="button" onClick={() => { void removePack(); setStep('pack'); }} className="text-xs font-bold text-stone-500 underline min-h-[44px]">
          {bk(lang, 'packRemove')}
        </button>
      </div>

      {step === 'setup' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">{bk(lang, 'scanPickBatch')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { const b = startNewBatch(); setBatchId(b.id); setStep('capture'); }}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-amber-600 text-white font-black text-sm"
              >
                {bk(lang, 'scanNewBatch')}
              </button>
              {draftBatches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { setBatchId(b.id); if (b.profileId) setProfileChoice(b.profileId); setStep('capture'); }}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-white border-2 border-stone-300 font-bold text-sm text-stone-700"
                >
                  {b.label} · {b.rows.length} {bk(lang, 'rowsWord')}
                </button>
              ))}
            </div>
          </div>
          {targetProfiles.length > 0 && (
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">{bk(lang, 'scanSameBook')}</p>
              <div className="flex flex-wrap gap-2">
                {targetProfiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfileChoice(p.id)}
                    className={`min-h-[48px] px-4 py-2 rounded-xl border-2 font-bold text-sm ${
                      profileChoice === p.id ? 'bg-amber-600 border-amber-700 text-white' : 'bg-white border-stone-300 text-stone-700'
                    }`}
                  >
                    📖 {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setProfileChoice('new')}
                  className={`min-h-[48px] px-4 py-2 rounded-xl border-2 font-bold text-sm ${
                    profileChoice === 'new' ? 'bg-amber-600 border-amber-700 text-white' : 'bg-white border-stone-300 text-stone-700'
                  }`}
                >
                  {bk(lang, 'scanNewProfile')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'capture' && batch && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3">
          {batch.rows.length > 0 && (
            <p className="text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
              {bk(lang, 'resumeLine', { page: batch.currentPage || 1 })}
            </p>
          )}
          <PageCapture lang={lang} pageNo={batch.currentPage || 1} busy={busy} onAccept={handleAcceptPhoto} />
          {target === 'donors' && (
            <label className="block">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{bk(lang, 'pageTotalLabel')}</span>
              <input
                className="w-full min-h-[48px] rounded-xl border border-stone-300 px-3 py-2 mt-1"
                inputMode="numeric"
                value={pageTotal}
                onChange={(e) => setPageTotal(e.target.value)}
                placeholder="0"
              />
              <span className="text-xs text-stone-500">{bk(lang, 'pageTotalHint')}</span>
            </label>
          )}
        </div>
      )}

      {step === 'reading' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
          <p className="font-black text-stone-900">
            {stream
              ? bk(lang, 'readingBand', { done: stream.doneBands, total: stream.totalBands })
              : '…'}
          </p>
          <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: stream ? `${Math.round((stream.doneBands / Math.max(1, stream.totalBands)) * 100)}%` : '0%' }}
            />
          </div>
          {stream && stream.lines.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-auto">
              {stream.lines.slice(0, 30).map((l, i) => (
                <p key={i} className="text-xs text-stone-600 font-mono truncate">
                  {l.words.map((w) => w.text).join(' ')}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'mapping' && pending.current && (
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="font-black text-stone-900">{bk(lang, 'mapColumnsTitle')}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{bk(lang, 'mapColumnsIntro')}</p>
          <label className="block">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{bk(lang, 'scanProfileName')}</span>
            <input
              className="w-full min-h-[48px] rounded-xl border border-stone-300 px-3 py-2 mt-1"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder={batch?.label || ''}
            />
          </label>
          {pending.current.candidates.map((c, i) => (
            <div key={i} className="rounded-xl border border-stone-200 p-3 space-y-2">
              <p className="text-sm font-bold text-stone-700">
                {bk(lang, 'mapColumnPrompt', { n: i + 1, sample: pending.current!.samples[i] || '—' })}
              </p>
              <div className="flex flex-wrap gap-2">
                {TARGET_FIELDS[target].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setAssignments((a) => ({ ...a, [i]: f.key }))}
                    className={`min-h-[44px] px-3 py-1.5 rounded-xl border-2 text-xs font-bold ${
                      assignments[i] === f.key ? 'bg-amber-600 border-amber-700 text-white' : 'bg-white border-stone-300 text-stone-700'
                    }`}
                  >
                    {fieldLabel(lang, f.key)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAssignments((a) => ({ ...a, [i]: '' }))}
                  className={`min-h-[44px] px-3 py-1.5 rounded-xl border-2 text-xs font-bold ${
                    assignments[i] === '' ? 'bg-stone-700 border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-500'
                  }`}
                >
                  {bk(lang, 'mapColumnSkip')}
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={handleSaveProfile}
            className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black disabled:opacity-50"
          >
            ✓ {bk(lang, 'profileSaved')}
          </button>
        </div>
      )}

      {step === 'pageDone' && batch && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
          <p className="font-black text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {bk(lang, 'scanRowsAdded', { count: displayDigits(lastAdded, lang), page: displayDigits(batch.currentPage || 1, lang) })}
          </p>
          <p className="text-sm text-stone-600">
            {displayDigits(batch.rows.length, lang)} {bk(lang, 'rowsWord')} · 📷 {displayDigits(batch.pagePhotoRefs.length, lang)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { onUpdateBatch({ ...batch, currentPage: (batch.currentPage || 1) + 1 }); setStep('capture'); }}
              className="flex-1 min-h-[52px] px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black"
            >
              <Camera className="w-4 h-4 inline mr-1" />{bk(lang, 'scanNextPage')}
            </button>
            <button
              type="button"
              onClick={() => onOpenReview(batch.id)}
              className="flex-1 min-h-[52px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black"
            >
              {bk(lang, 'scanDone')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
