/** Devotee's posted gigs: track status, confirm completion, rate the purohit. */
import React, { useState } from 'react';
import { usePurohit } from '../../context/PurohitContext';
import { GigStatus } from '../../types/purohit';
import { Card, SectionTitle, PrimaryButton, GhostButton, GigStatusBadge, EmptyState } from './ui';
import { useLanguage } from '../../context/LanguageContext';
import { friendlyError } from '../../lib/friendlyError';

export const MyRequirements: React.FC = () => {
  const { myPostedGigs, advanceGig, submitReview, hasReviewed } = usePurohit();
  const { t } = useLanguage();
  const [working, setWorking] = useState<string | null>(null);
  const [ratingFor, setRatingFor] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingNote, setRatingNote] = useState('');

  const confirm = async (gig: any) => {
    if (!confirm('Confirm the ritual was completed? This releases the dakshina.')) return;
    setWorking(gig.id);
    try {
      await advanceGig(gig, 'DAKSHINA_RELEASED' as GigStatus);
    } catch (e: any) {
      console.error(e);
      alert(friendlyError(e, t, 'save'));
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
      console.error(e);
      alert(friendlyError(e, t, 'save'));
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle sub="Track your posted requirements, confirm completed rituals, and rate your purohit.">
        My requirements ({myPostedGigs.length})
      </SectionTitle>
      {myPostedGigs.length === 0 ? (
        <Card>
          <EmptyState title="No requirements posted yet" sub="Post your first ritual requirement above — verified purohits will see it." />
        </Card>
      ) : (
        myPostedGigs.map((g) => {
          const canRate = ['COMPLETED', 'DAKSHINA_RELEASED'].includes(g.status) && !hasReviewed(g.id);
          return (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-stone-900">{g.ritualType}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {g.city} · {g.preferredDate} · ₹{g.budgetMin.toLocaleString('en-IN')}–₹{g.budgetMax.toLocaleString('en-IN')}
                  </p>
                  {g.assignedPurohitName && (
                    <p className="text-xs font-bold text-amber-700 mt-1">
                      🪔 {g.assignedPurohitName} ({g.assignedPurohitId})
                    </p>
                  )}
                </div>
                <GigStatusBadge status={g.status} />
              </div>
              <div className="flex gap-2 mt-3">
                {g.status === 'COMPLETED' && (
                  <PrimaryButton className="flex-1" disabled={working === g.id} onClick={() => confirm(g)}>
                    {working === g.id ? 'Confirming…' : '✓ Confirm & release dakshina'}
                  </PrimaryButton>
                )}
                {canRate && (
                  <GhostButton className="flex-1" onClick={() => setRatingFor(ratingFor === g.id ? null : g.id)}>
                    {ratingFor === g.id ? 'Close' : 'Rate purohit'}
                  </GhostButton>
                )}
              </div>
              {ratingFor === g.id && (
                <div className="mt-3 border-t border-stone-100 pt-3 space-y-2.5">
                  <p className="text-xs font-bold text-stone-700">How was {g.assignedPurohitName || 'the purohit'}?</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} type="button" onClick={() => setRating(i)} className={`text-2xl ${i <= rating ? 'text-amber-500' : 'text-stone-300'}`} aria-label={`${i} star`}>
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea value={ratingNote} onChange={(e) => setRatingNote(e.target.value)} placeholder="A short note (optional)…" rows={2} className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm" />
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
