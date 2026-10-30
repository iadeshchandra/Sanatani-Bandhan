/**
 * campus/ZoneReportButton.tsx — sevadar live reporting in 5 seconds.
 * =====================================================================
 * The missing submit path for the "human sensors" layer: a sevadar
 * (or trustee/coordinator) taps a condition chip, optionally adds a
 * one-line note, and sends. Reports auto-expire (2h default, 30min in
 * festival mode) — live conditions are never permanent.
 *
 * Visibility: rendered ONLY for users whose org membership role is
 * sevadar-grade or above (sevadars, coordinators, trustees,
 * superadmins) — plus the platform owner. Everyone else simply never
 * sees the button. The Firestore rules enforce the same gate
 * server-side, so a hidden button is a courtesy, not the security.
 *
 * Pilgrim-first framing: this is live help for devotees planning
 * their visit ("short queue — good time"), never surveillance.
 */
import React, { useState } from 'react';
import { Megaphone, X, Send } from 'lucide-react';
import { submitZoneReport, REPORT_META, canSubmitZoneReport, type ReportType } from './reporting';
import { useMembership } from '../context/MembershipContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { OWNER_EMAIL } from '../lib/firestoreAdmin';
import { useLanguage } from '../context/LanguageContext';
import { friendlyErrorText } from '../lib/friendlyError';

export { canSubmitZoneReport };

type TriCopy = { en: string; bn: string; hi: string };
const tr = (copy: TriCopy): string => {
  try {
    const lang = localStorage.getItem('sanatani_lang') || 'en';
    if (lang === 'bn') return copy.bn;
    if (lang === 'hi') return copy.hi;
  } catch {
    /* sandboxed — fall through */
  }
  return copy.en;
};

const QUICK_TYPES: ReportType[] = [
  'queue_short',
  'queue_long',
  'crowded',
  'counter_open',
  'counter_closed',
  'all_clear',
];
const ALERT_TYPES: ReportType[] = ['lost_child', 'medical_needed'];

export const ZoneReportButton: React.FC<{
  orgId: string;
  zoneId: string;
  zoneName: string;
  festivalMode?: boolean;
  className?: string;
}> = ({ orgId, zoneId, zoneName, festivalMode = false, className = '' }) => {
  const { myMemberships } = useMembership();
  const { firebaseUser } = useAuthWorkspace();
  const { currentLang } = useLanguage();
  void currentLang;
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ReportType | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const uid = (firebaseUser as { uid?: string } | null)?.uid || '';
  const email = (firebaseUser as { email?: string } | null)?.email || '';
  const displayName =
    (firebaseUser as { displayName?: string } | null)?.displayName || 'Sevadar';
  const membershipRole = myMemberships.find((m) => m.workspaceId === orgId)?.role;

  if (!canSubmitZoneReport(membershipRole, email, OWNER_EMAIL)) return null;

  const send = async () => {
    if (!picked || sending) return;
    setSending(true);
    setError('');
    try {
      await submitZoneReport({
        orgId,
        zoneId,
        zoneName,
        type: picked,
        note: note.trim() || undefined,
        reportedBy: uid,
        reporterName: displayName,
        festivalMode,
      });
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setPicked(null);
        setNote('');
        setSent(false);
      }, 1600);
    } catch (e: any) {
      console.error(e);
      setError(friendlyErrorText(e, currentLang, 'save'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`min-h-[48px] rounded-2xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-extrabold text-sm px-4 flex items-center justify-center gap-2 ${className}`}
      >
        <Megaphone className="w-5 h-5" />
        {tr({ en: 'Report live update', bn: 'লাইভ আপডেট দিন', hi: 'लाइव अपडेट दें' })}
      </button>

      {open && (
        <div className="fixed inset-0 z-[10010] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-stone-950/60" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-extrabold text-stone-900">
                {tr({ en: 'How is it right now?', bn: 'এখন অবস্থা কেমন?', hi: 'अभी हाल कैसा है?' })}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-11 h-11 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              📍 {zoneName} ·{' '}
              {tr({
                en: 'Devotees see this live — keep it honest and kind.',
                bn: 'ভক্তরা এটি লাইভ দেখেন — সৎ ও সদয় থাকুন।',
                hi: 'भक्त इसे लाइव देखते हैं — ईमानदार और दयालु रहें।',
              })}
            </p>

            {sent ? (
              <div className="py-10 text-center">
                <p className="text-4xl mb-3">🙏</p>
                <p className="text-lg font-extrabold text-emerald-700">
                  {tr({ en: 'Live now — dhanyavaad!', bn: 'এখন লাইভ — ধন্যবাদ!', hi: 'अब लाइव — धन्यवाद!' })}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  {tr({
                    en: 'It fades automatically after a while.',
                    bn: 'কিছুক্ষণ পর এটি নিজে থেকেই মুছে যাবে।',
                    hi: 'यह कुछ देर बाद अपने आप हट जाएगा।',
                  })}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_TYPES.map((t) => {
                    const meta = REPORT_META[t];
                    const active = picked === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPicked(active ? null : t)}
                        className={`min-h-[56px] rounded-2xl border-2 px-3 py-2.5 text-sm font-bold flex items-center gap-2 transition-colors ${
                          active
                            ? 'border-amber-700 bg-amber-100 text-amber-900'
                            : 'border-stone-200 bg-white text-stone-700'
                        }`}
                      >
                        <span className="text-xl" aria-hidden>{meta.icon}</span>
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wide mt-4 mb-2">
                  {tr({ en: 'Urgent', bn: 'জরুরি', hi: 'अत्यावश्यक' })}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {ALERT_TYPES.map((t) => {
                    const meta = REPORT_META[t];
                    const active = picked === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPicked(active ? null : t)}
                        className={`min-h-[56px] rounded-2xl border-2 px-4 py-2.5 text-sm font-bold flex items-center gap-2 transition-colors ${
                          active
                            ? 'border-red-700 bg-red-50 text-red-900'
                            : 'border-red-200 bg-white text-stone-700'
                        }`}
                      >
                        <span className="text-xl" aria-hidden>{meta.icon}</span>
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={120}
                  placeholder={tr({
                    en: 'One-line note (optional) — e.g. "counter 3 open"',
                    bn: 'এক লাইনের নোট (ঐচ্ছিক)',
                    hi: 'एक पंक्ति का नोट (वैकल्पिक)',
                  })}
                  className="mt-4 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm min-h-[48px]"
                />

                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

                <button
                  type="button"
                  onClick={send}
                  disabled={!picked || sending}
                  className="mt-4 w-full min-h-[52px] rounded-2xl bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-amber-50 font-extrabold text-base flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {sending
                    ? tr({ en: 'Sending…', bn: 'পাঠানো হচ্ছে…', hi: 'भेजा जा रहा है…' })
                    : tr({ en: 'Send live update', bn: 'লাইভ আপডেট পাঠান', hi: 'लाइव अपडेट भेजें' })}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
