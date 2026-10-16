/**
 * VerificationApplicationForm — "Share your sacred credentials".
 * =================================================================
 * Professional-facing Pratham Seva application: a warm document-upload
 * checklist with a progress indicator. govt ID, photo, tradition/parampara
 * details, work samples, optional temple endorsement.
 *
 * Wiring: the parent supplies
 *   - `submit(documents)` → persists the checklist payload (the caller
 *     merges it into their purohitApplications / jyotishApplications doc
 *     via their existing submitApplication).
 *   - `uploadFile(file)` → uploads to Firebase Storage and resolves the
 *     public/download URL. Kept as a prop so storage policy stays with the
 *     caller (Storage rules are pasted by the owner in the console).
 *   - `existing` → a previously submitted PENDING/REJECTED application to
 *     resume or to show the gentle pending/rejected state.
 *
 * Mobile-first, all targets ≥ 44px, trilingual EN/BN/HI.
 */
import React, { useMemo, useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, Clock3, HeartHandshake, ChevronRight } from 'lucide-react';
import { sevaProCopy, type SevaProLang } from '../../lib/sevaPro/sevaProCopy';

export type ChecklistKey = 'govtId' | 'photo' | 'tradition' | 'samples' | 'endorsement';

export interface ChecklistDocuments {
  govtId?: string;
  photo?: string;
  tradition?: string;
  samples?: string[];
  endorsement?: string;
  traditionNote?: string;
}

interface Props {
  /** Persist the checklist payload; resolve when the application doc is written. */
  submit: (documents: ChecklistDocuments) => Promise<void>;
  /** Upload one file; resolve the URL to store. */
  uploadFile: (file: File) => Promise<string>;
  /** Previously submitted application (for resume / status display). */
  existing?: { status: 'PENDING' | 'APPROVED' | 'REJECTED'; rejectionReason?: string } | null;
  initial?: ChecklistDocuments;
}

const STEPS: Array<{ key: ChecklistKey; copyKey: string; hintKey: string; required: boolean; multiple?: boolean; note?: boolean }> = [
  { key: 'govtId', copyKey: 'docGovtId', hintKey: 'docGovtIdHint', required: true },
  { key: 'photo', copyKey: 'docPhoto', hintKey: 'docPhotoHint', required: true },
  { key: 'tradition', copyKey: 'docTradition', hintKey: 'docTraditionHint', required: true, note: true },
  { key: 'samples', copyKey: 'docSamples', hintKey: 'docSamplesHint', required: false, multiple: true },
  { key: 'endorsement', copyKey: 'docEndorsement', hintKey: 'docEndorsementHint', required: false },
];

export const VerificationApplicationForm: React.FC<Props> = ({ submit, uploadFile, existing, initial }) => {
  const [lang, setLang] = useState<SevaProLang>('en');
  const [docs, setDocs] = useState<ChecklistDocuments>(initial || {});
  const [uploading, setUploading] = useState<ChecklistKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<ChecklistKey | null>(null);

  const doneCount = useMemo(
    () => STEPS.filter((s) => {
      const v = docs[s.key];
      if (s.note) return !!(docs.traditionNote && docs.traditionNote.trim());
      if (s.multiple) return Array.isArray(v) && v.length > 0;
      return !!v;
    }).length,
    [docs]
  );
  const requiredDone = STEPS.filter((s) => s.required).every((s) =>
    s.note ? !!(docs.traditionNote && docs.traditionNote.trim()) : !!docs[s.key]
  );
  const pct = Math.round((doneCount / STEPS.length) * 100);

  const pick = (key: ChecklistKey) => {
    setTarget(key);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !target) return;
    setUploading(target);
    try {
      const url = await uploadFile(file);
      setDocs((d) => {
        const step = STEPS.find((s) => s.key === target);
        if (step?.multiple) {
          const arr = Array.isArray(d[target]) ? [...(d[target] as string[])] : [];
          arr.push(url);
          return { ...d, [target]: arr };
        }
        return { ...d, [target]: url };
      });
    } catch (err: any) {
      alert(err?.message || 'Upload failed. Please try again.');
    }
    setUploading(null);
    setTarget(null);
  };

  const onSubmit = async () => {
    if (!requiredDone || submitting) return;
    setSubmitting(true);
    try {
      await submit(docs);
      setDone(true);
    } catch (err: any) {
      alert(err?.message || 'Could not submit. Please try again.');
    }
    setSubmitting(false);
  };

  const t = (key: Parameters<typeof sevaProCopy>[1], vars?: Record<string, string | number>) =>
    sevaProCopy(lang, key, vars);

  if (done || existing?.status === 'PENDING') {
    return (
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
        <p className="text-4xl mb-3">🙏</p>
        <h2 className="text-base font-black text-slate-100">{t('applicationSubmitted')}</h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{t('applicationPending')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Language + heading */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(['en', 'bn', 'hi'] as SevaProLang[]).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)}
              className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-black uppercase ${lang === l ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
              {l === 'en' ? 'EN' : l === 'bn' ? 'বাং' : 'हिं'}
            </button>
          ))}
        </div>
        {existing?.status === 'REJECTED' && (
          <span className="text-[11px] text-slate-400">Previously reviewed — you may offer again</span>
        )}
      </div>

      <div className="text-center px-2">
        <p className="text-3xl mb-2">🪔</p>
        <h2 className="text-lg font-black text-slate-100">{t('applyHeading')}</h2>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-md mx-auto">{t('applyIntro')}</p>
        {existing?.status === 'REJECTED' && existing.rejectionReason && (
          <p className="text-xs text-amber-300/90 mt-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-left">
            {t('applicationRejected')} “{existing.rejectionReason}”
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black text-slate-300">{t('progressLabel', { done: doneCount, total: STEPS.length })}</p>
          <p className="text-xs font-black text-amber-400">{pct}%</p>
        </div>
        <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Checklist */}
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={onFile} aria-hidden />
      <div className="space-y-3">
        {STEPS.map((s, i) => {
          const isDone = s.note
            ? !!(docs.traditionNote && docs.traditionNote.trim())
            : s.multiple
              ? Array.isArray(docs[s.key]) && (docs[s.key] as string[]).length > 0
              : !!docs[s.key];
          return (
            <div key={s.key} className={`rounded-2xl border p-4 transition-colors ${isDone ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/60'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black text-slate-100">{t(s.copyKey as any)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.required ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                      {s.required ? t('requiredLabel') : t('optionalLabel')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t(s.hintKey as any)}</p>

                  {s.note ? (
                    <textarea value={docs.traditionNote || ''} onChange={(e) => setDocs({ ...docs, traditionNote: e.target.value })}
                      rows={3} maxLength={1000}
                      placeholder={lang === 'en' ? 'e.g. Smarta sampradaya, disciple of …, 12 years of practice…' : '…'}
                      className="mt-3 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-amber-500" />
                  ) : (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <button type="button" onClick={() => pick(s.key)} disabled={uploading === s.key}
                        className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50 inline-flex items-center gap-2">
                        {uploading === s.key ? <Clock3 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                        {uploading === s.key ? '…' : isDone && !s.multiple ? t('uploadedLabel') : t('uploadLabel')}
                      </button>
                      {s.multiple && Array.isArray(docs[s.key]) && (docs[s.key] as string[]).length > 0 && (
                        <span className="text-xs text-emerald-300 font-bold">{(docs[s.key] as string[]).length} {t('uploadedLabel')}</span>
                      )}
                      {!s.multiple && isDone && (
                        <a href={docs[s.key] as string} target="_blank" rel="noreferrer" className="text-xs text-amber-400 underline inline-flex items-center gap-1">
                          View <ChevronRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <button type="button" onClick={onSubmit} disabled={!requiredDone || submitting}
        className="w-full px-5 py-3.5 min-h-[52px] rounded-2xl text-sm font-black bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-600/20 inline-flex items-center justify-center gap-2">
        <HeartHandshake className="w-5 h-5" />
        {submitting ? '…' : t('submitApplication')}
      </button>
      {!requiredDone && (
        <p className="text-center text-[11px] text-slate-500">Complete the needed steps above to offer your credentials.</p>
      )}
    </div>
  );
};
