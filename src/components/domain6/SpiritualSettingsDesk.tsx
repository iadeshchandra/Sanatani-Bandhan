import React, { useState } from 'react';
import { Compass, Plus, Save, Sparkles, Sun, Trash2 } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { executeSafeUpdate } from '../../lib/dbUtils';
import { useLanguage } from '../../context/LanguageContext';
import { friendlyError } from '../../lib/friendlyError';

/**
 * SpiritualSettingsDesk — QUEUED #58 (audit A1-D02).
 *
 * The real desk behind the catalog's "Sampradaya & Kuladevata Config".
 * Until #58 this module id mounted a fake "Module Upgrading — over-the-air
 * update" placeholder in App.tsx. The fields it edits are the workspace's
 * own, already-persisted identity data (WorkspaceConfig.sampradaya /
 * kuladevata / darshanTimings — the same record MasterSettingsDesk saves
 * through, and the timings the public org page publishes), so the desk is
 * a small honest editor over real data, saved through the exact path
 * MasterSettingsDesk uses (updateWorkspaceDetails + executeSafeUpdate).
 */

const SAMPRADAYA_SUGGESTIONS = [
  'Smarta / Advaita',
  'Sri Vaishnava',
  'Gaudiya Vaishnava',
  'Madhva (Dvaita)',
  'Shaiva Siddhanta',
  'Shakta',
  'Swaminarayan Sampradaya',
  'ISKCON',
  'Nath Sampradaya',
  'Kabir Panth',
  'Varkari Sampradaya',
  'Ramakrishna Mission',
];

const KULADEVATA_SUGGESTIONS = [
  'Lord Shiva',
  'Lord Vishnu',
  'Lord Venkateswara',
  'Lord Krishna',
  'Lord Rama',
  'Lord Ganesha',
  'Maa Durga',
  'Maa Kali',
  'Maa Lakshmi',
  'Maa Saraswati',
  'Lord Hanuman',
  'Lord Ayyappa',
];

interface TimingRow {
  label: string;
  time: string;
}

export const SpiritualSettingsDesk: React.FC = () => {
  const { t } = useLanguage();
  const { activeWorkspace, updateWorkspaceDetails, checkPermission } = useAuthWorkspace();
  const { showToast } = useToast();

  const isTrustee = checkPermission(['TRUSTEE']);

  const [sampradaya, setSampradaya] = useState(activeWorkspace?.sampradaya || '');
  const [kuladevata, setKuladevata] = useState(activeWorkspace?.kuladevata || '');
  const [timings, setTimings] = useState<TimingRow[]>(
    Array.isArray(activeWorkspace?.darshanTimings)
      ? activeWorkspace.darshanTimings.map((t) => ({ label: t.label || '', time: t.time || '' }))
      : []
  );
  const [saving, setSaving] = useState(false);

  const updateTiming = (idx: number, patch: Partial<TimingRow>) => {
    setTimings((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const handleSave = async () => {
    if (!isTrustee) {
      showToast('Only Trustees can modify spiritual settings.', 'error');
      return;
    }
    setSaving(true);
    try {
      const updates = {
        sampradaya: sampradaya.trim(),
        kuladevata: kuladevata.trim(),
        darshanTimings: timings
          .map((t) => ({ label: t.label.trim(), time: t.time.trim() }))
          .filter((t) => t.label || t.time),
      };
      updateWorkspaceDetails(updates);
      await executeSafeUpdate('workspaces', activeWorkspace?.id, updates, 'update');
      showToast('Spiritual settings saved — the app now speaks your parampara.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(friendlyError(err, t, 'save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-800 font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition disabled:bg-stone-50 disabled:text-stone-500';

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 ring-1 ring-black/5 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-amber-100/60 blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Sampradaya &amp; Kuladevata
            </h2>
            <p className="text-sm text-stone-500 font-medium mt-1 max-w-xl leading-relaxed">
              {activeWorkspace?.name || 'This workspace'} — configure your sampradaya, kuladevata,
              and darshan traditions. The app speaks your parampara: these details shape the
              workspace&apos;s identity and its public page.
            </p>
            {!isTrustee && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                View only — a Trustee can edit these settings.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Parampara identity */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 ring-1 ring-black/5 p-6 sm:p-8 space-y-5">
        <h3 className="text-sm font-black uppercase tracking-widest text-stone-700">
          Parampara Identity
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
              Sampradaya (Tradition)
            </label>
            <input
              type="text"
              list="sb-sampradaya-suggestions"
              value={sampradaya}
              onChange={(e) => setSampradaya(e.target.value)}
              disabled={!isTrustee}
              placeholder="e.g. Gaudiya Vaishnava"
              className={inputCls}
            />
            <datalist id="sb-sampradaya-suggestions">
              {SAMPRADAYA_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
              Kuladevata (Family / Presiding Deity)
            </label>
            <input
              type="text"
              list="sb-kuladevata-suggestions"
              value={kuladevata}
              onChange={(e) => setKuladevata(e.target.value)}
              disabled={!isTrustee}
              placeholder="e.g. Maa Kamakhya"
              className={inputCls}
            />
            <datalist id="sb-kuladevata-suggestions">
              {KULADEVATA_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>
        <p className="text-xs text-stone-400 font-medium leading-relaxed">
          Pick from the suggestions or write your own — what matters is that it is truly yours.
        </p>
      </div>

      {/* Darshan & aarti timings */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 ring-1 ring-black/5 p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-stone-700 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              Darshan &amp; Aarti Timings
            </h3>
            <p className="text-xs text-stone-400 font-medium mt-1">
              Published on your organisation&apos;s public page so devotees can plan their visit.
            </p>
          </div>
          {isTrustee && (
            <button
              type="button"
              onClick={() => setTimings((prev) => [...prev, { label: '', time: '' }])}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Add timing
            </button>
          )}
        </div>

        {timings.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-stone-200 bg-stone-50/60">
            <Sun className="w-8 h-8 mx-auto text-amber-500/70 mb-2" />
            <p className="text-sm font-bold text-stone-600">No darshan timings published yet</p>
            <p className="text-xs text-stone-400 font-medium mt-1 max-w-sm mx-auto leading-relaxed">
              Add your Mangala Aarti, Rajbhog, and Sandhya Aarti times — devotees will see them on
              the public page before they travel.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {timings.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => updateTiming(idx, { label: e.target.value })}
                  disabled={!isTrustee}
                  placeholder="e.g. Mangala Aarti"
                  className={`${inputCls} flex-[2] min-w-[160px]`}
                  aria-label="Timing label"
                />
                <input
                  type="text"
                  value={row.time}
                  onChange={(e) => updateTiming(idx, { time: e.target.value })}
                  disabled={!isTrustee}
                  placeholder="e.g. 5:00 AM"
                  className={`${inputCls} flex-1 min-w-[110px]`}
                  aria-label="Timing time"
                />
                {isTrustee && (
                  <button
                    type="button"
                    onClick={() => setTimings((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-2.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Remove this timing"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save */}
      {isTrustee && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-black shadow-md transition-all cursor-pointer min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Spiritual Settings'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SpiritualSettingsDesk;
