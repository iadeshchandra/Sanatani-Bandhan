/**
 * GeoPaymentsManager.tsx — GodMode geo-based payment management.
 * ============================================================================
 * Owner-only manager for the geo payment system:
 *  - Region overview cards (BD / IN / INTL + custom regions)
 *  - Payment method CRUD per region (enable/disable, edit, delete, add, reorder)
 *  - Region detection rules (phone country codes, default region fallback)
 *  - Extensible region model — new regions (UK, USA, AE…) can be added
 *
 * Data:
 *  - paymentMethods/{id} — method docs (existing collection)
 *  - geoPaymentConfig/config — { regions: RegionConfig[], defaultRegion }
 *
 * All writes go through firestoreAdmin (owner-gated). Spark-native.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Plus, Pencil, Trash2, Power, ChevronUp, ChevronDown,
  Copy, Check, X, RefreshCw, MapPin, Smartphone, AlertTriangle,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import * as firestoreAdmin from '../../lib/firestoreAdmin';
import {
  getGeoPaymentConfig, DEFAULT_GEO_CONFIG,
  type RegionConfig, type GeoPaymentConfig,
} from '../../lib/geoDetect';
import { getPaymentMethods, clearPaymentMethodsCache, type PaymentMethodDoc, type PaymentMethodType } from '../../lib/paymentMethods';
import { QrCodeManager } from '../godmode/QrCodeManager';

const METHOD_TYPES: { id: PaymentMethodType; label: string }[] = [
  { id: 'bangla_qr', label: 'Bangla QR' },
  { id: 'mobile', label: 'Mobile (bKash/Nagad/Rocket)' },
  { id: 'upi', label: 'UPI' },
  { id: 'wise', label: 'Wise' },
  { id: 'payoneer', label: 'Payoneer' },
  { id: 'bank', label: 'Bank Transfer' },
  { id: 'crypto', label: 'Crypto' },
];

const typeLabel = (t: string) => METHOD_TYPES.find((x) => x.id === t)?.label || t;

const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-sanatani-orange outline-none';
const labelCls = 'text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1 block';

/* ------------------------- Method editor modal ------------------------- */

interface MethodForm {
  id: string;
  region: string;
  type: PaymentMethodType;
  label: string;
  enabled: boolean;
  number: string;
  merchantName: string;
  qrImageUrl: string;
  upiId: string;
  accountName: string;
  accountDetails: string;
  accountEmail: string;
  link: string;
  instructionsEn: string;
  instructionsBn: string;
}

const emptyMethodForm = (region: string): MethodForm => ({
  id: '', region, type: 'mobile', label: '', enabled: true,
  number: '', merchantName: '', qrImageUrl: '', upiId: '',
  accountName: '', accountDetails: '', accountEmail: '', link: '',
  instructionsEn: '', instructionsBn: '',
});

const MethodModal: React.FC<{
  form: MethodForm;
  setForm: (f: MethodForm) => void;
  regions: RegionConfig[];
  isNew: boolean;
  onSave: () => void;
  onClose: () => void;
  working: boolean;
}> = ({ form, setForm, regions, isNew, onSave, onClose, working }) => {
  const set = (k: keyof MethodForm, v: string | boolean) => setForm({ ...form, [k]: v });
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-800">{isNew ? 'Add Payment Method' : 'Edit Payment Method'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          {isNew && (
            <div>
              <label className={labelCls}>Method ID (lowercase, a-z 0-9 _)</label>
              <input className={inputCls} value={form.id} onChange={(e) => set('id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="e.g. uk_bank" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Region</label>
              <select className={inputCls} value={form.region} onChange={(e) => set('region', e.target.value)}>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.flag} {r.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={(e) => set('type', e.target.value as PaymentMethodType)}>
                {METHOD_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Label</label>
            <input className={inputCls} value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Display name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Number</label>
              <input className={inputCls} value={form.number} onChange={(e) => set('number', e.target.value)} placeholder="Mobile / merchant number" />
            </div>
            <div>
              <label className={labelCls}>Merchant name</label>
              <input className={inputCls} value={form.merchantName} onChange={(e) => set('merchantName', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>QR image URL</label>
            <input className={inputCls} value={form.qrImageUrl} onChange={(e) => set('qrImageUrl', e.target.value)} placeholder="/upi-qr.png or https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>UPI ID</label>
              <input className={inputCls} value={form.upiId} onChange={(e) => set('upiId', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Payment link</label>
              <input className={inputCls} value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Account name</label>
              <input className={inputCls} value={form.accountName} onChange={(e) => set('accountName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Account email</label>
              <input className={inputCls} value={form.accountEmail} onChange={(e) => set('accountEmail', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Account details</label>
            <input className={inputCls} value={form.accountDetails} onChange={(e) => set('accountDetails', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Instructions (English, one per line)</label>
            <textarea className={inputCls} rows={3} value={form.instructionsEn} onChange={(e) => set('instructionsEn', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Instructions (Bangla, one per line)</label>
            <textarea className={inputCls} rows={3} value={form.instructionsBn} onChange={(e) => set('instructionsBn', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="w-4 h-4" />
            Enabled (visible to users)
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">Cancel</button>
          <button onClick={onSave} disabled={working} className="flex-1 py-3 rounded-xl bg-sanatani-orange text-white text-sm font-black disabled:opacity-50">
            {working ? 'Saving…' : 'Save Method'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------- Region editor modal ------------------------- */

type RegionForm = RegionConfig;

const emptyRegionForm = (): RegionForm => ({
  id: '', name: '', currency: 'USD', currencySymbol: '$',
  countryCodes: [], ipCountries: [], enabled: true, flag: '',
});

const RegionModal: React.FC<{
  form: RegionForm;
  setForm: (f: RegionForm) => void;
  isNew: boolean;
  onSave: () => void;
  onClose: () => void;
  working: boolean;
}> = ({ form, setForm, isNew, onSave, onClose, working }) => {
  const set = (k: string, v: any) => setForm({ ...form, [k]: v } as RegionForm);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-800">{isNew ? 'Add Region' : 'Edit Region'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Region ID</label>
              <input className={inputCls} value={form.id} disabled={!isNew}
                onChange={(e) => set('id', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                placeholder="UK" />
              <p className="text-[10px] text-gray-400 mt-1">2–10 chars, A–Z 0–9. Can't change later.</p>
            </div>
            <div>
              <label className={labelCls}>Flag emoji</label>
              <input className={inputCls} value={form.flag || ''} onChange={(e) => set('flag', e.target.value)} placeholder="🇬🇧" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="United Kingdom" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Currency code</label>
              <input className={inputCls} value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase().slice(0, 10))} placeholder="GBP" />
            </div>
            <div>
              <label className={labelCls}>Currency symbol</label>
              <input className={inputCls} value={form.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value.slice(0, 8))} placeholder="£" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Phone country codes (comma-separated digits)</label>
            <input className={inputCls} value={form.countryCodes.join(', ')}
              onChange={(e) => set('countryCodes', e.target.value.split(',').map((s) => s.replace(/\D/g, '')).filter(Boolean))}
              placeholder="44" />
            <p className="text-[10px] text-gray-400 mt-1">Phone numbers starting with these digits map to this region.</p>
          </div>
          <div>
            <label className={labelCls}>IP country codes (comma-separated, ISO)</label>
            <input className={inputCls} value={form.ipCountries.join(', ')}
              onChange={(e) => set('ipCountries', e.target.value.split(',').map((s) => s.toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean))}
              placeholder="GB" />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="w-4 h-4" />
            Enabled
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">Cancel</button>
          <button onClick={onSave} disabled={working} className="flex-1 py-3 rounded-xl bg-sanatani-orange text-white text-sm font-black disabled:opacity-50">
            {working ? 'Saving…' : 'Save Region'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------- Main manager ------------------------- */

export const GeoPaymentsManager: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [config, setConfig] = useState<GeoPaymentConfig>(DEFAULT_GEO_CONFIG);
  const [methods, setMethods] = useState<PaymentMethodDoc[]>([]);
  const [activeRegion, setActiveRegion] = useState<string>('BD');
  const [subTab, setSubTab] = useState<'methods' | 'detection' | 'qr'>('methods');

  // Method modal
  const [methodModal, setMethodModal] = useState<{ form: MethodForm; isNew: boolean } | null>(null);
  // Region modal
  const [regionModal, setRegionModal] = useState<{ form: RegionForm; isNew: boolean } | null>(null);
  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethodDoc | null>(null);
  // Test detection
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getGeoPaymentConfig();
      setConfig(cfg);
      if (!cfg.regions.find((r) => r.id === activeRegion)) {
        setActiveRegion(cfg.regions[0]?.id || 'BD');
      }
      const r = await (firestoreAdmin as any).paymentMethodsList();
      if (r?.ok) {
        setMethods(r.data.methods as PaymentMethodDoc[]);
      } else {
        // Fallback to client-visible methods
        const m = await getPaymentMethods();
        setMethods(m);
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to load geo payments.', 'error');
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const saveConfig = async (next: GeoPaymentConfig) => {
    setWorking(true);
    const r = await (firestoreAdmin as any).geoConfigSave(next);
    setWorking(false);
    if (r?.ok) {
      setConfig(next);
      clearPaymentMethodsCache();
      showToast('Region configuration saved.', 'success');
      return true;
    }
    showToast(r?.error || 'Save failed.', 'error');
    return false;
  };

  /* ----- methods ----- */

  const regionMethods = methods
    .filter((m) => m.region === activeRegion)
    .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

  const toggleMethod = async (m: PaymentMethodDoc) => {
    setWorking(true);
    const r = await (firestoreAdmin as any).paymentMethodSave(m.id, { enabled: !(m.enabled !== false) });
    setWorking(false);
    if (r?.ok) {
      showToast(`"${m.label || m.id}" ${m.enabled !== false ? 'disabled' : 'enabled'}.`, 'success');
      clearPaymentMethodsCache();
      load();
    } else showToast(r?.error || 'Failed.', 'error');
  };

  const openMethodEdit = (m: PaymentMethodDoc) => {
    setMethodModal({
      isNew: false,
      form: {
        id: m.id, region: m.region, type: m.type, label: m.label || '', enabled: m.enabled !== false,
        number: m.number || '', merchantName: m.merchantName || '', qrImageUrl: m.qrImageUrl || '',
        upiId: m.upiId || '', accountName: m.accountName || '', accountDetails: m.accountDetails || '',
        accountEmail: m.accountEmail || '', link: m.link || '',
        instructionsEn: (m.instructionsEn || []).join('\n'),
        instructionsBn: (m.instructionsBn || []).join('\n'),
      },
    });
  };

  const saveMethod = async () => {
    if (!methodModal) return;
    const { form, isNew } = methodModal;
    if (isNew && !/^[a-z0-9_]{1,40}$/.test(form.id)) {
      showToast('Method ID must be 1–40 chars: a–z, 0–9, _', 'error');
      return;
    }
    if (!form.label.trim()) { showToast('Label is required.', 'error'); return; }
    setWorking(true);
    const r = await (firestoreAdmin as any).paymentMethodSave(form.id, {
      region: form.region, type: form.type, label: form.label.trim(), enabled: form.enabled,
      number: form.number.trim(), merchantName: form.merchantName.trim(),
      qrImageUrl: form.qrImageUrl.trim(), upiId: form.upiId.trim(),
      accountName: form.accountName.trim(), accountDetails: form.accountDetails.trim(),
      accountEmail: form.accountEmail.trim(), link: form.link.trim(),
      instructionsEn: form.instructionsEn, instructionsBn: form.instructionsBn,
    });
    setWorking(false);
    if (r?.ok) {
      showToast('Payment method saved.', 'success');
      setMethodModal(null);
      clearPaymentMethodsCache();
      load();
    } else showToast(r?.error || 'Save failed.', 'error');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setWorking(true);
    const r = await (firestoreAdmin as any).paymentMethodDelete(deleteTarget.id);
    setWorking(false);
    setDeleteTarget(null);
    if (r?.ok) {
      showToast('Payment method deleted.', 'success');
      clearPaymentMethodsCache();
      load();
    } else showToast(r?.error || 'Delete failed.', 'error');
  };

  const moveMethod = async (m: PaymentMethodDoc, dir: -1 | 1) => {
    const list = regionMethods;
    const idx = list.findIndex((x) => x.id === m.id);
    const swapWith = list[idx + dir];
    if (!swapWith) return;
    // Assign explicit displayOrder to both, swapping positions
    const orderOf = (x: PaymentMethodDoc, i: number) => x.displayOrder ?? i * 10;
    const aOrder = orderOf(m, idx);
    const bOrder = orderOf(swapWith, idx + dir);
    setWorking(true);
    const r1 = await (firestoreAdmin as any).paymentMethodSave(m.id, { displayOrder: bOrder });
    const r2 = r1?.ok ? await (firestoreAdmin as any).paymentMethodSave(swapWith.id, { displayOrder: aOrder }) : r1;
    setWorking(false);
    if (r1?.ok && r2?.ok) { clearPaymentMethodsCache(); load(); }
    else showToast('Reorder failed.', 'error');
  };

  const copyText = (text: string, id: string) => {
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  };

  /* ----- regions ----- */

  const openRegionEdit = (r: RegionConfig) => {
    setRegionModal({ isNew: false, form: { ...r, countryCodes: [...r.countryCodes], ipCountries: [...r.ipCountries] } });
  };

  const saveRegion = async () => {
    if (!regionModal) return;
    const { form, isNew } = regionModal;
    if (isNew && !/^[A-Z0-9]{2,10}$/.test(form.id)) {
      showToast('Region ID must be 2–10 chars: A–Z, 0–9.', 'error');
      return;
    }
    if (!form.name.trim()) { showToast('Region name is required.', 'error'); return; }
    const next: GeoPaymentConfig = isNew
      ? { ...config, regions: [...config.regions, { ...form, id: form.id.toUpperCase() }] }
      : {
          ...config,
          regions: config.regions.map((r) => (r.id === form.id ? { ...form } : r)),
        };
    // If the edited region was the default and got disabled, keep default valid
    if (!next.regions.find((r) => r.id === next.defaultRegion)) {
      showToast('Default region must exist.', 'error');
      return;
    }
    const ok = await saveConfig(next);
    if (ok) setRegionModal(null);
  };

  const deleteRegion = async (id: string) => {
    if (config.defaultRegion === id) { showToast('Cannot delete the default region. Change the default first.', 'error'); return; }
    const hasMethods = methods.some((m) => m.region === id);
    if (hasMethods) { showToast('Region has payment methods. Delete or move them first.', 'error'); return; }
    if (!window.confirm(`Delete region "${id}"? This cannot be undone.`)) return;
    const ok = await saveConfig({ ...config, regions: config.regions.filter((r) => r.id !== id) });
    if (ok && activeRegion === id) setActiveRegion(config.regions[0]?.id || 'BD');
  };

  const toggleRegion = async (r: RegionConfig) => {
    const ok = await saveConfig({
      ...config,
      regions: config.regions.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)),
    });
    if (ok) showToast(`Region "${r.name}" ${r.enabled ? 'disabled' : 'enabled'}.`, 'success');
  };

  /* ----- test detection ----- */

  const runTestDetection = () => {
    const digits = testPhone.replace(/\D/g, '');
    if (digits.length < 7) { setTestResult('Enter at least 7 digits.'); return; }
    const sorted = [...config.regions]
      .filter((r) => r.enabled && r.countryCodes.length > 0)
      .sort((a, b) => Math.max(...b.countryCodes.map((c) => c.length)) - Math.max(...a.countryCodes.map((c) => c.length)));
    for (const r of sorted) {
      for (const code of r.countryCodes) {
        if (code && digits.startsWith(code)) {
          const reg = config.regions.find((x) => x.id === r.id);
          setTestResult(`→ ${reg?.flag || ''} ${reg?.name || r.id} (${r.id})`);
          return;
        }
      }
    }
    const def = config.regions.find((r) => r.id === config.defaultRegion);
    setTestResult(`→ ${def?.flag || ''} ${def?.name || config.defaultRegion} (${config.defaultRegion}) — default fallback`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center text-sm text-gray-500">
        <RefreshCw size={20} className="animate-spin mx-auto mb-2" /> Loading geo payments…
      </div>
    );
  }

  const activeRegionCfg = config.regions.find((r) => r.id === activeRegion);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sanatani-orange/10 flex items-center justify-center">
            <Globe size={20} className="text-sanatani-orange" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-800">Geo Payments Manager</h3>
            <p className="text-xs text-gray-500">Regions, payment methods, and detection rules for billing & wallet top-ups.</p>
          </div>
        </div>
        {/* Region overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {config.regions.map((r) => {
            const count = methods.filter((m) => m.region === r.id && m.enabled !== false).length;
            const total = methods.filter((m) => m.region === r.id).length;
            return (
              <button
                key={r.id}
                onClick={() => { setActiveRegion(r.id); setSubTab('methods'); }}
                className={`text-left rounded-2xl border p-4 transition-all hover:shadow-md ${activeRegion === r.id && subTab === 'methods' ? 'border-sanatani-orange ring-1 ring-sanatani-orange' : 'border-gray-100'} ${r.enabled ? 'bg-white' : 'bg-gray-50 opacity-70'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{r.flag || '🌐'}</span>
                  {!r.enabled && <span className="text-[10px] font-black uppercase text-gray-400">Disabled</span>}
                </div>
                <p className="text-sm font-black text-gray-800 mt-2">{r.name}</p>
                <p className="text-xs text-gray-500">{r.currency} ({r.currencySymbol}) · {r.id}</p>
                <p className="text-xs font-bold text-gray-600 mt-1">{count} active{total !== count ? ` / ${total} total` : ''} method{total === 1 ? '' : 's'}</p>
              </button>
            );
          })}
        </div>
        {/* Test detection */}
        <div className="mt-4 bg-gray-50 rounded-2xl border border-gray-100 p-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
            <Smartphone size={13} /> Test region detection
          </p>
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+880 1XXX-XXXXXX or +91 XXXXX XXXXX"
            />
            <button onClick={runTestDetection} className="px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-black whitespace-nowrap">
              Test
            </button>
          </div>
          {testResult && <p className="text-sm font-bold text-gray-700 mt-2">{testResult}</p>}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('methods')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${subTab === 'methods' ? 'bg-sanatani-orange text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
        >
          Payment Methods
        </button>
        <button
          onClick={() => setSubTab('detection')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${subTab === 'detection' ? 'bg-sanatani-orange text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
        >
          Detection Rules
        </button>
        <button
          onClick={() => setSubTab('qr')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${subTab === 'qr' ? 'bg-sanatani-orange text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
        >
          QR Codes
        </button>
      </div>

      {/* ------------------------- Methods tab ------------------------- */}
      {subTab === 'methods' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-500">Region:</label>
              <select className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold" value={activeRegion} onChange={(e) => setActiveRegion(e.target.value)}>
                {config.regions.map((r) => <option key={r.id} value={r.id}>{r.flag} {r.name} ({r.id})</option>)}
              </select>
            </div>
            <button
              onClick={() => setMethodModal({ form: emptyMethodForm(activeRegion), isNew: true })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sanatani-orange text-white text-xs font-black"
            >
              <Plus size={14} /> Add Method
            </button>
          </div>

          {activeRegionCfg && !activeRegionCfg.enabled && (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-center gap-2">
              <AlertTriangle size={14} /> This region is disabled — its methods won't show to users.
            </div>
          )}

          {regionMethods.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No payment methods for this region yet. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {regionMethods.map((m, i) => (
                <div key={m.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${m.enabled !== false ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveMethod(m, -1)} disabled={i === 0 || working} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button onClick={() => moveMethod(m, 1)} disabled={i === regionMethods.length - 1 || working} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronDown size={14} /></button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-gray-800">{m.label || m.id}</p>
                      <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{typeLabel(m.type)}</span>
                      {m.enabled === false && <span className="text-[10px] font-bold uppercase bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Off</span>}
                    </div>
                    <p className="text-xs text-gray-400 font-mono truncate">{m.id}{m.number ? ` · ${m.number}` : ''}{m.upiId ? ` · ${m.upiId}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => copyText(m.id, `id-${m.id}`)} title="Copy method ID" className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                      {copiedId === `id-${m.id}` ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
                    </button>
                    <button onClick={() => toggleMethod(m)} disabled={working} title={m.enabled !== false ? 'Disable' : 'Enable'} className={`p-2 rounded-xl hover:bg-gray-100 ${m.enabled !== false ? 'text-green-600' : 'text-gray-300'}`}>
                      <Power size={15} />
                    </button>
                    <button onClick={() => openMethodEdit(m)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500"><Pencil size={15} /></button>
                    <button onClick={() => setDeleteTarget(m)} className="p-2 hover:bg-red-50 rounded-xl text-red-400"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">Order shown here = order users see. Use ↑ ↓ to reorder. Changes apply instantly after save.</p>
        </div>
      )}

      {/* ------------------------- Detection tab ------------------------- */}
      {subTab === 'detection' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-gray-800 flex items-center gap-2"><MapPin size={15} /> Regions & detection</h4>
              <button
                onClick={() => setRegionModal({ form: emptyRegionForm(), isNew: true })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sanatani-orange text-white text-xs font-black"
              >
                <Plus size={14} /> Add Region
              </button>
            </div>
            <div className="space-y-2">
              {config.regions.map((r) => (
                <div key={r.id} className="rounded-2xl border border-gray-100 p-3 flex items-center gap-3">
                  <span className="text-xl">{r.flag || '🌐'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-800">{r.name} <span className="text-gray-400 font-mono text-xs">{r.id}</span></p>
                    <p className="text-xs text-gray-500">
                      {r.currency} ({r.currencySymbol})
                      {r.countryCodes.length > 0 && <> · phone: {r.countryCodes.map((c) => `+${c}`).join(', ')}</>}
                      {r.ipCountries.length > 0 && <> · IP: {r.ipCountries.join(', ')}</>}
                      {config.defaultRegion === r.id && <span className="ml-1 text-[10px] font-black uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>}
                      {!r.enabled && <span className="ml-1 text-[10px] font-black uppercase bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Disabled</span>}
                    </p>
                  </div>
                  <button onClick={() => toggleRegion(r)} disabled={working} title={r.enabled ? 'Disable region' : 'Enable region'} className={`p-2 rounded-xl hover:bg-gray-100 ${r.enabled ? 'text-green-600' : 'text-gray-300'}`}>
                    <Power size={15} />
                  </button>
                  <button onClick={() => openRegionEdit(r)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500"><Pencil size={15} /></button>
                  {!['BD', 'IN', 'INTL'].includes(r.id) && (
                    <button onClick={() => deleteRegion(r.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-400"><Trash2 size={15} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
            <h4 className="text-sm font-black text-gray-800 mb-2">Default region fallback</h4>
            <p className="text-xs text-gray-500 mb-3">Used when phone + IP detection both fail. IP geolocation itself needs no configuration.</p>
            <select
              className={inputCls + ' max-w-xs'}
              value={config.defaultRegion}
              disabled={working}
              onChange={async (e) => { await saveConfig({ ...config, defaultRegion: e.target.value }); }}
            >
              {config.regions.filter((r) => r.enabled).map((r) => (
                <option key={r.id} value={r.id}>{r.flag} {r.name} ({r.id})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ------------------------- QR Codes tab ------------------------- */}
      {subTab === 'qr' && <QrCodeManager />}

      {/* Modals */}
      {methodModal && (
        <MethodModal
          form={methodModal.form}
          setForm={(f) => setMethodModal({ ...methodModal, form: f })}
          regions={config.regions}
          isNew={methodModal.isNew}
          onSave={saveMethod}
          onClose={() => setMethodModal(null)}
          working={working}
        />
      )}
      {regionModal && (
        <RegionModal
          form={regionModal.form}
          setForm={(f) => setRegionModal({ ...regionModal, form: f })}
          isNew={regionModal.isNew}
          onSave={saveRegion}
          onClose={() => setRegionModal(null)}
          working={working}
        />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-black text-gray-800 mb-2">Delete payment method?</h3>
            <p className="text-sm text-gray-500 mb-4">
              "<span className="font-bold">{deleteTarget.label || deleteTarget.id}</span>" will be removed permanently. Users will no longer see it.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">Cancel</button>
              <button onClick={confirmDelete} disabled={working} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-black disabled:opacity-50">
                {working ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
