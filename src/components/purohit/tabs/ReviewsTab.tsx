/** Reviews received from devotees + ratings the purohit gave. */
import React, { useEffect, useState } from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import { GigReview } from '../../../types/purohit';
import { Card, SectionTitle, EmptyState, Stars } from '../ui';

export const ReviewsTab: React.FC = () => {
  const { myReceivedReviews, profile } = usePurohit();

  const [list, setList] = useState<GigReview[]>(myReceivedReviews);
  useEffect(() => setList(myReceivedReviews), [myReceivedReviews]);

  return (
    <div className="space-y-4">
      <SectionTitle sub="Only devotees you performed rituals for can review you — that is what makes the ratings trustworthy.">
        Reviews
      </SectionTitle>

      <Card>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-black text-stone-900">
              {profile?.ratingAggregate.toFixed(1) || '—'}
            </p>
            <Stars value={profile?.ratingAggregate || 0} />
            <p className="text-[11px] text-stone-500 mt-1">{profile?.ratingCount || 0} reviews</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-stone-600">
              {profile?.completedGigs || 0} rituals completed. Ratings come only from completed
              marketplace gigs — never self-awarded, never purchasable.
            </p>
          </div>
        </div>
      </Card>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            title="No reviews yet"
            sub="Complete your first ritual through the marketplace and your devotee's rating will appear here."
          />
        </Card>
      ) : (
        list.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-stone-900">{r.reviewerName}</p>
              <Stars value={r.rating} size="w-3.5 h-3.5" />
            </div>
            {r.note && <p className="text-xs text-stone-600 mt-1.5">“{r.note}”</p>}
            <p className="text-[11px] text-stone-400 mt-1.5">
              {new Date(r.createdAt).toLocaleDateString('en-IN')}
            </p>
          </Card>
        ))
      )}
    </div>
  );
};
