/**
 * tirtha/VisitCheckinSheet.tsx — "Record this visit".
 * =====================================================================
 * The ONLY way a visit enters the diary: the devotee explicitly taps
 * the button and confirms. No automation, no geofencing, no "we
 * noticed you're at a temple" — the temple name is typed or chosen by
 * the devotee, never detected.
 */
import React, { useState } from 'react';
import { Btn, Field } from '../solo/ui';
import { useLanguage } from '../context/LanguageContext';
import { uploadFile } from '../lib/fileVault';
import { recordVisit } from './tirthaStore';
import { tirthaLangOf, tt } from './i18n';
import type { DarshanKind, VisitEntry } from './types';

const DARSHAN_KINDS: DarshanKind[] = [
  'morning_aarti',
  'evening_aarti',
  'festival',
  'quiet_darshan',
  'special_puja',
  'parikrama',
  'other',
];

export const VisitCheckinSheet: React.FC<{
  uid: string;
  /** Pre-filled when launched from a campus map. Still editable. */
  initialTemple?: string;
  initialOrgId?: string;
  onSaved: (entry: VisitEntry) => void;
  onClose: () => void;
}> = ({ uid, initialTemple, initialOrgId, onSaved, onClose }) => {
  const { currentLang } = useLanguage();
  const lang = tirthaLangOf(currentLang);
  const [templeName, setTempleName] = useState(initialTemple || '');
  const [visitedAt, setVisitedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [darshanKind, setDarshanKind] = useState<DarshanKind | ''>('');
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!templeName.trim()) {
      setError(tt(currentLang, 'visit.templeName') + ' — ?');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let photoVaultUrl: string | undefined;
      if (photoFile) {
        // Private visibility: the photo never leaves the devotee's control.
        const res = await uploadFile(photoFile, {
          visibility: 'private',
          category: 'other',
          ownerUid: uid,
        });
        photoVaultUrl = res.url;
      }
      const entry = await recordVisit(uid, {
        templeName: templeName.trim(),
        orgId: initialOrgId,
        visitedAt: new Date(visitedAt).toISOString(),
        darshanKind: darshanKind || undefined,
        note: note.trim() || undefined,
        photoVaultUrl,
      });
      onSaved(entry);
    } catch (e: any) {
      setError(e?.message || '…');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9970] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-stone-950/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-extrabold text-stone-800">{tt(currentLang, 'visit.record')}</h2>
          <button
            onClick={onClose}
            aria-label={tt(currentLang, 'common.close')}
            className="w-11 h-11 rounded-full bg-stone-100 text-stone-600 text-lg"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-stone-500 mb-5">🔒 {tt(currentLang, 'visit.privacyNote')}</p>

        <div className="space-y-4">
          <Field label={tt(currentLang, 'visit.templeName')}>
            <input
              value={templeName}
              onChange={(e) => setTempleName(e.target.value)}
              placeholder={tt(currentLang, 'visit.templeName.ph')}
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base min-h-[44px]"
            />
          </Field>

          <Field label={tt(currentLang, 'visit.date')}>
            <input
              type="datetime-local"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base min-h-[44px]"
            />
          </Field>

          <Field label={tt(currentLang, 'visit.darshan')}>
            <div className="flex flex-wrap gap-2">
              {DARSHAN_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDarshanKind(darshanKind === k ? '' : k)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold min-h-[44px] border transition-colors ${
                    darshanKind === k
                      ? 'bg-amber-700 text-amber-50 border-amber-700'
                      : 'bg-white text-stone-600 border-stone-200'
                  }`}
                >
                  {tt(currentLang, `darshan.${k}`)}
                </button>
              ))}
            </div>
          </Field>

          <Field label={tt(currentLang, 'visit.note')}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={tt(currentLang, 'visit.note.ph')}
              rows={3}
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base"
            />
          </Field>

          <Field label={tt(currentLang, 'visit.photo')}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-stone-600 min-h-[44px]"
            />
            {photoFile && <p className="text-xs text-stone-500 mt-1">📷 {photoFile.name}</p>}
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Btn onClick={save} disabled={saving} className="w-full !py-3.5 text-base">
            {saving ? tt(currentLang, 'common.loading') : tt(currentLang, 'visit.save')}
          </Btn>
          <p className="text-center text-xs text-stone-400">
            {lang === 'bn' ? 'আপনার ডায়েরি, আপনার নিয়ম।' : lang === 'hi' ? 'आपकी डायरी, आपके नियम।' : 'Your diary, your rules.'}
          </p>
        </div>
      </div>
    </div>
  );
};
