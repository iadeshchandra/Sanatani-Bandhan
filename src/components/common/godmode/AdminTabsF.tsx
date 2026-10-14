/**
 * AdminTabsF — Console 3.0: Marketplace (Fiverr-like gig management).
 * =====================================================================
 * Spark-native (firestoreAdmin direct). Owner controls the entire
 * marketplace: dashboard KPIs, commission rules + overrides, orders,
 * disputes, payouts, providers, gigs.
 *
 * Design: dark sovereign console, saffron accents, mobile-first.
 * Every mutation is audit-logged in firestoreAdmin.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Store, Receipt, Scale, HandCoins, Users, LayoutGrid, RefreshCw, Plus,
  Pencil, CheckCircle2, XCircle, Search, Calculator, Ban, Star, Eye,
  TrendingUp, AlertTriangle, ChevronRight, Download,
} from 'lucide-react';
import { firestoreAdmin } from '../../../lib/firestoreAdmin';
import { computeCommission } from '../../../lib/firestoreAdmin';
import { ConfirmDialog } from '../GodModeConsole2';
import { useToast } from '../../../context/ToastContext';
import { ProviderPaymentsTab, BypassFlagsTab, BypassRulesTab, ProviderStrikesPanel } from './AdminTabsH';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl bg-slate-950/70 border border-slate-800 p-4 ${className}`}>{children}</div>
);
const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs text-slate-500 py-6 text-center">{text}</p>
);
const Loading: React.FC<{ text?: string }> = ({ text = 'Loading…' }) => (
  <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> {text}
  </div>
);
const SubTabs: React.FC<{ tabs: string[]; active: string; onChange: (t: string) => void }> = ({ tabs, active, onChange }) => (
  <div className="flex gap-1.5 overflow-x-auto pb-1">
    {tabs.map((t) => (
      <button key={t} type="button" onClick={() => onChange(t)}
        className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold whitespace-nowrap shrink-0 ${
          active === t ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
        }`}>{t}</button>
    ))}
  </div>
);
const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500';
const btnPrimary = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-saffron-500 text-slate-950 hover:bg-saffron-400 transition-colors';
const btnGhost = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors';
const Kpi: React.FC<{ label: string; value: string; sub?: string; icon?: React.ReactNode }> = ({ label, value, sub, icon }) => (
  <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800">
    <div className="flex items-center gap-2 mb-1">{icon}<p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">{label}</p></div>
    <p className="text-xl font-black text-slate-100">{value}</p>
    {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

/* ------------------------------ Dashboard ------------------------------ */

function fmt(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

const MarketplaceDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.marketplaceDashboard();
    if (r.ok) setData((r.data as any));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <Loading />;
  if (!data) return <Empty text="Could not load marketplace data." />;
  const k = data.kpis;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Kpi label="GMV (all time)" value={fmt(k.gmv)} icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />} sub="gross marketplace volume" />
        <Kpi label="Commission earned" value={fmt(k.commissionEarned)} icon={<Receipt className="w-3.5 h-3.5 text-amber-400" />} sub="platform revenue" />
        <Kpi label="Active orders" value={String(k.activeOrders)} icon={<Store className="w-3.5 h-3.5 text-sky-400" />} />
        <Kpi label="Open disputes" value={String(k.openDisputes)} icon={<AlertTriangle className="w-3.5 h-3.5 text-red-400" />} />
        <Kpi label="Active gigs" value={String(k.activeGigs)} sub={`of ${k.totalGigs} total`} icon={<LayoutGrid className="w-3.5 h-3.5 text-violet-400" />} />
      </div>
      <Card>
        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3">Top providers by GMV</h4>
        {data.topProviders.length === 0 ? <Empty text="No provider activity yet." /> : (
          <div className="space-y-2">
            {data.topProviders.map((p: any) => (
              <div key={p.providerId} className="flex items-center justify-between bg-slate-900 rounded-xl px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{p.providerId.slice(0, 12)}…</p>
                  <p className="text-[10px] text-slate-500">{p.orders} orders</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-slate-100">{fmt(p.gmv)}</p>
                  <p className="text-[10px] text-amber-400">fee {fmt(p.commission)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/* --------------------------- Commission control --------------------------- */

const GIG_CATEGORIES = ['Puja', 'Havan', 'Katha', 'Samskara', 'Vastu', 'Kundli', 'Horoscope', 'Remedy', 'Consultation', 'Other'];

const CommissionControl: React.FC = () => {
  const { showToast } = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [whatIf, setWhatIf] = useState({ gmv: 100000, rate: 12 });
  const [confirm, setConfirm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, o] = await Promise.all([firestoreAdmin.commissionRules(), firestoreAdmin.commissionOverrides()]);
    if (r.ok) setRules((r.data as any).rules || []);
    if (o.ok) setOverrides((o.data as any).overrides || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveRule = async () => {
    if (!editing) return;
    const r = await firestoreAdmin.commissionRuleSave(editing);
    if (r.ok) { showToast('Commission rule saved.', 'success'); setEditing(null); load(); }
    else showToast(r.error || 'Save failed.', 'error');
  };
  const saveOverride = async () => {
    if (!editing || !editing.scope) return;
    const r = await firestoreAdmin.commissionOverrideSave(editing);
    if (r.ok) { showToast('Override saved — applies to new orders only.', 'success'); setEditing(null); load(); }
    else showToast(r.error || 'Save failed.', 'error');
  };
  const removeOverride = (id: string) => setConfirm({
    title: 'Remove override?', message: 'The global rule will apply to new orders.', confirmText: 'Remove',
    isDanger: true,
    onConfirm: async () => { const r = await firestoreAdmin.commissionOverrideDelete(id); setConfirm(null); if (r.ok) { showToast('Override removed.', 'success'); load(); } },
  });

  const w = computeCommission(whatIf.gmv, whatIf.rate);

  if (loading) return <Loading />;
  return (
    <div className="space-y-4">
      <Card className="border-amber-500/20">
        <p className="text-[10px] text-amber-300/80 mb-2 font-bold">Rule changes apply to NEW orders only. Existing orders keep their commission snapshot.</p>
        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3">Global rules</h4>
        {rules.length === 0 && <Empty text="No global rules yet." />}
        <div className="space-y-2">
          {rules.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between bg-slate-900 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-xs font-bold text-slate-200 capitalize">{r.serviceType} · {r.ratePercent}%</p>
                <p className="text-[10px] text-slate-500">{r.active === false ? 'inactive' : 'active'}{r.minCommission > 0 && ` · min ₹${r.minCommission}`}{r.maxCommission > 0 && ` · max ₹${r.maxCommission}`}</p>
              </div>
              <button type="button" onClick={() => setEditing({ ...r, _kind: 'rule' })} className={btnGhost}><Pencil className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setEditing({ _kind: 'rule', serviceType: 'both', ratePercent: 12, minCommission: 0, maxCommission: 0, active: true })} className={`${btnPrimary} mt-3 w-full`}>
          <Plus className="w-3.5 h-3.5 inline mr-1" /> New global rule
        </button>
      </Card>

      <Card>
        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3">Overrides (category / provider)</h4>
        {overrides.length === 0 && <Empty text="No overrides. Global rules apply everywhere." />}
        <div className="space-y-2">
          {overrides.map((o: any) => (
            <div key={o.id} className="flex items-center justify-between bg-slate-900 rounded-xl px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200">{o.scope === 'category' ? `📂 ${o.targetId}` : `👤 ${o.targetId.slice(0, 14)}…`} · {o.ratePercent}%</p>
                <p className="text-[10px] text-slate-500 truncate">{o.note || 'no note'}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button type="button" onClick={() => setEditing({ ...o, _kind: 'override' })} className={btnGhost}><Pencil className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => removeOverride(o.id)} className={btnGhost}><XCircle className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={() => setEditing({ _kind: 'override', scope: 'category', targetId: 'Puja', ratePercent: 10, active: true })} className={`${btnGhost} flex-1`}>+ Category override</button>
          <button type="button" onClick={() => setEditing({ _kind: 'override', scope: 'provider', targetId: '', ratePercent: 10, active: true })} className={`${btnGhost} flex-1`}>+ Provider override</button>
        </div>
      </Card>

      <Card>
        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2"><Calculator className="w-3.5 h-3.5" /> What-if calculator</h4>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <label className="text-[11px] text-slate-500">Monthly GMV ₹<input type="number" value={whatIf.gmv} onChange={(e) => setWhatIf({ ...whatIf, gmv: Number(e.target.value) })} className={inputCls} /></label>
          <label className="text-[11px] text-slate-500">Rate %<input type="number" value={whatIf.rate} onChange={(e) => setWhatIf({ ...whatIf, rate: Number(e.target.value) })} className={inputCls} /></label>
        </div>
        <p className="text-sm text-slate-300">At <b className="text-slate-100">{whatIf.rate}%</b> on <b className="text-slate-100">{fmt(whatIf.gmv)}</b>/mo GMV → platform earns <b className="text-amber-300">{fmt(w.commission)}/mo</b> ({fmt(w.commission * 12)}/yr).</p>
      </Card>

      {editing && (
        <Card className="border-saffron-500/30">
          <h4 className="text-xs font-black text-slate-200 mb-3">{editing.id ? 'Edit' : 'New'} {editing._kind === 'rule' ? 'global rule' : `${editing.scope} override`}</h4>
          <div className="space-y-2.5">
            {editing._kind === 'rule' ? (
              <label className="text-[11px] text-slate-500">Applies to
                <select value={editing.serviceType} onChange={(e) => setEditing({ ...editing, serviceType: e.target.value })} className={inputCls}>
                  <option value="both">Purohit + Jyotishi</option><option value="purohit">Purohit only</option><option value="jyotishi">Jyotishi only</option>
                </select>
              </label>
            ) : editing.scope === 'category' ? (
              <label className="text-[11px] text-slate-500">Category
                <select value={editing.targetId} onChange={(e) => setEditing({ ...editing, targetId: e.target.value })} className={inputCls}>
                  {GIG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            ) : (
              <label className="text-[11px] text-slate-500">Provider UID
                <input value={editing.targetId} onChange={(e) => setEditing({ ...editing, targetId: e.target.value })} className={inputCls} placeholder="paste provider UID" />
              </label>
            )}
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[11px] text-slate-500">Rate %<input type="number" value={editing.ratePercent} onChange={(e) => setEditing({ ...editing, ratePercent: Number(e.target.value) })} className={inputCls} /></label>
              <label className="text-[11px] text-slate-500">Min ₹<input type="number" value={editing.minCommission || ''} onChange={(e) => setEditing({ ...editing, minCommission: Number(e.target.value) })} className={inputCls} /></label>
              <label className="text-[11px] text-slate-500">Max ₹<input type="number" value={editing.maxCommission || ''} onChange={(e) => setEditing({ ...editing, maxCommission: Number(e.target.value) })} className={inputCls} /></label>
            </div>
            <label className="text-[11px] text-slate-500">Note<input value={editing.note || ''} onChange={(e) => setEditing({ ...editing, note: e.target.value })} className={inputCls} placeholder="why this override" /></label>
            <div className="flex gap-2">
              <button type="button" onClick={editing._kind === 'rule' ? saveRule : saveOverride} className={`${btnPrimary} flex-1`}>Save</button>
              <button type="button" onClick={() => setEditing(null)} className={`${btnGhost} flex-1`}>Cancel</button>
            </div>
          </div>
        </Card>
      )}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
};

const statusColor: Record<string, string> = {
  pending_payment: 'bg-yellow-500/15 text-yellow-300', paid: 'bg-sky-500/15 text-sky-300',
  accepted: 'bg-indigo-500/15 text-indigo-300', in_progress: 'bg-violet-500/15 text-violet-300',
  completed: 'bg-emerald-500/15 text-emerald-300', cancelled: 'bg-slate-500/15 text-slate-400',
  disputed: 'bg-red-500/15 text-red-300', refunded: 'bg-orange-500/15 text-orange-300',
};

export const MarketplaceOrders: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [confirm, setConfirm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.marketplaceOrders({ status, limit: 200 });
    if (r.ok) setOrders((r.data as any).orders || []);
    setLoading(false);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const force = (id: string, s: 'completed' | 'cancelled' | 'refunded') => setConfirm({
    title: `${s === 'completed' ? 'Force complete' : s === 'cancelled' ? 'Cancel' : 'Refund'} order?`,
    message: 'This overrides the normal flow and is audit-logged.', confirmText: 'Confirm', isDanger: s !== 'completed',
    onConfirm: async () => {
      const r = await firestoreAdmin.orderForceStatus(id, s);
      setConfirm(null); setSel(null);
      if (r.ok) { showToast('Order updated.', 'success'); load(); } else showToast(r.error || 'Failed.', 'error');
    },
  });

  const shown = q ? orders.filter((o) => JSON.stringify(o).toLowerCase().includes(q.toLowerCase())) : orders;
  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders…" className={`${inputCls} pl-9`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} w-auto`}>
          {['all', 'pending_payment', 'paid', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {shown.length === 0 && <Empty text="No orders match." />}
      {shown.map((o: any) => (
        <Card key={o.id}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{o.gigTitle || o.gigId}</p>
              <p className="text-[10px] text-slate-500">{o.createdAt?.slice(0, 10) || ''} · {o.paymentMethodId || 'manual'}</p>
            </div>
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${statusColor[o.status] || 'bg-slate-700 text-slate-300'}`}>{o.status}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <div className="bg-slate-900 rounded-lg p-1.5"><p className="text-[9px] text-slate-500">Gross</p><p className="text-xs font-black text-slate-100">{fmt(o.amountGross || 0)}</p></div>
            <div className="bg-slate-900 rounded-lg p-1.5"><p className="text-[9px] text-slate-500">Fee ({o.commissionPercent}%)</p><p className="text-xs font-black text-amber-300">{fmt(o.commissionAmount || 0)}</p></div>
            <div className="bg-slate-900 rounded-lg p-1.5"><p className="text-[9px] text-slate-500">Provider</p><p className="text-xs font-black text-emerald-300">{fmt(o.providerNet || 0)}</p></div>
          </div>
          <button type="button" onClick={() => setSel(o)} className={`${btnGhost} w-full mt-2`}>Manage</button>
        </Card>
      ))}
      {sel && (
        <Card className="border-saffron-500/30">
          <h4 className="text-xs font-black text-slate-200 mb-2">Order {sel.id.slice(0, 10)}…</h4>
          <div className="text-[11px] text-slate-400 space-y-1 mb-3">
            <p>Client: <span className="text-slate-200 font-mono">{sel.clientUid}</span></p>
            <p>Provider: <span className="text-slate-200 font-mono">{sel.providerUid}</span></p>
            {sel.clientNotes && <p>Client notes: {sel.clientNotes}</p>}
            {sel.scheduledAt && <p>Scheduled: {sel.scheduledAt}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => force(sel.id, 'completed')} className={btnPrimary}>Force complete</button>
            <button type="button" onClick={() => force(sel.id, 'cancelled')} className={btnGhost}>Cancel</button>
            <button type="button" onClick={() => force(sel.id, 'refunded')} className={btnGhost}>Refund</button>
            <button type="button" onClick={() => setSel(null)} className={btnGhost}>Close</button>
          </div>
        </Card>
      )}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
};

export const MarketplaceDisputes: React.FC = () => {
  const { showToast } = useToast();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [resolution, setResolution] = useState<'refund_client' | 'release_provider' | 'split'>('refund_client');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.marketplaceDisputes('open');
    if (r.ok) setDisputes((r.data as any).disputes || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const resolve = async () => {
    if (!sel) return;
    const r = await firestoreAdmin.disputeResolve(sel.id, resolution, 0, 0, note);
    if (r.ok) { showToast('Dispute resolved.', 'success'); setSel(null); setNote(''); load(); }
    else showToast(r.error || 'Failed.', 'error');
  };

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      {disputes.length === 0 && <Empty text="No open disputes. 🎉" />}
      {disputes.map((d: any) => (
        <Card key={d.id} className="border-red-500/20">
          <p className="text-xs font-bold text-slate-200">{d.reason}</p>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{d.details}</p>
          <p className="text-[10px] text-slate-500 mt-1">Order {d.orderId?.slice(0, 10)}… · raised {d.createdAt?.slice(0, 10)}</p>
          <button type="button" onClick={() => setSel(d)} className={`${btnGhost} w-full mt-2`}>Review & resolve</button>
        </Card>
      ))}
      {sel && (
        <Card className="border-red-500/40">
          <h4 className="text-xs font-black text-slate-200 mb-2">Resolve dispute</h4>
          <p className="text-[11px] text-slate-400 mb-2">{sel.details}</p>
          <div className="space-y-2">
            <label className="text-[11px] text-slate-500">Resolution
              <select value={resolution} onChange={(e) => setResolution(e.target.value as any)} className={inputCls}>
                <option value="refund_client">Refund client</option>
                <option value="release_provider">Release to provider</option>
                <option value="split">Split (custom)</option>
              </select>
            </label>
            <label className="text-[11px] text-slate-500">Resolution note
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="reason for the record" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={resolve} className={`${btnPrimary} flex-1`}>Resolve</button>
              <button type="button" onClick={() => setSel(null)} className={`${btnGhost} flex-1`}>Close</button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export const MarketplacePayouts: React.FC = () => {
  const { showToast } = useToast();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.payoutQueue('all');
    if (r.ok) setPayouts(((r.data as any).data?.payouts) || ((r.data as any).payouts) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = (id: string, approve: boolean) => setConfirm({
    title: approve ? 'Approve payout?' : 'Reject payout?',
    message: approve ? 'Verify the amount in your bKash / bank app FIRST, then approve.' : 'The provider will be notified of rejection.',
    confirmText: approve ? 'Approve' : 'Reject', isDanger: !approve,
    onConfirm: async () => {
      const r = await firestoreAdmin.payoutDecide(id, approve);
      setConfirm(null);
      if (r.ok) { showToast(approve ? 'Payout approved.' : 'Payout rejected.', 'success'); load(); } else showToast(r.error || 'Failed.', 'error');
    },
  });
  const markPaid = (id: string) => setConfirm({
    title: 'Mark as paid?', message: 'Confirm you have actually sent the money.', confirmText: 'Mark paid', isDanger: false,
    onConfirm: async () => {
      const r = await firestoreAdmin.payoutMarkPaid(id);
      setConfirm(null);
      if (r.ok) { showToast('Marked paid.', 'success'); load(); } else showToast(r.error || 'Failed.', 'error');
    },
  });

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      {payouts.length === 0 && <Empty text="No payout requests." />}
      {payouts.map((p: any) => (
        <Card key={p.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-slate-100">{fmt(p.amount || 0)}</p>
              <p className="text-[10px] text-slate-500 font-mono">{p.providerUid?.slice(0, 14)}… · {p.method || 'manual'} · {p.status}</p>
            </div>
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${p.status === 'requested' ? 'bg-yellow-500/15 text-yellow-300' : p.status === 'approved' ? 'bg-sky-500/15 text-sky-300' : p.status === 'paid' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-600/20 text-slate-400'}`}>{p.status}</span>
          </div>
          {p.status === 'requested' && (
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => decide(p.id, true)} className={`${btnPrimary} flex-1`}>Approve</button>
              <button type="button" onClick={() => decide(p.id, false)} className={`${btnGhost} flex-1`}>Reject</button>
            </div>
          )}
          {p.status === 'approved' && (
            <button type="button" onClick={() => markPaid(p.id)} className={`${btnPrimary} w-full mt-2`}>Mark paid</button>
          )}
        </Card>
      ))}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
};

export const MarketplaceProviders: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await firestoreAdmin.marketplaceProviders();
      if (r.ok) setProviders((r.data as any).providers || []);
      setLoading(false);
    })();
  }, []);

  const openDetail = async (providerId: string) => {
    const r = await firestoreAdmin.providerDetail(providerId);
    if (r.ok) { setDetail((r.data as any)); setSel(providerId); }
  };

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      {providers.length === 0 && <Empty text="No providers yet." />}
      {providers.map((p: any) => (
        <Card key={p.providerId}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-200 font-mono">{p.providerId.slice(0, 16)}…</p>
              <p className="text-[10px] text-slate-500">{p.orders} orders · GMV {fmt(p.gmv)} · fee {fmt(p.commission)}</p>
            </div>
            <button type="button" onClick={() => openDetail(p.providerId)} className={btnGhost}>Detail</button>
          </div>
        </Card>
      ))}
      {detail && sel && (
        <Card className="border-saffron-500/30">
          <h4 className="text-xs font-black text-slate-200 mb-2 font-mono">{sel.slice(0, 20)}…</h4>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-900 rounded-lg p-2"><p className="text-[9px] text-slate-500">Lifetime GMV</p><p className="text-sm font-black text-slate-100">{fmt(detail.gmv)}</p></div>
            <div className="bg-slate-900 rounded-lg p-2"><p className="text-[9px] text-slate-500">Commission paid</p><p className="text-sm font-black text-amber-300">{fmt(detail.commission)}</p></div>
            <div className="bg-slate-900 rounded-lg p-2"><p className="text-[9px] text-slate-500">Net earned</p><p className="text-sm font-black text-emerald-300">{fmt(detail.netEarned)}</p></div>
            <div className="bg-slate-900 rounded-lg p-2"><p className="text-[9px] text-slate-500">Pending</p><p className="text-sm font-black text-sky-300">{fmt(detail.pendingNet)}</p></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">{detail.orderCount} orders · {detail.payouts?.length || 0} payouts</p>
          <ProviderStrikesPanel providerUid={sel} />
          <button type="button" onClick={() => { setSel(null); setDetail(null); }} className={`${btnGhost} w-full mt-2`}>Close</button>
        </Card>
      )}
    </div>
  );
};

export const MarketplaceGigs: React.FC = () => {
  const { showToast } = useToast();
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.marketplaceGigs('all');
    if (r.ok) setGigs((r.data as any).gigs || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const mod = (id: string, action: 'feature' | 'unfeature' | 'deactivate' | 'reactivate') => setConfirm({
    title: `${action} this gig?`, message: 'Audit-logged.', confirmText: 'Confirm', isDanger: action === 'deactivate',
    onConfirm: async () => {
      const r = await firestoreAdmin.gigModerate(id, action);
      setConfirm(null);
      if (r.ok) { showToast('Done.', 'success'); load(); } else showToast(r.error || 'Failed.', 'error');
    },
  });

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      {gigs.length === 0 && <Empty text="No gigs listed yet." />}
      {gigs.map((g: any) => (
        <Card key={g.id} className={g.active === false ? 'opacity-60' : ''}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{g.title}</p>
              <p className="text-[10px] text-slate-500">{g.category} · {g.priceCurrency || 'INR'} {g.priceAmount} · ⭐ {Number(g.avgRating || 0).toFixed(1)} ({g.totalOrders || 0})</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {g.featured && <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300">FEATURED</span>}
              {g.active === false && <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-red-500/15 text-red-300">OFF</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <button type="button" onClick={() => mod(g.id, g.featured ? 'unfeature' : 'feature')} className={btnGhost}>{g.featured ? 'Unfeature' : 'Feature'}</button>
            <button type="button" onClick={() => mod(g.id, g.active === false ? 'reactivate' : 'deactivate')} className={btnGhost}>{g.active === false ? 'Reactivate' : 'Deactivate'}</button>
          </div>
        </Card>
      ))}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
};

/* ------------------------------ Main tab ------------------------------ */

const MARKETPLACE_SUBTABS = ['Dashboard', 'Commission', 'Orders', 'Disputes', 'Payouts', 'Providers', 'Gigs', 'Pay Methods', 'Bypass Flags', 'Bypass Rules'];

export const MarketplaceTab: React.FC = () => {
  const [sub, setSub] = useState('Dashboard');
  return (
    <div className="space-y-4">
      <SubTabs tabs={MARKETPLACE_SUBTABS} active={sub} onChange={setSub} />
      {sub === 'Dashboard' && <MarketplaceDashboard />}
      {sub === 'Commission' && <CommissionControl />}
      {sub === 'Orders' && <MarketplaceOrders />}
      {sub === 'Disputes' && <MarketplaceDisputes />}
      {sub === 'Payouts' && <MarketplacePayouts />}
      {sub === 'Providers' && <MarketplaceProviders />}
      {sub === 'Gigs' && <MarketplaceGigs />}
      {sub === 'Pay Methods' && <ProviderPaymentsTab />}
      {sub === 'Bypass Flags' && <BypassFlagsTab />}
      {sub === 'Bypass Rules' && <BypassRulesTab />}
    </div>
  );
};
