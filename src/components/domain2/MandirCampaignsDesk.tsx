import React, { useState } from 'react';
import { Target, Plus, Heart, Users, TrendingUp, Sparkles, X, Coins } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { CampaignCrowdfund } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

export const MandirCampaignsDesk: React.FC = () => {
  const { t } = useLanguage();
  const { activeWorkspace } = useAuthWorkspace();
  const { campaigns, addCampaignDonation } = useData();
  const { showToast } = useToast();

  const [selectedCampaign, setSelectedCampaign] = useState<CampaignCrowdfund | null>(null);
  const [donorName, setDonorName] = useState('');
  const [donationAmount, setDonationAmount] = useState<number | ''>(5100);
  const [donorCity, setDonorCity] = useState('Varanasi');

  const handleDonate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !donationAmount || !donorName.trim()) {
      showToast('Please enter all donor details', 'warning');
      return;
    }

    addCampaignDonation(selectedCampaign.id, donorName.trim(), Number(donationAmount), donorCity.trim());
    setSelectedCampaign(null);
    setDonorName('');
    setDonationAmount(5100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 text-[10px] font-bold uppercase tracking-wider">{t('org.finance.campaigns.mandirNirmanSevaProjects')}</span>
            <span className="text-xs text-temple-400 font-mono">
              Transparent Milestone Crowdfunding
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Dharmic Campaigns & Crowdfund Desk
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Track Garbhagriha renovation, Goshala solar sheds, and public seva drives in real time
          </p>
        </div>
      </div>

      {/* Campaign Cards — QUEUED #58: a real workspace with no campaigns
          (the seed law: empty means EMPTY) used to render a blank body
          under this header. It now gets an honest empty state. */}
      {(campaigns || []).length === 0 ? (
        <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-10 shadow-xl text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-saffron-500/15 border border-saffron-500/30 flex items-center justify-center">
            <Target className="w-7 h-7 text-saffron-400" />
          </div>
          <h3 className="text-lg font-extrabold text-temple-100">No campaigns yet</h3>
          <p className="text-xs text-temple-400 max-w-md mx-auto leading-relaxed">
            When this institution launches a crowdfunding campaign — Mandir Nirman, a renovation,
            or a public seva drive — it will appear here with live collection progress, milestone
            transparency, and its hall of seva donors.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(campaigns || []).map((camp, idx) => {
          const pct = Math.min(100, Math.round((camp.collectedAmount / camp.targetAmount) * 100));

          return (
            <div
              key={`${camp.id}-${idx}`}
              className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-temple-800">
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-saffron-500/20 text-saffron-300 font-bold uppercase">
                      {camp.category}
                    </span>
                    <h3 className="font-extrabold text-base text-temple-100 mt-1.5 leading-snug">
                      {camp.title}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-black font-mono">
                    {pct}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 my-4">
                  <div className="w-full h-3 rounded-full bg-temple-800 overflow-hidden p-0.5 border border-temple-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-saffron-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-temple-400 text-[10px] font-semibold uppercase">Collected</p>
                      <p className="font-black text-saffron-400 text-sm">₹{(camp.collectedAmount || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-temple-400 text-[10px] font-semibold uppercase">Target</p>
                      <p className="font-bold text-temple-200 text-sm">₹{(camp.targetAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Top Donors Hall of Fame */}
                <div className="bg-temple-950/60 border border-temple-800 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-saffron-500/90 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('org.finance.campaigns.topDonorsHallOfSeva')}</span>
                  </p>
                  {(camp.topDonors || []).length === 0 && (
                    <p className="text-[11px] text-temple-400 font-medium">
                      No contributions yet — the first seva donor will be honoured here.
                    </p>
                  )}
                  <div className="divide-y divide-temple-800 text-xs">
                    {(camp.topDonors || []).map((d, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between">
                        <span className="text-temple-300 font-medium">
                          {idx + 1}. {d.name} <span className="text-[10px] text-temple-400">({d.city})</span>
                        </span>
                        <span className="font-mono font-bold text-saffron-400">
                          ₹{(d.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCampaign(camp)}
                  className="w-full py-2.5 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>{t('org.finance.campaigns.contributeSacredSevaOnlineupi')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Donation Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-temple-700 rounded-2xl max-w-md w-full p-6 text-temple-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800 mb-4">
              <h3 className="font-bold text-sm">Contribute to {selectedCampaign.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="text-temple-400 hover:text-temple-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDonate} className="space-y-3 text-xs">
              <div>
                <label className="block text-temple-300 font-semibold mb-1">Donor Full Name *</label>
                <input
                  type="text"
                  required
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">Seva Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(Number(e.target.value))}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200 font-bold text-saffron-400"
                  />
                </div>
                <div>
                  <label className="block text-temple-300 font-semibold mb-1">City / Country</label>
                  <input
                    type="text"
                    value={donorCity}
                    onChange={(e) => setDonorCity(e.target.value)}
                    className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-temple-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-temple-800">
                <button
                  type="button"
                  onClick={() => setSelectedCampaign(null)}
                  className="px-4 py-2 rounded-xl bg-temple-800 text-temple-300 font-semibold"
                >{t('org.finance.campaigns.cancel')}</button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold"
                >{t('org.finance.campaigns.confirmSevaPledge')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
