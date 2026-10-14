/** Browse open marketplace gigs and accept them. */
import React, { useMemo, useState } from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import { Card, SectionTitle, PrimaryButton, EmptyState } from '../ui';
import { useLanguage } from '../../../context/LanguageContext';

export const FindGigsTab: React.FC = () => {
  const { t } = useLanguage();
  const { openGigs, acceptGig, profile } = usePurohit();
  const [cityFilter, setCityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return openGigs.filter((g) => {
      // Prefer my city/specializations, but show everything — the purohit decides.
      if (cityFilter && !g.city.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      if (typeFilter && g.ritualType !== typeFilter) return false;
      return true;
    });
  }, [openGigs, cityFilter, typeFilter]);

  const handleAccept = async (gig: any) => {
    if (!confirm(`${t('purohit.find.acceptConfirm')}: "${gig.ritualType}" — ${gig.devoteeName}`)) return;
    setAccepting(gig.id);
    try {
      await acceptGig(gig);
    } catch (e: any) {
      alert(e.message || t('purohit.find.acceptFailed'));
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle sub={t('purohit.find.titleSub')}>
          {t('purohit.find.findTitle')} ({filtered.length})
        </SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder={t('purohit.find.filterCity')}
            className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm min-h-[44px]"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm min-h-[44px] bg-white"
          >
            <option value="">{t('purohit.find.allTypes')}</option>
            <option>{t('purohit.find.catHavanYajna')}</option>
            <option>{t('purohit.find.catSamskaraVivah')}</option>
            <option>{t('purohit.find.catKathaShanti')}</option>
            <option>{t('purohit.find.catVastuGrihapravesh')}</option>
            <option>{t('purohit.find.catMandirSanctum')}</option>
          </select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={t('purohit.find.noOpen')}
            sub={t('purohit.find.noOpenSub')}
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((g) => (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-stone-900">{g.ritualType}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {g.devoteeName} · {g.city} · {g.preferredDate} · {g.language}
                  </p>
                  {g.notes && <p className="text-xs text-stone-600 mt-1.5 italic">“{g.notes}”</p>}
                  <p className="text-xs font-bold text-emerald-700 mt-1.5">
                    {t('purohit.find.budget')}: ₹{g.budgetMin.toLocaleString('en-IN')} – ₹{g.budgetMax.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <PrimaryButton
                className="w-full mt-3"
                disabled={accepting === g.id}
                onClick={() => handleAccept(g)}
              >
                {accepting === g.id ? t('purohit.find.accepting') : t('purohit.find.acceptRitual')}
              </PrimaryButton>
            </Card>
          ))}
        </div>
      )}
      {profile && (
        <p className="text-[11px] text-stone-400 text-center px-4">
          {t('purohit.find.showingAs')} {profile.displayName} ({profile.id}) · {profile.verificationTier.replace(/_/g, ' ')}
        </p>
      )}
    </div>
  );
};
