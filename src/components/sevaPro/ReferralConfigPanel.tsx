/**
 * ReferralConfigPanel — GodMode control for the referral credit engine.
 * ======================================================================
 * Mount inside the GodMode console (owner-only surface). Reads/writes
 * platformConfig/sevaReferralConfig:
 *   - enable / disable per direction (jyotish→purohit, purohit→jyotish)
 *   - referral % per direction (default 2%, clamped 0–50%)
 *
 * Writes are rules-gated to the owner (isSuperAdmin); a denied write
 * surfaces as an error toast, never a silent failure.
 *
 * THE MONEY RULE (enforced in code + rules): the credit is ALWAYS
 * min(referral% of seva value, platform commission on that order) — the
 * referrer can never take more than the platform earned, and never a
 * paisa from the other provider's earnings.
 */
import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { friendlyErrorText } from '../../lib/friendlyError';
import {
  DEFAULT_REFERRAL_CONFIG,
  getReferralConfig,
  saveReferralConfig,
  SevaReferralConfig,
  ReferralDirection,
} from '../../lib/sevaPro/referrals';

const DIRECTIONS: { key: ReferralDirection; label: string }[] = [
  { key: 'jyotish-to-purohit', label: '🔮 Jyotish → Purohit (remedy becomes ritual)' },
  { key: 'purohit-to-jyotish', label: '🪔 Purohit → Jyotish (puja leads to consultation)' },
];

export const ReferralConfigPanel: React.FC = () => {
  const { showToast } = useToast();
  const { currentLang } = useLanguage();
  const [cfg, setCfg] = useState<SevaReferralConfig>(DEFAULT_REFERRAL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReferralConfig()
      .then(setCfg)
      .catch(() => setCfg(DEFAULT_REFERRAL_CONFIG))
      .finally(() => setLoading(false));
  }, []);

  const setDir = (dir: ReferralDirection, patch: Partial<{ enabled: boolean; percent: number }>) =>
    setCfg((c) => ({ ...c, [dir]: { ...c[dir], ...patch } }));

  const save = async () => {
    setSaving(true);
    try {
      await saveReferralConfig(cfg);
      showToast('Referral guidance settings saved.', 'success');
    } catch (err: unknown) {
      console.error(err);
      showToast(friendlyErrorText(err, currentLang, 'save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-stone-400">Loading referral settings…</p>;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-5">
      <div>
        <h3 className="font-black text-stone-900">🤝 Referral guidance credits</h3>
        <p className="text-xs text-stone-500 mt-1">
          The referring professional earns a share of the referred seva's value — paid from the
          platform's own commission, capped at what the platform earned, never from the other
          provider's dakshina.
        </p>
      </div>

      {DIRECTIONS.map(({ key, label }) => (
        <div key={key} className="rounded-xl border border-stone-200 p-4 space-y-3">
          <p className="text-sm font-bold text-stone-800">{label}</p>
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={cfg[key].enabled}
              onChange={(e) => setDir(key, { enabled: e.target.checked })}
              className="w-5 h-5 accent-amber-600"
            />
            <span className="text-sm text-stone-700">Guidance credits enabled</span>
          </label>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              Referral %
            </label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={cfg[key].percent}
              disabled={!cfg[key].enabled}
              onChange={(e) => setDir(key, { percent: Number(e.target.value) })}
              className="w-24 px-3 py-2.5 rounded-xl border border-stone-300 text-sm min-h-[44px] disabled:opacity-40"
            />
            <span className="text-xs text-stone-400">
              of the referred seva's value · capped at the platform's commission
            </span>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-black disabled:opacity-50 min-h-[44px]"
      >
        {saving ? 'Saving…' : 'Save guidance settings'}
      </button>
    </div>
  );
};
