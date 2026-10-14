/** Reviews received from devotees + ratings the purohit gave. */
import React, { useEffect, useState } from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import { GigReview } from '../../../types/purohit';
import { Card, SectionTitle, EmptyState, Stars } from '../ui';
import { useLanguage } from '../../../context/LanguageContext';

export const ReviewsTab: React.FC = () => {
  const { t } = useLanguage();
  const { myReceivedReviews, profile } = usePurohit();

  const [list, setList] = useState<GigReview[]>(myReceivedReviews);
  useEffect(() => setList(myReceivedReviews), [myReceivedReviews]);

  return (
    <div className="space-y-4">
      <SectionTitle sub={t('purohit.reviews.titleSub')}>
        {t('purohit.reviews.title')}
      </SectionTitle>

      <Card>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-black text-stone-900">
              {profile?.ratingAggregate.toFixed(1) || '—'}
            </p>
            <Stars value={profile?.ratingAggregate || 0} />
            <p className="text-[11px] text-stone-500 mt-1">{profile?.ratingCount || 0} {t('purohit.reviews.title').toLowerCase()}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-stone-600">
              {profile?.completedGigs || 0} {t('purohit.overview.ritualsCompleted')}. {t('purohit.reviews.trustNote')}
            </p>
          </div>
        </div>
      </Card>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            title={t('purohit.reviews.noReviews')}
            sub={t('purohit.reviews.completeFirst')}
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
