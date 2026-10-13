/** Purohit's assigned/active/completed gigs with status actions + devotee rating. */
import React, { useMemo, useState } from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import { GigStatus } from '../../../types/purohit';
import { Card, SectionTitle, PrimaryButton, GhostButton, GigStatusBadge, EmptyState } from '../ui';

const NEXT_ACTION: Partial<Record<GigStatus, { next: GigStatus; label: string }>> = {
  ASSIGNED: { next: 'IN_PROGRESS', label: 'Start ritual' },
  IN_PROGRESS: { next: 'COMPLETED', label: 'Mark complete' },
};

export const MyGigsTab: React.FC = () => {
  const { myGigs, advanceGig, submitReview, hasReviewed } = usePurohit();
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active');
  const [working, setWorking] = useState<string | null>(null);
  const [ratingFor, setRatingFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingNote, setRatingNote] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'active') return myGigs.filter((g) => ['ASSIGNED', 'IN_PROGRESS'].includes(g.status));
    if (filter === 'done') return myGigs.filter((g) => ['COMPLETED', 'DAKSHINA_RELEASED'].includes(g.status));
    return myGigs;
  }, [myGigs, filter]);

  const doAdvance = async (gig: any, next: GigStatus) => {
    setWorking(gig.id);
    try {
      await advanceGig(gig, next);
    } catch (e: any) {
      alert(e.message || 'Could not update gig');
    } finally {
      setWorking(null);
    }
  };

  const doRate = async (gig: any) => {
    setWorking(gig.id);
    try {
      await submitReview(gig, rating, ratingNote);
      setRatingFor(null);
      setRating(5);
      setRatingNote('');
    } catch (e: any) {
      alert(e.message || 'Could not submit rating');
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle sub="Accept, perform, and complete your rituals. Ratings open after completion.">
        My rituals
      </SectionTitle>
      <div className="flex gap-1.5">
        {(['active', 'done', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize min-h-[44px] ${
              filter === f ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200'
            }`}
          >
            {f === 'done' ? 'Completed' : f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={filter === 'active' ? 'No active rituals' : 'Nothing here yet'}
            sub="Accepted gigs appear here. Find open requirements in the Find Gigs tab."
          />
        </Card>
      ) : (
        filtered.map((g) => {
          const action = NEXT_ACTION[g.status as GigStatus];
          const canRate =
            ['COMPLETED', 'DAKSHINA_RELEASED'].includes(g.status) && !hasReviewed(g.id);
          return (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-stone-900">{g.ritualType}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {g.devoteeName} · {g.city} · {g.preferredDate}
                    {g.devoteePhone && ` · ${g.devoteePhone}`}
                  </p>
                  {g.dakshinaAgreed ? (
                    <p className="text-xs font-bold text-emerald-700 mt-1">
                      Agreed dakshina: ₹{g.dakshinaAgreed.toLocaleString('en-IN')}
                    </p>
                  ) : (
                    <p className="text-xs text-stone-400 mt-1">Dakshina: per budget / to be agreed</p>
                  )}
                </div>
                <GigStatusBadge status={g.status} />
              </div>

              {g.notes && <p className="text-xs text-stone-600 mt-2 italic">“{g.notes}”</p>}

              <div className="flex gap-2 mt-3">
                {action && (
                  <PrimaryButton
                    className="flex-1"
                    disabled={working === g.id}
                    onClick={() => doAdvance(g, action.next)}
                  >
                    {working === g.id ? 'Updating…' : action.label}
                  </PrimaryButton>
                )}
                {g.status === 'COMPLETED' && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex-1">
                    Waiting for the devotee to confirm — dakshina releases on confirmation.
                  </p>
                )}
                {canRate && (
                  <GhostButton className="flex-1" onClick={() => setRatingFor(ratingFor === g.id ? null : g.id)}>
                    {ratingFor === g.id ? 'Close' : 'Rate devotee'}
                  </GhostButton>
                )}
              </div>

              {ratingFor === g.id && (
                <div className="mt-3 border-t border-stone-100 pt-3 space-y-2.5">
                  <p className="text-xs font-bold text-stone-700">How was working with {g.devoteeName}?</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(i)}
                        className={`text-2xl ${i <= rating ? 'text-amber-500' : 'text-stone-300'}`}
                        aria-label={`${i} star`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={ratingNote}
                    onChange={(e) => setRatingNote(e.target.value)}
                    placeholder="A short note (optional)…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                  <PrimaryButton className="w-full" disabled={working === g.id} onClick={() => doRate(g)}>
                    {working === g.id ? 'Submitting…' : 'Submit rating'}
                  </PrimaryButton>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};
