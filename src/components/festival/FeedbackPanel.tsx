/**
 * FeedbackPanel — EVENTS E5: attendee feedback in the debrief.
 * =====================================================================
 * Mounted inside DebriefCard. The committee sees what the checked-in
 * devotees felt — response count and rate among the checked-in
 * parties (the funnel's arrived parties, handed down by the
 * debrief), per-aspect averages, the would-return share, and the
 * full list: name, the words they chose, their free text, and the
 * day they attended.
 *
 * Moderation: Hide sets state 'hidden' — the record leaves every
 * figure on this panel AND every published average (the aggregates
 * are computed from visible records only, lib/festivalFeedback),
 * while the author keeps their own view of it. Unhide restores it.
 * The record itself is never deleted (the rules deny delete for
 * everyone) — the trail stays.
 *
 * Response: the committee may answer a devotee in place; the reply
 * appears on the devotee's own festival page under their feedback.
 * The reply is capped at the same 600 characters the rules enforce.
 *
 * Public aggregate: staff may publish averages onto the public
 * festival_events doc — the E4 publish pattern — ONLY at 5+
 * responses (the privacy threshold: below it a single voice could
 * be recognised). The published shape is the lib's pinned flat key
 * set: averages, count, would-return — never a name or a sentence.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteField,
  where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import type { FestivalEventDoc, WarRoomPlan } from '../../lib/festival';
import {
  buildFeedbackAggregates,
  buildFeedbackSummary,
  respondToEventFeedback,
  setEventFeedbackState,
  visibleFeedback,
  FEEDBACK_ASPECT_KEYS,
  FEEDBACK_TEXT_MAX,
  type EventFeedback,
  type FeedbackAspectKey,
} from '../../lib/festivalFeedback';
import { Empty } from '../../utsav/ui';

interface Props {
  plan: WarRoomPlan;
  event: FestivalEventDoc | null;
  checkedInParties: number;
}

const ASPECT_LABEL: Record<FeedbackAspectKey, string> = {
  arrangements: 'feedbackArrangements',
  prasad: 'feedbackPrasad',
  darshanFlow: 'feedbackDarshanFlow',
  cleanliness: 'feedbackCleanliness',
};

/* A thin average bar on the 1–5 scale (DebriefCard's Bar idiom). */
const AvgBar: React.FC<{ value: number | null }> = ({ value }) => (
  <div className="h-2 flex-1 rounded-full bg-stone-100 overflow-hidden">
    {value != null && (
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
        style={{ width: `${Math.min(100, Math.max(0, (value / 5) * 100))}%` }}
      />
    )}
  </div>
);

export const FeedbackPanel: React.FC<Props> = ({ plan, event, checkedInParties }) => {
  const { t } = useLanguage();
  const { currentUser } = useAuthWorkspace();
  const wordFor = (v: number) => t(`surfaces.events.feedbackWord${v}`);
  const aspectLabel = (k: FeedbackAspectKey) => t(`surfaces.events.${ASPECT_LABEL[k]}`);

  const [all, setAll] = useState<EventFeedback[]>([]);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Every feedback record for this festival, live. The rules let
   * staff of the owning workspace read them; attendees never reach
   * this panel (it lives inside the staff-only War Room). */
  useEffect(() => {
    const q = query(
      collection(db, 'event_feedback'),
      where('festivalId', '==', plan.id)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<EventFeedback, 'id'>) })
        );
        rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setAll(rows);
      },
      () => { /* silent — the debrief stays usable if this read fails */ }
    );
    return unsub;
  }, [plan.id]);

  const visible = useMemo(() => visibleFeedback(all), [all]);
  const agg = useMemo(
    () => buildFeedbackAggregates(visible, checkedInParties),
    [visible, checkedInParties]
  );
  const published = event?.feedbackSummary ?? null;
  const publishable = useMemo(
    () => buildFeedbackSummary(visible, new Date().toISOString()),
    [visible]
  );

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try { await fn(); } catch { setError(t('surfaces.events.feedbackError')); }
    finally { setBusy(null); }
  };

  const doPublish = async () => {
    if (!publishable) return;
    setPublishBusy(true);
    setError(null);
    try {
      await setDoc(
        doc(db, 'festival_events', plan.id),
        { feedbackSummary: publishable },
        { merge: true }
      );
    } catch { setError(t('surfaces.events.feedbackError')); }
    finally { setPublishBusy(false); }
  };

  const doUnpublish = async () => {
    setPublishBusy(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'festival_events', plan.id), {
        feedbackSummary: deleteField(),
      });
      setConfirmUnpublish(false);
    } catch { setError(t('surfaces.events.feedbackError')); }
    finally { setPublishBusy(false); }
  };

  return (
    <section>
      <h3 className="text-sm font-extrabold text-stone-800">
        💬 {t('surfaces.events.feedbackPanelTitle')}
      </h3>
      <p className="text-xs text-stone-500 mt-0.5">
        {t('surfaces.events.feedbackPanelIntro')}
      </p>

      {all.length === 0 ? (
        <div className="mt-3">
          <Empty text={t('surfaces.events.feedbackEmpty')} />
        </div>
      ) : (
        <>
          {/* Headline figures — visible records only. */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-2xl bg-stone-50 border border-stone-100 px-3 py-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                {t('surfaces.events.feedbackResponses')}
              </div>
              <div className="text-xl font-black text-stone-800 tnum">{agg.count}</div>
            </div>
            <div className="rounded-2xl bg-stone-50 border border-stone-100 px-3 py-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                {t('surfaces.events.feedbackRateLabel')}
              </div>
              <div className="text-xl font-black text-stone-800 tnum">
                {agg.responseRatePct == null ? '—' : `${agg.responseRatePct}%`}
              </div>
              <div className="text-[10px] text-stone-400">
                {t('surfaces.events.feedbackRateOf')}
              </div>
            </div>
            <div className="rounded-2xl bg-stone-50 border border-stone-100 px-3 py-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                {t('surfaces.events.feedbackWouldReturn')}
              </div>
              <div className="text-xl font-black text-stone-800 tnum">
                {agg.wouldReturnPct == null ? '—' : `${agg.wouldReturnPct}%`}
              </div>
            </div>
          </div>

          {/* Per-aspect averages on the 1–5 scale. */}
          <div className="mt-3 space-y-1.5">
            {FEEDBACK_ASPECT_KEYS.map((k) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 font-semibold text-stone-600">
                  {aspectLabel(k)}
                </span>
                <AvgBar value={agg.aspectAverages[k]} />
                <span className="w-8 text-right font-bold text-stone-700 tnum">
                  {agg.aspectAverages[k] == null ? '—' : agg.aspectAverages[k].toFixed(1)}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs border-t border-stone-100 pt-1.5">
              <span className="w-28 shrink-0 font-semibold text-stone-600">
                {t('surfaces.events.feedbackOverall')}
              </span>
              <AvgBar value={agg.overallAverage} />
              <span className="w-8 text-right font-bold text-stone-700 tnum">
                {agg.overallAverage == null ? '—' : agg.overallAverage.toFixed(1)}
              </span>
            </div>
          </div>

          {/* The records themselves. */}
          <div className="mt-4 space-y-2.5">
            {all.map((f) => (
              <div
                key={f.id}
                className={`rounded-2xl border px-4 py-3 ${
                  f.state === 'hidden'
                    ? 'border-stone-200 bg-stone-50/60 opacity-75'
                    : 'border-orange-100 bg-orange-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-stone-800">{f.authorName}</span>
                    {f.attendedDay && (
                      <span className="ml-2 text-[11px] font-semibold text-stone-400">
                        {new Date(`${f.attendedDay}T12:00:00`).toLocaleDateString('en-IN', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })}
                      </span>
                    )}
                    {f.state === 'hidden' && (
                      <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                        {t('surfaces.events.feedbackHiddenBadge')}
                      </span>
                    )}
                  </div>
                  <button
                    disabled={busy === f.id}
                    onClick={() =>
                      act(f.id, () =>
                        setEventFeedbackState(
                          db, f.id,
                          f.state === 'hidden' ? 'visible' : 'hidden',
                          new Date().toISOString()
                        )
                      )
                    }
                    className="shrink-0 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-600 min-h-[36px] disabled:opacity-50"
                  >
                    {f.state === 'hidden'
                      ? t('surfaces.events.feedbackUnhide')
                      : t('surfaces.events.feedbackHide')}
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
                  {FEEDBACK_ASPECT_KEYS.map((k) => (
                    <span key={k}>
                      {aspectLabel(k)}: <b className="text-stone-700">{wordFor(f.aspects[k])}</b>
                    </span>
                  ))}
                  <span>
                    {t('surfaces.events.feedbackOverall')}:{' '}
                    <b className="text-stone-700">{wordFor(f.overall)}</b>
                  </span>
                  <span>
                    {t('surfaces.events.feedbackWouldReturn')}:{' '}
                    <b className="text-stone-700">
                      {f.wouldReturn
                        ? t('surfaces.events.feedbackReturnYes')
                        : t('surfaces.events.feedbackReturnNo')}
                    </b>
                  </span>
                </div>
                {f.text ? (
                  <p className="mt-1.5 text-sm text-stone-700 leading-relaxed">“{f.text}”</p>
                ) : null}
                {f.orgResponse && (
                  <div className="mt-2 rounded-xl bg-white/80 border border-orange-100 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-orange-700">
                      {t('surfaces.events.feedbackOrgReplied')} · {f.orgResponse.byName}
                    </div>
                    <p className="text-sm text-stone-700 mt-0.5">{f.orgResponse.text}</p>
                  </div>
                )}
                {replyFor === f.id ? (
                  <div className="mt-2">
                    <textarea
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      rows={2}
                      maxLength={FEEDBACK_TEXT_MAX}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={t('surfaces.events.feedbackResponsePh')}
                    />
                    <div className="flex gap-2 mt-1.5">
                      <button
                        disabled={busy === f.id || !replyText.trim()}
                        onClick={() =>
                          act(f.id, async () => {
                            await respondToEventFeedback(db, f.id, {
                              text: replyText.trim(),
                              at: new Date().toISOString(),
                              byName: currentUser?.name || 'Committee',
                            }, new Date().toISOString());
                            setReplyFor(null);
                            setReplyText('');
                          })
                        }
                        className="rounded-lg bg-orange-700 px-3 py-2 text-xs font-bold text-white min-h-[36px] disabled:opacity-50"
                      >
                        {t('surfaces.events.feedbackResponseSend')}
                      </button>
                      <button
                        onClick={() => { setReplyFor(null); setReplyText(''); }}
                        className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-500 min-h-[36px]"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReplyFor(f.id); setReplyText(f.orgResponse?.text || ''); }}
                    className="mt-2 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-bold text-orange-800 min-h-[36px]"
                  >
                    {t('surfaces.events.feedbackRespond')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Publish the averages — threshold-gated, E4 pattern. */}
      <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 px-4 py-3">
        {published ? (
          <>
            <p className="text-xs font-semibold text-stone-600">
              {t('surfaces.events.feedbackPublishedOn').replace(
                '{date}',
                new Date(published.publishedAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
              )}{' '}
              · {published.count}
            </p>
            {confirmUnpublish ? (
              <div className="flex gap-2 mt-2">
                <button
                  disabled={publishBusy}
                  onClick={doUnpublish}
                  className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white min-h-[36px] disabled:opacity-50"
                >
                  {t('surfaces.events.feedbackUnpublish')} ✓
                </button>
                <button
                  onClick={() => setConfirmUnpublish(false)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 min-h-[36px]"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmUnpublish(true)}
                className="mt-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 min-h-[36px]"
              >
                {t('surfaces.events.feedbackUnpublish')}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              disabled={publishBusy || !publishable}
              onClick={doPublish}
              className="rounded-lg bg-orange-700 px-3 py-2 text-xs font-bold text-white min-h-[36px] disabled:opacity-40"
            >
              {t('surfaces.events.feedbackPublish')}
            </button>
            <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
              {t('surfaces.events.feedbackPublishNote')}
            </p>
          </>
        )}
      </div>
      {error && <div className="text-xs font-semibold text-red-600 mt-2">{error}</div>}
    </section>
  );
};

export default FeedbackPanel;
