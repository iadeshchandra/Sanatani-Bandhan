/**
 * FeedbackCard — EVENTS E5: the attendee feedback prompt + record.
 * =====================================================================
 * Rendered on the festival page ONLY for a devotee whose own RSVP
 * record says the gate checked them in, and only once the festival
 * has concluded (the parent gates on lib/festivalFeedback's
 * feedbackPromptEligible). The ask is quiet and made once:
 *
 *  - Ratings are WORDS, not stars-with-points — five gratitude
 *    words per row (surfaces.events.feedbackWord1..5), the
 *    Kritagyata idiom. No score is ever shown back, no streak, no
 *    comparison with anyone else.
 *  - Dismissing settles it forever on this device (the lib's
 *    dismissal memory); submitting settles it everywhere (the
 *    record itself — one per attendee, deterministic id).
 *  - Their words are visible to them here afterwards, with the
 *    committee's response when one comes; they may edit while the
 *    record is visible (the rules' author door says the same).
 *    If the committee hides the record, the author still sees
 *    their own words — with a plain note that it stands aside
 *    from the festival summary.
 *
 * Free text travels ONLY to the committee: the rules make it
 * readable by the author and the org's staff, nobody else, ever.
 */
import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../context/LanguageContext';
import {
  festivalDayList,
  type FestivalEventDoc,
  type RsvpEntry,
} from '../../lib/festival';
import {
  editEventFeedback,
  feedbackDefaultDay,
  feedbackDocId,
  feedbackRatingOk,
  loadFeedbackDismissals,
  saveFeedbackDismissals,
  submitEventFeedback,
  withFeedbackDismissed,
  FEEDBACK_ASPECT_KEYS,
  FEEDBACK_TEXT_MAX,
  type EventFeedback,
  type FeedbackAspectKey,
  type FeedbackDraft,
} from '../../lib/festivalFeedback';

interface Props {
  event: FestivalEventDoc;
  uid: string;
  authorName: string;
  rsvp: RsvpEntry;
}

const ASPECT_LABEL: Record<FeedbackAspectKey, string> = {
  arrangements: 'feedbackArrangements',
  prasad: 'feedbackPrasad',
  darshanFlow: 'feedbackDarshanFlow',
  cleanliness: 'feedbackCleanliness',
};

/** One row of the word scale: a label and five gratitude words.
 *  0 = nothing chosen yet. */
const WordScale: React.FC<{
  label: string;
  value: number;
  onPick: (v: number) => void;
  wordFor: (v: number) => string;
}> = ({ label, value, onPick, wordFor }) => (
  <div>
    <div className="text-xs font-bold text-stone-600 mb-1.5">{label}</div>
    <div className="flex flex-wrap gap-1.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onPick(v)}
          className={`px-3 py-2 rounded-xl border-2 text-xs font-bold min-h-[44px] transition ${
            value === v
              ? 'border-orange-600 bg-orange-50 text-orange-900'
              : 'border-stone-200 bg-white text-stone-500 hover:border-orange-300'
          }`}
        >
          {wordFor(v)}
        </button>
      ))}
    </div>
  </div>
);

export const FeedbackCard: React.FC<Props> = ({ event, uid, authorName, rsvp }) => {
  const { t } = useLanguage();
  const wordFor = (v: number) => t(`surfaces.events.feedbackWord${v}`);
  const aspectLabel = (k: FeedbackAspectKey) => t(`surfaces.events.${ASPECT_LABEL[k]}`);

  const [mine, setMine] = useState<EventFeedback | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(
    () => loadFeedbackDismissals()[`${event.id}__${uid}`] === true
  );
  const [editing, setEditing] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* The form. 0 = unchosen; wouldReturn null = unchosen. */
  const days = festivalDayList(event.dateISO, event.endDateISO);
  const [aspects, setAspects] = useState<Record<FeedbackAspectKey, number>>({
    arrangements: 0, prasad: 0, darshanFlow: 0, cleanliness: 0,
  });
  const [overall, setOverall] = useState(0);
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const [day, setDay] = useState<string>(() => {
    const d = feedbackDefaultDay(rsvp);
    return d && days.includes(d) ? d : '';
  });

  /* My record, live — the same deterministic id the rules pin. */
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'event_feedback', feedbackDocId(event.id, uid)),
      (snap) => {
        setMine(
          snap.exists()
            ? ({ id: snap.id, ...(snap.data() as Omit<EventFeedback, 'id'>) })
            : null
        );
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, uid]);

  /* Prefill the form from my record when I open the editor. */
  const openEditor = () => {
    if (!mine) return;
    setAspects({ ...mine.aspects });
    setOverall(mine.overall);
    setWouldReturn(mine.wouldReturn);
    setText(mine.text || '');
    setDay(mine.attendedDay || '');
    setError(null);
    setEditing(true);
  };

  const formValid =
    FEEDBACK_ASPECT_KEYS.every((k) => feedbackRatingOk(aspects[k])) &&
    feedbackRatingOk(overall) &&
    wouldReturn !== null;

  const draft = (): FeedbackDraft => ({
    aspects: {
      arrangements: aspects.arrangements,
      prasad: aspects.prasad,
      darshanFlow: aspects.darshanFlow,
      cleanliness: aspects.cleanliness,
    },
    overall,
    text: text.trim(),
    wouldReturn: wouldReturn === true,
    ...(day ? { attendedDay: day } : {}),
  });

  const doSubmit = async () => {
    if (!formValid) { setError(t('surfaces.events.feedbackChooseAll')); return; }
    setBusy(true);
    setError(null);
    try {
      await submitEventFeedback(db, {
        workspaceId: event.workspaceId,
        festivalId: event.id,
        authorUid: uid,
        authorName: authorName || rsvp.name || '',
        draft: draft(),
        nowIso: new Date().toISOString(),
      });
      setJustSubmitted(true);
    } catch {
      setError(t('surfaces.events.feedbackError'));
    } finally {
      setBusy(false);
    }
  };

  const doSaveEdit = async () => {
    if (!mine || !formValid) { setError(t('surfaces.events.feedbackChooseAll')); return; }
    setBusy(true);
    setError(null);
    try {
      await editEventFeedback(db, mine.id, draft(), new Date().toISOString());
      setEditing(false);
    } catch {
      setError(t('surfaces.events.feedbackError'));
    } finally {
      setBusy(false);
    }
  };

  const doDismiss = () => {
    const next = withFeedbackDismissed(loadFeedbackDismissals(), event.id, uid);
    saveFeedbackDismissals(next);
    setDismissed(true);
  };

  if (!loaded) return null;

  /* ── My record, as it stands ────────────────────────────────── */
  if (mine && !editing) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
        <h2 className="font-extrabold text-stone-800 text-center">
          🙏 {t('surfaces.events.feedbackYourTitle')}
        </h2>
        {justSubmitted && (
          <p className="text-center text-sm font-bold text-emerald-700 mt-2">
            {t('surfaces.events.feedbackThanks')}
          </p>
        )}
        <div className="mt-4 space-y-2">
          {FEEDBACK_ASPECT_KEYS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-stone-600">{aspectLabel(k)}</span>
              <span className="font-bold text-orange-800">{wordFor(mine.aspects[k])}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 text-sm border-t border-stone-100 pt-2">
            <span className="font-semibold text-stone-600">{t('surfaces.events.feedbackOverall')}</span>
            <span className="font-bold text-orange-800">{wordFor(mine.overall)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-stone-600">{t('surfaces.events.feedbackReturnQ')}</span>
            <span className="font-bold text-orange-800">
              {mine.wouldReturn
                ? t('surfaces.events.feedbackReturnYes')
                : t('surfaces.events.feedbackReturnNo')}
            </span>
          </div>
        </div>
        {mine.text ? (
          <p className="mt-3 text-sm text-stone-600 italic leading-relaxed">“{mine.text}”</p>
        ) : null}
        {mine.orgResponse && (
          <div className="mt-3 rounded-2xl bg-orange-50/70 border border-orange-100 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-orange-700">
              {t('surfaces.events.feedbackOrgReplied')} · {mine.orgResponse.byName}
            </div>
            <p className="text-sm text-stone-700 mt-1 leading-relaxed">{mine.orgResponse.text}</p>
          </div>
        )}
        {mine.state === 'hidden' ? (
          <p className="mt-3 text-xs text-stone-400 leading-relaxed">
            {t('surfaces.events.feedbackHiddenNote')}
          </p>
        ) : (
          <div className="flex justify-center mt-4">
            <button
              onClick={openEditor}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 min-h-[44px]"
            >
              {t('surfaces.events.feedbackEdit')}
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── The prompt — shown once, dismissible forever ─────────────
   * (Reaching here with `mine` set means the editor is open on a
   * visible record — a hidden record renders read-only above and
   * never offers the editor, matching the rules' author door.) */
  if (!mine && dismissed) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6">
      <h2 className="font-extrabold text-stone-800 text-center">
        🪔 {mine ? t('surfaces.events.feedbackYourTitle') : t('surfaces.events.feedbackPromptTitle')}
      </h2>
      {!mine && (
        <p className="text-sm text-stone-500 text-center mt-1 leading-relaxed">
          {t('surfaces.events.feedbackPromptIntro')}
        </p>
      )}
      <div className="mt-4 space-y-4">
        {FEEDBACK_ASPECT_KEYS.map((k) => (
          <WordScale
            key={k}
            label={aspectLabel(k)}
            value={aspects[k]}
            onPick={(v) => setAspects((a) => ({ ...a, [k]: v }))}
            wordFor={wordFor}
          />
        ))}
        <WordScale
          label={t('surfaces.events.feedbackOverall')}
          value={overall}
          onPick={setOverall}
          wordFor={wordFor}
        />
        <div>
          <div className="text-xs font-bold text-stone-600 mb-1.5">
            {t('surfaces.events.feedbackReturnQ')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([
              { v: true, label: t('surfaces.events.feedbackReturnYes') },
              { v: false, label: t('surfaces.events.feedbackReturnNo') },
            ] as const).map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={wouldReturn === o.v}
                onClick={() => setWouldReturn(o.v)}
                className={`px-3 py-2 rounded-xl border-2 text-xs font-bold min-h-[44px] transition ${
                  wouldReturn === o.v
                    ? 'border-orange-600 bg-orange-50 text-orange-900'
                    : 'border-stone-200 bg-white text-stone-500 hover:border-orange-300'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {days.length > 1 && (
          <div>
            <div className="text-xs font-bold text-stone-600 mb-1.5">
              {t('surfaces.events.feedbackDayLabel')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={day === d}
                  onClick={() => setDay(d)}
                  className={`px-3 py-2 rounded-xl border-2 text-xs font-bold min-h-[44px] transition ${
                    day === d
                      ? 'border-orange-600 bg-orange-50 text-orange-900'
                      : 'border-stone-200 bg-white text-stone-500 hover:border-orange-300'
                  }`}
                >
                  {new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-stone-600 mb-1.5">
            {t('surfaces.events.feedbackTextLabel')}
          </label>
          <textarea
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 min-h-[44px]"
            rows={3}
            maxLength={FEEDBACK_TEXT_MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('surfaces.events.feedbackTextHint')}
          />
        </div>
        {error && <div className="text-xs font-semibold text-red-600">{error}</div>}
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={mine ? doSaveEdit : doSubmit}
            className="flex-1 rounded-xl bg-gradient-to-r from-orange-700 to-red-800 text-orange-50 font-bold py-3 text-sm min-h-[44px] shadow disabled:opacity-50"
          >
            {mine ? t('surfaces.events.feedbackSave') : `🙏 ${t('surfaces.events.feedbackSubmit')}`}
          </button>
          {mine ? (
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-700 min-h-[44px]"
            >
              ✕
            </button>
          ) : (
            <button
              onClick={doDismiss}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold text-stone-500 min-h-[44px]"
            >
              {t('surfaces.events.feedbackDismiss')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackCard;
