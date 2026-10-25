/**
 * FestivalMemoryCard — the post-festival mala-thread memory (P2-10).
 * =====================================================================
 * Once a festival has concluded, its page turns from invitation to
 * memory: a small sanctum-paper card in the Vibe programme's mala
 * idiom — brass thread, beads of fact, the community's own shared
 * moments, and a word of gratitude. EVERY figure is a real record
 * (lib/festivalMemory): the public anchored counter, the RSVP list
 * when the viewer may read it, the festival-moment posts devotees
 * themselves shared. A section with no records does not appear.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../context/LanguageContext';
import type { FestivalEventDoc, RsvpEntry } from '../../lib/festival';
import { buildFestivalMemory, type FestivalMomentLike } from '../../lib/festivalMemory';
import { festivalSlug } from '../../sangam/festivalMoments';

interface Props {
  event: FestivalEventDoc;
  /** The RSVP list when the viewer may read it (staff); else null. */
  rsvps?: RsvpEntry[] | null;
  tr: (l: { en: string; bn: string; hi: string }) => string;
}

export const FestivalMemoryCard: React.FC<Props> = ({ event, rsvps, tr }) => {
  const { t } = useLanguage();
  const [moments, setMoments] = useState<FestivalMomentLike[]>([]);

  const slug = useMemo(() => {
    try {
      return festivalSlug({ nameEn: event.name.en } as never);
    } catch {
      return '';
    }
  }, [event.name.en]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'sangamPosts'), where('kind', '==', 'festival_moment'), limit(60))
        );
        if (cancelled) return;
        const rows: FestivalMomentLike[] = [];
        snap.docs.forEach((d) => {
          const data = d.data() as { festival?: string; text?: string; authorName?: string };
          if (slug && data.festival !== slug) return;
          if (data.text) rows.push({ text: data.text, authorName: data.authorName || '' });
        });
        setMoments(rows);
      } catch {
        /* moments are a grace note — the card stands without them */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const memory = useMemo(
    () => buildFestivalMemory(event, rsvps ?? null, moments, Date.now()),
    [event, rsvps, moments]
  );
  if (!memory) return null;

  const beads: { value: string; label: string }[] = [
    { value: String(memory.expectedHeads), label: t('surfaces.events.memoryExpected') },
  ];
  if (memory.families !== null) {
    beads.push({ value: String(memory.families), label: t('surfaces.events.memoryFamilies') });
  }
  if (memory.arrivedHeads !== null && memory.arrivedHeads > 0) {
    beads.push({ value: String(memory.arrivedHeads), label: t('surfaces.events.memoryArrived') });
  }
  if (memory.momentsCount > 0) {
    beads.push({ value: String(memory.momentsCount), label: t('surfaces.events.memoryMoments') });
  }

  return (
    <section
      aria-label={t('surfaces.events.memoryTitle')}
      className="rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50/60 p-6 shadow-sm"
    >
      <div className="text-center">
        <div className="text-3xl mb-1">🪔</div>
        <h2 className="font-black text-stone-800">{t('surfaces.events.memoryTitle')}</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          {tr(event.name)} · {memory.dateISO}
          {memory.endDateISO !== memory.dateISO ? ` → ${memory.endDateISO}` : ''}
        </p>
      </div>

      {/* The mala: beads of fact on a brass thread. */}
      <div className="relative mt-5">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" aria-hidden />
        <div className="relative flex flex-wrap justify-center gap-x-6 gap-y-3">
          {beads.map((b) => (
            <div key={b.label} className="flex flex-col items-center bg-gradient-to-b from-amber-50 to-orange-50/60 px-1">
              <span className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center font-black text-sm shadow ring-2 ring-amber-100">
                {b.value}
              </span>
              <span className="text-[10px] font-bold text-stone-500 mt-1 text-center max-w-[110px] leading-tight">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {memory.perDay.length > 1 && (
        <p className="text-center text-[11px] text-stone-500 mt-4">
          {memory.perDay.map((d) => `${d.date.slice(5)}: ${d.heads}`).join(' · ')}
        </p>
      )}

      {memory.moments.length > 0 && (
        <div className="mt-5 space-y-2">
          {memory.moments.map((m, i) => (
            <blockquote key={i} className="rounded-2xl bg-white/70 border border-amber-100 px-4 py-3 text-center">
              <p className="text-sm text-stone-700 italic">“{m.text}”</p>
              {m.authorName && <cite className="text-[11px] text-stone-400 not-italic">— {m.authorName}</cite>}
            </blockquote>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-stone-500 mt-5 leading-relaxed">{t('surfaces.events.memoryThanks')}</p>
    </section>
  );
};

export default FestivalMemoryCard;
