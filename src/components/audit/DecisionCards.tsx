/**
 * DecisionCards — concluded decisions on the Transparency Board
 * (EVENTS P2-11).
 * =====================================================================
 * The Transparency Board shows the money; this strip beneath it
 * shows the DECISIONS: every concluded community poll and board
 * resolution of the workspace, in plain language — the question,
 * the outcome, the turnout, the quorum. A committee that publishes
 * its decisions earns the next vote's turnout.
 *
 * Privacy law, enforced in lib/decisionCards: a poll whose creator
 * chose 'committee' result-visibility at launch appears here ONLY
 * for a committee viewer; counts the rule hides stay hidden. Every
 * figure is computed from the record — nothing invented.
 */
import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../context/LanguageContext';
import {
  pollDecisionCard,
  resolutionDecisionCard,
  sortDecisionCards,
  type DecisionCard,
} from '../../lib/decisionCards';

interface Props {
  workspaceId: string;
  /** True when the viewer is on this workspace's committee. */
  isCommittee?: boolean;
}

export const DecisionCards: React.FC<Props> = ({ workspaceId, isCommittee }) => {
  const { t } = useLanguage();
  const [cards, setCards] = useState<DecisionCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const out: DecisionCard[] = [];
      try {
        const pollsSnap = await getDocs(
          query(collection(db, 'polls'), where('workspaceId', '==', workspaceId), limit(50))
        );
        pollsSnap.docs.forEach((d) => {
          const card = pollDecisionCard(
            { id: d.id, ...(d.data() as object) } as never,
            { isCommittee: !!isCommittee },
            now
          );
          if (card) out.push(card);
        });
      } catch {
        /* polls unreadable for this viewer — resolutions may still show */
      }
      try {
        const resSnap = await getDocs(
          query(collection(db, 'resolutions'), where('workspaceId', '==', workspaceId), limit(50))
        );
        resSnap.docs.forEach((d) => {
          const card = resolutionDecisionCard({ id: d.id, ...(d.data() as object) } as never, now);
          if (card) out.push(card);
        });
      } catch {
        /* resolutions unreadable for this viewer — the board stays clean */
      }
      if (!cancelled) setCards(sortDecisionCards(out).slice(0, 12));
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, isCommittee]);

  if (cards.length === 0) return null;

  return (
    <section
      aria-label={t('surfaces.events.decisionsTitle')}
      className="mx-auto w-full max-w-5xl px-4 sm:px-6 mt-4"
    >
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 flex items-center gap-2 mb-4">
          <span aria-hidden>🪔</span> {t('surfaces.events.decisionsTitle')}
        </h2>
        {/* The mala thread: decisions strung in order, newest first. */}
        <ol className="relative space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-amber-400/70 before:via-amber-500/40 before:to-transparent">
          {cards.map((c) => (
            <li key={`${c.kind}-${c.id}`} className="relative pl-7">
              <span
                aria-hidden
                className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full bg-gradient-to-br from-amber-500 to-orange-700 ring-2 ring-amber-100"
              />
              <p className="text-sm font-black text-stone-900 leading-snug">{c.title}</p>
              <p className="text-xs font-bold text-stone-600 mt-0.5">{c.outcomeLine}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">{c.detailLine}</p>
              {c.note && (
                <p className="text-xs text-stone-500 italic mt-1.5 bg-amber-50/70 border border-amber-100 rounded-xl px-3 py-2">
                  {c.note}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default DecisionCards;
