/**
 * crisis/PersonalHistory.tsx — Phase 3: "My safety log".
 * =====================================================================
 * A dignified, calm record of the user's own crisis moments. Deliberately
 * UN-gamified: no badges, no streaks, no scores — just a quiet log.
 *
 * Privacy: queries are senderUid == me / responses uid == me ONLY.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  History,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import {
  crisisCopy,
  useCrisisT,
  normalizeLang,
  type TriString,
} from './crisisStrings';
import {
  type CrisisEvent,
  type CrisisResponse,
} from './crisisCommandTypes';
import { tsToMs } from './crisisCommandTypes';
import { EventHistoryCard } from './EventHistoryCard';
import { CrisisSkeletonList } from './CrisisSkeleton';
import {
  situationLabel,
  statusLabel,
  statusPillClass,
  formatWhen,
} from './crisisFormat';
import {
  getMySentSOSWithResponses,
  getMyResponses,
} from './historyService';

/* ------------------------------------------------------------------ */
/* Card: one SOS the user responded to                                 */
/* ------------------------------------------------------------------ */

const RespondedCard: React.FC<{
  event: CrisisEvent;
  myResponse: CrisisResponse;
  t: (s: TriString) => string;
  lang: string;
}> = ({ event, myResponse, t, lang }) => (
  <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-stone-900">
          <span className="text-stone-500 font-normal">{t(crisisCopy.youHelped)} </span>
          {event.senderName}
        </h3>
        <p className="mt-0.5 text-xs text-stone-500">
          {situationLabel(event.situation, t)} · {formatWhen(tsToMs(event.createdAt), lang)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillClass(event.status)}`}
      >
        {statusLabel(event.status, t)}
      </span>
    </div>

    <div className="mt-3 flex items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/60 px-3 py-1 text-amber-800">
        <ShieldCheck className="h-4 w-4" />
        {t(crisisCopy.yourRole)}: {myResponse.status === 'arrived' ? t(crisisCopy.roleArrived) : t(crisisCopy.roleComing)}
      </span>
    </div>

    {event.outcomeNote && (
      <div className="mt-3 rounded-xl border-l-2 border-emerald-400 bg-emerald-50 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide text-emerald-700">
          {t(crisisCopy.outcome)}
        </p>
        <p className="mt-0.5 text-sm text-stone-700">{event.outcomeNote}</p>
      </div>
    )}
  </article>
);

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export const PersonalHistory: React.FC = () => {
  const { currentLang } = useLanguage();
  const { firebaseUser, currentUser } = useAuthWorkspace();
  const t = useCrisisT();
  const lang = normalizeLang(currentLang);

  const uid = firebaseUser?.uid ?? (currentUser as { id?: string } | undefined)?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState<{ event: CrisisEvent; responses: CrisisResponse[] }[]>([]);
  const [responded, setResponded] = useState<{ event: CrisisEvent; myResponse: CrisisResponse }[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [s, r] = await Promise.all([
          getMySentSOSWithResponses(uid),
          getMyResponses(uid),
        ]);
        if (!alive) return;
        setSent(s);
        setResponded(r);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  const header = useMemo(
    () => (
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-900">
          <History className="h-5 w-5 text-amber-700" />
          {t(crisisCopy.historyTitle)}
        </h1>
        <p className="mt-1 text-sm text-stone-500">{t(crisisCopy.historySubtitle)}</p>
      </header>
    ),
    [t],
  );

  if (!uid) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        {header}
        <p className="rounded-2xl bg-stone-50 p-6 text-center text-sm text-stone-600">
          {t(crisisCopy.notSignedIn)}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-16">
      {header}

      {loading && <CrisisSkeletonList rows={3} />}

      {!loading && !error && (
        <>
          <section aria-label={t(crisisCopy.sentSection)} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
              {t(crisisCopy.sentSection)}
            </h2>
            {sent.length === 0 ? (
              <p className="rounded-2xl bg-stone-50 p-5 text-sm text-stone-500">
                {t(crisisCopy.noSentYet)}
              </p>
            ) : (
              <div className="space-y-3">
                {sent.map(({ event, responses }) => (
                  <EventHistoryCard key={event.id} event={event} responses={responses} t={t} lang={lang} />
                ))}
              </div>
            )}
          </section>

          <section aria-label={t(crisisCopy.respondedSection)}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
              {t(crisisCopy.respondedSection)}
            </h2>
            {responded.length === 0 ? (
              <p className="rounded-2xl bg-stone-50 p-5 text-sm text-stone-500">
                {t(crisisCopy.noResponsesYet)}
              </p>
            ) : (
              <div className="space-y-3">
                {responded.map(({ event, myResponse }) => (
                  <RespondedCard key={event.id} event={event} myResponse={myResponse} t={t} lang={lang} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {error && (
        <p className="rounded-2xl bg-red-50 p-5 text-center text-sm text-red-700">
          {t(crisisCopy.locationUnavailable)}
        </p>
      )}
    </div>
  );
};

export default PersonalHistory;
