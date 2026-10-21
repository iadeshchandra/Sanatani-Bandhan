import React, { useState, useMemo } from 'react';
import { useInr, useWorkspaceCurrency } from '../../hooks/useWorkspaceInr';
import { Utensils, Plus, Heart, Users, Sparkles, CheckCircle2, Clock, X } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { formatINR } from '../../utils/format';
import { sanitizeName, isValidQuantity } from '../../utils/validation';
import { EmptyState } from '../common/EmptyState';
import { DataExportButton } from '../common/DataExportButton';
import { LocalOnlyBadge } from '../common/LocalOnlyBadge';

export const AnnadanamKitchenDesk: React.FC = () => {
  const inr = useInr();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();

  const [totalMealsServedToday, setTotalMealsServedToday] = useState(1450);
  const { annadanamList, addAnnadanam } = useData();
  const sponsorships = useMemo(
    () =>
      annadanamList.map((a) => ({
        id: a.id,
        date: a.date,
        donorName: a.sponsorName,
        gotra: 'N/A',
        occasion: a.occasion || 'N/A',
        mealsCount: a.devoteeCountProjected || 0,
        costRupees: a.contributionAmount || 0,
        status: a.status || 'Scheduled',
      })),
    [annadanamList]
  );

  // Trailing average of sponsored meal counts — used for the BOM sanity cap
  const avgSponsoredMeals = useMemo(() => {
    const counts = sponsorships.map((s) => s.mealsCount).filter((n) => Number.isFinite(n) && n > 0);
    if (counts.length === 0) return 0;
    return counts.reduce((a, b) => a + b, 0) / counts.length;
  }, [sponsorships]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [gotra, setGotra] = useState('Kashyapa');
  const [occasion, setOccasion] = useState('Janmadin (Birthday) Seva');
  const [date, setDate] = useState('2026-08-29');
  const [mealsCount, setMealsCount] = useState<number>(501);

  const handleSponsor = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDonor = sanitizeName(donorName);
    if (!cleanDonor) {
      showToast('Please enter the donor name', 'error', 'Donor Required');
      return;
    }
    if (!date || Number.isNaN(new Date(date).getTime())) {
      showToast('Please select a valid sponsorship date', 'error', 'Invalid Date');
      return;
    }
    if (!isValidQuantity(mealsCount, 100000)) {
      showToast('Meal count must be a positive number (max 100,000)', 'error', 'Invalid Meals');
      return;
    }

    // BOM sanity cap: projected meals > 10x trailing average is likely a data-entry error
    if (avgSponsoredMeals > 0 && mealsCount > 10 * avgSponsoredMeals) {
      showToast(
        `Heads up: ${mealsCount.toLocaleString('en-IN')} meals is over 10x the usual ${Math.round(avgSponsoredMeals).toLocaleString('en-IN')} — please double-check the figure`,
        'warning',
        'Unusual Meal Count'
      );
    }

    const cost = Math.round(mealsCount * 30);

    addAnnadanam({
      workspaceId: activeWorkspace.id,
      date: date,
      sponsorName: cleanDonor,
      occasion: occasion,
      mealType: 'Mahaprasad Lunch Bhandara',
      devoteeCountProjected: Number(mealsCount),
      contributionAmount: cost,
      status: 'Scheduled',
      });
    setIsAddModalOpen(false);
    setDonorName('');
    showToast(`Annadanam Sponsorship confirmed for ${mealsCount} meals (${inr(cost)})`, 'success', 'Maha Prasadam Sponsored');
  };

  const handleIncrementMeals = (count: number) => {
    // Guard the live counter against fat-finger batch errors (single-day cap 100,000)
    if (!isValidQuantity(count, 100000)) {
      showToast('Invalid meal batch size', 'error');
      return;
    }
    const projected = totalMealsServedToday + count;
    if (projected > 100000) {
      showToast(
        `Logging ${count} meals would push today's total to ${projected.toLocaleString('en-IN')} — over the 100,000 daily sanity cap. Please verify.`,
        'warning',
        'Unusual Batch Size'
      );
      return;
    }
    setTotalMealsServedToday(projected);
    showToast(`+${count} Maha Prasadam meals logged!`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">
              Maha Prasadam Kitchen Engine
            </span>
            <span className="text-xs text-temple-400 font-mono">
              Annam Parabrahma Swaroopam
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Annadanam Mega Kitchen Desk
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Real-time meal distribution logging, donor Annadanam sponsorships, and raw ingredient batch calculations
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Sponsor Annadanam Feast</span>
        </button>
      </div>

      {/* Live Serving Counter */}
      <div className="bg-temple-950/80 border border-saffron-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-saffron-400 tracking-wider">
            Today's Maha Prasadam Meals Distributed
          </span>
          <p className="text-4xl sm:text-5xl font-black text-saffron-400">
            {totalMealsServedToday.toLocaleString()} <span className="text-base text-temple-300 font-normal">Meals</span>
          </p>
          <p className="text-xs text-temple-400">
            Prepared with pure Desi Ghee, Sona Masoori Akshat, and seasonal sattvic vegetables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleIncrementMeals(50)}
            className="px-3.5 py-2 rounded-xl bg-temple-800 hover:bg-temple-750 text-temple-200 text-xs font-bold border border-temple-700 cursor-pointer"
          >
            +50 Plates
          </button>
          <button
            type="button"
            onClick={() => handleIncrementMeals(100)}
            className="px-3.5 py-2 rounded-xl bg-temple-800 hover:bg-temple-750 text-temple-200 text-xs font-bold border border-temple-700 cursor-pointer"
          >
            +100 Plates
          </button>
          <button
            type="button"
            onClick={() => handleIncrementMeals(500)}
            className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 text-xs font-black shadow-md shadow-saffron-600/20 cursor-pointer"
          >
            +500 Mega Batch
          </button>
        </div>
      </div>

      {/* Sponsorship Grid */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-temple-100">
          Annadanam Sponsorships <span className="text-temple-400 font-mono">({sponsorships.length})</span>
        </h3>
        <DataExportButton
          filename={`annadanam_sponsorships_${new Date().toISOString().slice(0, 10)}.csv`}
          label="Export Sponsorships"
          records={sponsorships.map((s) => ({
            donorName: s.donorName,
            gotra: s.gotra,
            occasion: s.occasion,
            date: s.date,
            mealsCount: s.mealsCount,
            costRupees: s.costRupees,
            status: s.status,
          }))}
        />
      </div>
      {sponsorships.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No sponsorships yet"
          description="Record the first Annadanam feast sponsorship to start the maha prasadam ledger."
          actionLabel="Sponsor Annadanam Feast"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sponsorships.map((s, idx) => (
          <div
            key={`${s.id}-${idx}`}
            className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                <div>
                  <h3 className="font-extrabold text-sm text-temple-100">{s.donorName}</h3>
                  <p className="text-xs text-saffron-400 font-medium">Gotra: {s.gotra}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    s.status === 'Distributed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/30'
                  }`}
                >
                  {s.status}
                </span>
              </div>

              <div className="py-2 space-y-1 text-xs text-temple-300">
                <p>
                  <span className="text-temple-400">Occasion:</span>{' '}
                  <span className="font-semibold text-temple-100">{s.occasion}</span>
                </p>
                <p>
                  <span className="text-temple-400">Scheduled Date:</span>{' '}
                  <span className="font-mono text-temple-200">{s.date}</span>
                </p>
                <p>
                  <span className="text-temple-400">Meal Capacity:</span>{' '}
                  <span className="font-bold text-saffron-300">{s.mealsCount} Devotees</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-temple-950/60 border border-temple-800 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] text-temple-400 font-semibold uppercase">Seva Contribution</p>
                  <p className="font-black text-saffron-400 text-sm">{inr(s.costRupees)}</p>
                </div>
                <Utensils className="w-5 h-5 text-saffron-500 opacity-80" />
              </div>
            </div>

            <div className="pt-2 text-right">
              <span className="text-[10px] text-temple-400 font-mono">ID: {s.id}</span>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Sponsor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-t-3xl sm:rounded-2xl max-w-md w-full flex flex-col overflow-hidden text-temple-100 shadow-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800 px-6 pt-5 shrink-0">
              <div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold text-sm">Sponsor Maha Prasadam Annadanam</h3><LocalOnlyBadge /></div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-temple-400 hover:text-temple-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSponsor} className="flex flex-col min-h-0 grow text-xs">
              <div className="overflow-y-auto min-h-0 px-6 py-4 space-y-3">
              <div>
                <label className="block text-temple-300 font-semibold mb-1">Donor Name *</label>
                <input
                  type="text"
                  required
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="e.g. Sri Rajesh Sharma & Parivar"
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Gotra *</label>
                  <input
                    type="text"
                    required
                    value={gotra}
                    onChange={(e) => setGotra(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>

                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Occasion / Sankalp</label>
                <input
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="e.g. Janmadin, Punyatithi, Grihapravesh"
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div>
                <label className="block text-temple-300 font-semibold mb-1">Number of Devotee Meals</label>
                <select
                  value={mealsCount}
                  onChange={(e) => setMealsCount(Number(e.target.value))}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-xs text-temple-200"
                >
                  <option value={101}>101 Meals ({inr(3030)})</option>
                  <option value={251}>251 Meals ({inr(7530)})</option>
                  <option value={501}>501 Meals ({inr(15030)})</option>
                  <option value={1001}>1,001 Meals ({inr(30030)})</option>
                  <option value={2100}>2,100 Meals (Mega Bhandara - {inr(63000)})</option>
                </select>
              </div>

              </div>
              <div className="flex items-center justify-end gap-3 border-t border-temple-800 shrink-0 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-temple-800 text-temple-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold"
                >
                  Confirm Seva Pledge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
