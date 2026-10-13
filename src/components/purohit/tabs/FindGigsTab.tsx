/** Browse open marketplace gigs and accept them. */
import React, { useMemo, useState } from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import { Card, SectionTitle, PrimaryButton, EmptyState } from '../ui';

export const FindGigsTab: React.FC = () => {
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
    if (!confirm(`Accept "${gig.ritualType}" for ${gig.devoteeName}?`)) return;
    setAccepting(gig.id);
    try {
      await acceptGig(gig);
    } catch (e: any) {
      alert(e.message || 'Could not accept gig');
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle sub="Open requirements from devotees. Accept to take the ritual.">
          Find rituals ({filtered.length})
        </SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filter by city…"
            className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm min-h-[44px]"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm min-h-[44px] bg-white"
          >
            <option value="">All ritual types</option>
            <option>Havan & Yajna</option>
            <option>Samskara & Vivah</option>
            <option>Katha & Shanti</option>
            <option>Vastu & Grihapravesh</option>
            <option>Mandir Sanctum</option>
          </select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No open requirements right now"
            sub="New devotee requirements appear here. Keep your city and specializations updated so the right gigs find you."
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
                    Budget: ₹{g.budgetMin.toLocaleString('en-IN')} – ₹{g.budgetMax.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <PrimaryButton
                className="w-full mt-3"
                disabled={accepting === g.id}
                onClick={() => handleAccept(g)}
              >
                {accepting === g.id ? 'Accepting…' : 'Accept this ritual'}
              </PrimaryButton>
            </Card>
          ))}
        </div>
      )}
      {profile && (
        <p className="text-[11px] text-stone-400 text-center px-4">
          Showing as {profile.displayName} ({profile.id}) · {profile.verificationTier.replace(/_/g, ' ')}
        </p>
      )}
    </div>
  );
};
