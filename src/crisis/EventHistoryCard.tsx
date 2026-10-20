/**
 * crisis/EventHistoryCard.tsx — the single "safety log" card.
 * =====================================================================
 * Rendered for the user's OWN sent SOS (PersonalHistory) and for a
 * family member's consented SOS history (FamilySafety, read-only).
 * One format everywhere — no divergence between views.
 */

import React from 'react';
import { MapPin, Clock, Users, HeartHandshake } from 'lucide-react';
import { crisisCopy, type TriString } from './crisisStrings';
import { type CrisisEvent, type CrisisResponse } from './crisisCommandTypes';
import { tsToMs } from './crisisCommandTypes';
import {
  situationLabel,
  statusLabel,
  statusPillClass,
  formatWhen,
  formatDuration,
} from './crisisFormat';

export const EventHistoryCard: React.FC<{
  event: CrisisEvent;
  responses: CrisisResponse[];
  t: (x: TriString) => string;
  lang: string;
  /** Family view adds a quiet consent footnote; personal view hides it. */
  showConsentNote?: boolean;
}> = ({ event, responses, t, lang, showConsentNote = false }) => {
  const startMs = tsToMs(event.createdAt);
  const endMs = event.resolvedAt == null ? null : tsToMs(event.resolvedAt);
  const names = responses.map((r) => r.name).filter(Boolean);
  const countWord =
    responses.length === 1 ? t(crisisCopy.person) : t(crisisCopy.people);

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-900">
            {situationLabel(event.situation, t)}
          </h3>
          <p className="mt-0.5 text-xs text-stone-500">
            {formatWhen(startMs, lang)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${statusPillClass(event.status)}`}
        >
          {statusLabel(event.status, t)}
        </span>
      </div>

      {event.location?.address && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-stone-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
          <span>{event.location.address}</span>
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-stone-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-stone-500">
            <Clock className="h-3.5 w-3.5" /> {t(crisisCopy.duration)}
          </p>
          <p className="mt-0.5 font-medium text-stone-800">
            {formatDuration(startMs, endMs, t(crisisCopy.activeTitle))}
          </p>
        </div>
        <div className="rounded-xl bg-stone-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-stone-500">
            <Users className="h-3.5 w-3.5" /> {t(crisisCopy.respondedBy)}
          </p>
          <p className="mt-0.5 font-medium text-stone-800">
            {responses.length} {countWord}
          </p>
        </div>
      </div>

      {names.length > 0 && (
        <p className="mt-2 text-sm text-stone-600">
          <HeartHandshake className="mr-1 inline h-4 w-4 text-amber-600" />
          {names.join(', ')}
        </p>
      )}

      {event.outcomeNote && (
        <div className="mt-3 rounded-xl border-l-2 border-amber-400 bg-amber-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-amber-700">
            {t(crisisCopy.outcome)}
          </p>
          <p className="mt-0.5 text-sm text-stone-700">{event.outcomeNote}</p>
        </div>
      )}

      {showConsentNote && (
        <p className="mt-2 text-[11px] italic text-stone-400">
          {t(crisisCopy.consentNote)}
        </p>
      )}
    </article>
  );
};

export default EventHistoryCard;
