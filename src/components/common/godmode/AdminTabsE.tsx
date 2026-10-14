/**
 * AdminTabsE — Console 3.0: Platform Settings + Support Inbox.
 * Spark-native (firestoreAdmin direct).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ToggleLeft, ToggleRight, Save, Plus, Inbox, CheckCircle2,
  MailOpen, Search, Wrench, CreditCard, AlertTriangle,
} from 'lucide-react';
import { firestoreAdmin } from '../../../lib/firestoreAdmin';
import { useToast } from '../../../context/ToastContext';
import { optimizeQrImage, type QrOptimizeResult } from '../../../lib/qrOptimizer';
import { CCard as Card, CEmpty as Empty, CLoading as Loading, CSubTabs as SubTabs, cInputCls as inputCls } from './AdminTabsD';

/** QR upload with client-side auto-optimization (crop → 512×512 PNG). */
const QrUploadOptimizer: React.FC<{ onOptimized: (dataUrl: string, blob: Blob) => void }> = ({ onOptimized }) => {
  const { showToast } = useToast();
  const [working, setWorking] = React.useState(false);
  const [result, setResult] = React.useState<QrOptimizeResult | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('Please choose an image file.', 'error'); return; }
    setWorking(true); setResult(null);
    setPreviewUrl(URL.createObjectURL(f));
    const r = await optimizeQrImage(f);
    setWorking(false); setResult(r);
    if (r.ok && r.blob && r.dataUrl) {
      onOptimized(r.dataUrl, r.blob);
      showToast(`QR optimized: ${r.width}×${r.height}, ${r.reduction}% smaller.`, 'success');
    } else {
      showToast(r.error || 'Optimization failed.', 'error');
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-600 p-3 bg-slate-950/50">
      <p className="text-[11px] font-bold text-slate-300 mb-1">📷 Upload new QR (auto-optimized)</p>
      <p className="text-[10px] text-slate-500 mb-2">We auto-crop to the QR, add a quiet zone, resize to 512×512 PNG. Or paste an image URL in the field above.</p>
      <input type="file" accept="image/*" disabled={working}
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="block w-full text-xs text-slate-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-saffron-500 file:text-slate-950 min-h-[44px]" />
      {working && <p className="text-xs text-slate-400 mt-2">Optimizing…</p>}
      {previewUrl && result?.ok && (
        <div className="flex gap-3 mt-3 items-start">
          <div><p className="text-[10px] text-slate-500 mb-1">Original ({(result.originalSize / 1024).toFixed(0)} KB)</p>
            <img src={previewUrl} alt="original" className="w-24 h-24 object-contain bg-white rounded-lg" /></div>
          <div><p className="text-[10px] text-slate-500 mb-1">Optimized ({(result.optimizedSize / 1024).toFixed(0)} KB · −{result.reduction}%)</p>
            <img src={result.dataUrl} alt="optimized" className="w-24 h-24 object-contain bg-white rounded-lg border-2 border-emerald-500/50" /></div>
        </div>
      )}
      {result && !result.ok && <p className="text-xs text-red-400 mt-2">{result.error}</p>}
      <p className="text-[10px] text-slate-600 mt-2">Note: to make it live in the app, save this method, then upload the optimized PNG to <span className="font-mono">public/bangla-qr.png</span> via GitHub web UI (or set the QR image URL above to a hosted link).</p>
    </div>
  );
};

/* ---------------------------- Platform Settings --------------------------- */

const FlagsView: React.FC = () => {
  const { showToast } = useToast();
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.featureFlags();
    if (r.ok) setFlags(r.data.flags);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (f: any) => {
    setWorking(true);
    const r = await firestoreAdmin.featureFlagSet(f.key || f.id, !f.enabled, f.description);
    setWorking(false);
    if (r.ok) { showToast(`“${f.key || f.id}” ${!f.enabled ? 'enabled' : 'disabled'}.`, 'success'); load(); }
    else showToast(r.error || 'Failed.', 'error');
  };

  const add = async () => {
    if (!newKey.trim()) return;
    setWorking(true);
    const r = await firestoreAdmin.featureFlagSet(newKey.trim(), true, 'Added from console');
    setWorking(false);
    if (r.ok) { showToast('Flag created (ON).', 'success'); setNewKey(''); load(); }
    else showToast(r.error || 'Failed.', 'error');
  };

  const SUGGESTED = ['sangam_enabled', 'marketplace_enabled', 'purohit_booking', 'jyotish_booking', 'announcements_enabled'];

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Kill-switches for major modules. The app reads these at startup; turning one off hides the module for all users.
      </p>
      {flags.length === 0 && (
        <Card className="border-dashed">
          <p className="text-xs text-slate-500 mb-2">No flags yet. Suggested:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.map((k) => (
              <button key={k} type="button" onClick={() => setNewKey(k)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-[11px] font-mono text-saffron-300 hover:bg-slate-700 min-h-[36px]">{k}</button>
            ))}
          </div>
        </Card>
      )}
      {flags.map((f) => (
        <button key={f.id} type="button" onClick={() => toggle(f)} disabled={working}
          className="w-full flex items-center gap-3 p-3.5 min-h-[60px] rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-saffron-500/40 text-left disabled:opacity-50">
          {f.enabled
            ? <ToggleRight className="w-7 h-7 text-emerald-400 shrink-0" />
            : <ToggleLeft className="w-7 h-7 text-slate-600 shrink-0" />}
          <span className="flex-1 min-w-0">
            <span className="font-mono text-xs text-slate-200 block truncate">{f.key || f.id}</span>
            {f.description && <span className="text-[11px] text-slate-500 block truncate">{f.description}</span>}
          </span>
          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${f.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
            {f.enabled ? 'on' : 'off'}
          </span>
        </button>
      ))}
      <Card>
        <h4 className="text-xs font-bold text-slate-300 mb-2">Add flag</h4>
        <div className="flex gap-2">
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="e.g. sangam_enabled"
            className={inputCls + ' font-mono'} />
          <button type="button" onClick={add} disabled={working || !newKey.trim()}
            className="px-5 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-xs font-black disabled:opacity-50">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
};

const PlansView: React.FC = () => {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.plansList();
    if (r.ok) setPlans(r.data.plans);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const blank = { id: '', name: '', priceMonthly: 0, priceYearly: 0, currency: 'INR', limits: {}, active: true };

  const save = async () => {
    if (!form?.id?.trim() || !form?.name?.trim()) { showToast('Plan ID and name are required.', 'error'); return; }
    setWorking(true);
    const r = await firestoreAdmin.planSave({ ...form, id: form.id.trim().toUpperCase() });
    setWorking(false);
    if (r.ok) { showToast('Plan saved. Overrides built-in pricing when present.', 'success'); setForm(null); load(); }
    else showToast(r.error || 'Save failed.', 'error');
  };

  const seedPricing = async () => {
    setWorking(true);
    const r = await firestoreAdmin.seedPlans();
    setWorking(false);
    if (r.ok) { showToast(`Final pricing seeded (${r.data.seeded} plans).`, 'success'); load(); }
    else showToast(r.error || 'Seed failed.', 'error');
  };

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Plans defined here override the built-in pricing. Changing a price affects new subscriptions immediately.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={seedPricing} disabled={working}
          className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 disabled:opacity-50">
          <RefreshCw className="w-4 h-4" /> Seed final pricing
        </button>
        <button type="button" onClick={() => setForm(blank)}
          className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-xs font-black">
          <Plus className="w-4 h-4" /> New plan
        </button>
      </div>
      {plans.length === 0 && <Empty text="No plan overrides. Built-in pricing (LITE ₹0 / STANDARD ₹1,499 / ENTERPRISE ₹4,999) applies." />}
      {plans.map((p) => (
        <Card key={p.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-white text-sm">{p.name} <span className="font-mono text-[11px] text-slate-500">{p.id}</span></p>
              <p className="text-xs text-slate-400 mt-1">
                ₹{Number(p.priceMonthly || 0).toLocaleString('en-IN')}/mo · ₹{Number(p.priceYearly || 0).toLocaleString('en-IN')}/yr
              </p>
              {p.limits && Object.keys(p.limits).length > 0 && (
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  {Object.entries(p.limits).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${p.active !== false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                {p.active !== false ? 'active' : 'off'}
              </span>
              <button type="button" aria-label="Edit plan"
                onClick={() => setForm({ ...p, limits: p.limits || {} })}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700">Edit</button>
            </div>
          </div>
        </Card>
      ))}
      {form && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-4">Plan editor</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })}
                  placeholder="PLAN_ID" className={inputCls + ' font-mono'} />
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Display name" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-slate-500">₹ / month<input type="number" value={form.priceMonthly}
                  onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })} className={inputCls} /></label>
                <label className="text-[11px] text-slate-500">₹ / year<input type="number" value={form.priceYearly}
                  onChange={(e) => setForm({ ...form, priceYearly: Number(e.target.value) })} className={inputCls} /></label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['devotees', 'transactions', 'seats'].map((k) => (
                  <label key={k} className="text-[11px] text-slate-500 capitalize">{k}
                    <input type="number" value={form.limits?.[k] ?? ''}
                      onChange={(e) => setForm({ ...form, limits: { ...form.limits, [k]: Number(e.target.value) } })}
                      className={inputCls} /></label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300 min-h-[44px]">
                <input type="checkbox" checked={form.active !== false}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-5 h-5 accent-amber-500" /> Active
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm(null)} className="flex-1 py-3 min-h-[44px] rounded-xl bg-slate-800 text-sm font-bold text-slate-300">Cancel</button>
                <button type="button" onClick={save} disabled={working}
                  className="flex-1 py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-black disabled:opacity-50">
                  {working ? 'Saving…' : 'Save plan'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MaintenanceView: React.FC = () => {
  const { showToast } = useToast();
  const [cfg, setCfg] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.platformConfigGet();
    if (r.ok) setCfg(r.data.config || {});
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setWorking(true);
    const r = await firestoreAdmin.platformConfigSet({
      maintenanceMode: !!cfg.maintenanceMode,
      maintenanceMessage: cfg.maintenanceMessage || '',
    });
    setWorking(false);
    if (r.ok) showToast('Platform config saved.', 'success');
    else showToast(r.error || 'Save failed.', 'error');
  };

  if (loading) return <Loading />;
  return (
    <Card className={cfg.maintenanceMode ? 'border-red-500/40' : ''}>
      <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
        <Wrench className="w-4 h-4 text-slate-400" /> Maintenance mode
      </h4>
      {cfg.maintenanceMode && (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> Maintenance mode is ON — users will see the message below.
        </p>
      )}
      <button type="button" onClick={() => setCfg({ ...cfg, maintenanceMode: !cfg.maintenanceMode })}
        className={`w-full flex items-center justify-center gap-2 py-3 min-h-[52px] rounded-xl text-sm font-black mb-3 ${
          cfg.maintenanceMode ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'
        }`}>
        {cfg.maintenanceMode ? 'Turn maintenance OFF' : 'Turn maintenance ON'}
      </button>
      <label className="text-[11px] text-slate-500">Message shown to users
        <textarea value={cfg.maintenanceMessage || ''} rows={3}
          onChange={(e) => setCfg({ ...cfg, maintenanceMessage: e.target.value })}
          placeholder="We are performing scheduled maintenance. Please check back soon. 🙏"
          className={inputCls + ' mt-1'} />
      </label>
      <button type="button" onClick={save} disabled={working}
        className="mt-3 w-full py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2">
        <Save className="w-4 h-4" /> {working ? 'Saving…' : 'Save config'}
      </button>
      <p className="text-[11px] text-slate-500 mt-3">
        Note: the app shell needs a small update to actually read this flag and show the banner — the data model is ready.
      </p>
    </Card>
  );
};

export const SettingsTab: React.FC = () => {
  const [sub, setSub] = useState('Feature Flags');
  return (
    <div className="space-y-4">
      <SubTabs tabs={['Feature Flags', 'Plans', 'Payment Methods', 'Maintenance']} active={sub} onChange={setSub} />
      {sub === 'Feature Flags' && <FlagsView />}
      {sub === 'Plans' && <PlansView />}
      {sub === 'Payment Methods' && <PaymentsView />}
      {sub === 'Maintenance' && <MaintenanceView />}
    </div>
  );
};

/* ----------------------------- Payment Methods ---------------------------- */

const PM_FIELD_DEFS: { key: string; label: string; hint: string }[] = [
  { key: 'label', label: 'Label', hint: 'Display name, e.g. Bangla QR (TallyPay)' },
  { key: 'number', label: 'Number', hint: 'Mobile / merchant number' },
  { key: 'merchantName', label: 'Merchant name', hint: 'Shown under the QR' },
  { key: 'qrImageUrl', label: 'QR image URL', hint: '/bangla-qr.png or a full https URL' },
  { key: 'upiId', label: 'UPI ID', hint: 'India UPI VPA' },
  { key: 'accountName', label: 'Account name', hint: 'Wise / Payoneer holder name' },
  { key: 'accountDetails', label: 'Account details', hint: 'Wise account / routing details' },
  { key: 'accountEmail', label: 'Account email', hint: 'Payoneer email' },
  { key: 'link', label: 'Payment link', hint: 'Wise pay link / Payoneer URL' },
];

const PaymentsView: React.FC = () => {
  const { showToast } = useToast();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.paymentMethodsList();
    if (r.ok) setMethods(r.data.methods);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    setWorking(true);
    const r = await firestoreAdmin.seedPaymentMethods();
    setWorking(false);
    if (r.ok) { showToast(`Seeded ${r.data.seeded} payment method(s).`, 'success'); load(); }
    else showToast(r.error || 'Seed failed.', 'error');
  };

  const openEdit = (m: any) => {
    setEditing(m);
    setForm({
      label: m.label || '',
      enabled: m.enabled !== false,
      number: m.number || '',
      merchantName: m.merchantName || '',
      qrImageUrl: m.qrImageUrl || '',
      upiId: m.upiId || '',
      accountName: m.accountName || '',
      accountDetails: m.accountDetails || '',
      accountEmail: m.accountEmail || '',
      link: m.link || '',
      instructionsEn: Array.isArray(m.instructionsEn) ? m.instructionsEn.join('\n') : (m.instructionsEn || ''),
      instructionsBn: Array.isArray(m.instructionsBn) ? m.instructionsBn.join('\n') : (m.instructionsBn || ''),
    });
  };

  const save = async () => {
    if (!editing) return;
    setWorking(true);
    const r = await firestoreAdmin.paymentMethodSave(editing.id, form);
    setWorking(false);
    if (r.ok) { showToast('Payment method saved.', 'success'); setEditing(null); load(); }
    else showToast(r.error || 'Save failed.', 'error');
  };

  const toggle = async (m: any) => {
    setWorking(true);
    const r = await firestoreAdmin.paymentMethodSave(m.id, { enabled: !(m.enabled !== false) });
    setWorking(false);
    if (r.ok) { showToast(`“${m.label || m.id}” ${m.enabled !== false ? 'disabled' : 'enabled'}.`, 'success'); load(); }
    else showToast(r.error || 'Failed.', 'error');
  };

  const regionName = (r: string) => (r === 'BD' ? '🇧🇩 Bangladesh' : r === 'IN' ? '🇮🇳 India' : '🌍 International');

  if (loading) return <Loading text="Loading payment methods…" />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        These are what users see on the billing page, per region. Toggle a method off to hide it instantly.
        QR image: upload your merchant QR via the GitHub web UI to <span className="font-mono text-saffron-300">public/bangla-qr.png</span> (drag &amp; drop),
        or paste any full image URL in the QR field below. Until then the billing page shows a placeholder.
      </p>
      {methods.length === 0 && (
        <Card className="border-dashed">
          <p className="text-xs text-slate-500 mb-3">No payment methods configured yet. Seed the defaults:</p>
          <button type="button" onClick={seed} disabled={working}
            className="px-5 py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-xs font-black disabled:opacity-50">
            {working ? 'Seeding…' : 'Seed default methods'}
          </button>
        </Card>
      )}
      {['BD', 'IN', 'INTL'].map((region) => {
        const list = methods.filter((m) => (m.region || 'INTL') === region);
        if (list.length === 0) return null;
        return (
          <div key={region} className="space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">{regionName(region)}</h4>
            {list.map((m) => (
              <Card key={m.id}>
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => toggle(m)} disabled={working}
                    className="shrink-0 mt-0.5 disabled:opacity-50" aria-label="Toggle enabled">
                    {m.enabled !== false
                      ? <ToggleRight className="w-7 h-7 text-emerald-400" />
                      : <ToggleLeft className="w-7 h-7 text-slate-600" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">{m.label || m.id}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {[m.number, m.upiId, m.accountEmail].filter(Boolean).join(' · ') || m.type}
                    </p>
                  </div>
                  <button type="button" onClick={() => openEdit(m)}
                    className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-200 shrink-0">
                    Edit
                  </button>
                </div>
              </Card>
            ))}
          </div>
        );
      })}

      {editing && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-1">Edit {editing.label || editing.id}</h3>
            <p className="text-[11px] text-slate-500 font-mono mb-4">{editing.id} · {editing.region} · {editing.type}</p>
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
                <input type="checkbox" checked={!!form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500" />
                <span className="text-sm text-slate-200 font-bold">Enabled (visible to users)</span>
              </label>
              {PM_FIELD_DEFS.map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">{f.label}</label>
                  <input value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.hint} className={inputCls} />
                  {f.key === 'qrImageUrl' && (
                    <div className="mt-2">
                      <QrUploadOptimizer onOptimized={(dataUrl) => setForm({ ...form, qrImageUrl: dataUrl })} />
                    </div>
                  )}
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Instructions — English (one step per line)</label>
                <textarea value={form.instructionsEn} onChange={(e) => setForm({ ...form, instructionsEn: e.target.value })}
                  rows={5} className={inputCls + ' font-normal'} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Instructions — বাংলা (one step per line)</label>
                <textarea value={form.instructionsBn} onChange={(e) => setForm({ ...form, instructionsBn: e.target.value })}
                  rows={5} className={inputCls + ' font-normal'} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditing(null)}
                  className="flex-1 py-3 min-h-[44px] rounded-xl bg-slate-800 text-sm font-bold text-slate-300">Cancel</button>
                <button type="button" onClick={save} disabled={working}
                  className="flex-1 py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-black disabled:opacity-50">
                  {working ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Support Inbox ----------------------------- */

export const SupportTab: React.FC = () => {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [reply, setReply] = useState({ title: '', body: '' });
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.supportLeads(filter);
    if (r.ok) setLeads(r.data.leads);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [filter, showToast]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: 'new' | 'contacted' | 'resolved') => {
    const r = await firestoreAdmin.supportLeadSetStatus(id, status);
    if (r.ok) {
      showToast(`Marked ${status}.`, 'success');
      setSel((s: any) => (s && s.id === id ? { ...s, status } : s));
      load();
    } else showToast(r.error || 'Failed.', 'error');
  };

  const sendReply = async () => {
    if (!sel || !reply.title.trim() || !reply.body.trim()) { showToast('Title and message are required.', 'error'); return; }
    setWorking(true);
    const r = await firestoreAdmin.supportLeadReply(sel.id, reply.title, reply.body);
    setWorking(false);
    if (r.ok) {
      showToast(r.data.inboxDelivered ? 'Reply sent to their inbox.' : 'Marked contacted (no app account found for this email).', 'success');
      setReply({ title: '', body: '' });
      setSel(null);
      load();
    } else showToast(r.error || 'Failed.', 'error');
  };

  const visible = search.trim()
    ? leads.filter((l) => JSON.stringify(l).toLowerCase().includes(search.trim().toLowerCase()))
    : leads;

  const statusCls = (s: string) =>
    s === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' : s === 'contacted' ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300';

  if (loading) return <Loading text="Loading inquiries…" />;
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto">
        {['all', 'new', 'contacted', 'resolved'].map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold capitalize shrink-0 ${
              filter === s ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}>{s}</button>
        ))}
      </div>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inquiries…"
          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500" />
      </div>
      {visible.length === 0 && <Empty text="No inquiries in this state. New /contact submissions appear here." />}
      {visible.map((l) => (
        <Card key={l.id}>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0">
              <p className="font-bold text-white text-sm">{l.name || 'Unnamed'}</p>
              <p className="text-[11px] text-slate-500">{l.institution || ''}{l.orgType ? ` · ${l.orgType}` : ''}</p>
              <p className="text-[11px] text-slate-500 font-mono">{l.email || ''}{l.phone ? ` · ${l.phone}` : ''}</p>
            </div>
            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${statusCls(l.status || 'new')}`}>
              {l.status || 'new'}
            </span>
          </div>
          <p className="text-xs text-slate-300 bg-slate-900 rounded-xl p-3 mb-3 line-clamp-3">{l.message}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSel(l)}
              className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-saffron-500/20 text-saffron-300 text-xs font-black border border-saffron-500/30 flex items-center justify-center gap-1.5">
              <MailOpen className="w-4 h-4" /> Reply
            </button>
            {(l.status || 'new') !== 'resolved' && (
              <button type="button" onClick={() => setStatus(l.id, 'resolved')}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-emerald-600/20 text-emerald-300 text-xs font-black border border-emerald-500/30 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Resolve
              </button>
            )}
          </div>
        </Card>
      ))}

      {sel && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-1">Reply to {sel.name}</h3>
            <p className="text-[11px] text-slate-500 font-mono mb-4">{sel.email}</p>
            <div className="bg-slate-950 rounded-xl p-3 mb-4">
              <p className="text-[11px] text-slate-500 mb-1">Their message:</p>
              <p className="text-xs text-slate-300">{sel.message}</p>
            </div>
            <div className="space-y-3">
              <input value={reply.title} onChange={(e) => setReply({ ...reply, title: e.target.value })}
                placeholder="Subject" className={inputCls} />
              <textarea value={reply.body} onChange={(e) => setReply({ ...reply, body: e.target.value })}
                placeholder="Your reply…" rows={5} className={inputCls} />
              <p className="text-[11px] text-slate-500">
                Delivered to their in-app inbox if they have an account; otherwise the inquiry is marked contacted.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSel(null)} className="flex-1 py-3 min-h-[44px] rounded-xl bg-slate-800 text-sm font-bold text-slate-300">Cancel</button>
                <button type="button" onClick={sendReply} disabled={working}
                  className="flex-1 py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-black disabled:opacity-50">
                  {working ? 'Sending…' : 'Send reply'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Unused-icon guard (keeps tree-shaken imports honest) */
export const _SettingsIcons = { Inbox, Wrench, CreditCard, RefreshCw };
