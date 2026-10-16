/**
 * AdminTabsD — Console 3.0: Commission system + Content Manager.
 * Spark-native (firestoreAdmin direct). Foundation for the Fiverr-like
 * marketplace: rules are live-editable, transactions/payouts are admin-
 * managed. The booking→payment→split flow itself is NOT built yet.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Percent, Receipt, HandCoins, RefreshCw, Plus, Pencil, CheckCircle2,
  XCircle, Search, Megaphone, FileText, Globe, Save, Trash2, Calculator,
} from 'lucide-react';
import { firestoreAdmin } from '../../../lib/firestoreAdmin';
import { DEFAULT_MATRIX } from '../../../lib/panjikaIntelligence';
import { ConfirmDialog } from '../GodModeConsole2';
import { useToast } from '../../../context/ToastContext';

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

/* ------------------------------ Commission ------------------------------ */

function previewCommission(gross: number, rate: number, min: number, max: number) {
  const raw = (gross * rate) / 100;
  const clamped = Math.min(Math.max(raw, min), max > 0 ? max : raw);
  return { commission: Math.round(clamped), net: Math.round(gross - clamped) };
}

const RulesView: React.FC = () => {
  const { showToast } = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [working, setWorking] = useState(false);
  const [testGross, setTestGross] = useState('1000');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.commissionRules();
    if (r.ok) setRules(r.data.rules);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const blank = { serviceType: 'both', ratePercent: 10, minCommission: 0, maxCommission: 0, active: true };

  const save = async () => {
    if (!form) return;
    setWorking(true);
    const r = await firestoreAdmin.commissionRuleSave(form);
    setWorking(false);
    if (r.ok) { showToast('Commission rule saved.', 'success'); setForm(null); load(); }
    else showToast(r.error || 'Save failed.', 'error');
  };

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Platform fee per service type. Applies to future marketplace bookings.</p>
        <button type="button" onClick={() => setForm(blank)}
          className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-xs font-black">
          <Plus className="w-4 h-4" /> New rule
        </button>
      </div>
      {rules.length === 0 && <Empty text="No commission rules yet. Create one to define the platform fee." />}
      {rules.map((r) => (
        <Card key={r.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-white text-sm capitalize">{r.serviceType} services</p>
              <p className="text-xs text-slate-400 mt-1">
                <span className="text-amber-300 font-black">{r.ratePercent}%</span>
                {r.minCommission > 0 && ` · min ₹${r.minCommission}`}
                {r.maxCommission > 0 && ` · max ₹${r.maxCommission}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${r.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                {r.active ? 'active' : 'off'}
              </span>
              <button type="button" aria-label="Edit rule" onClick={() => setForm({ ...r })}
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      ))}

      {/* Live calculator */}
      <Card className="border-amber-500/30">
        <h4 className="text-xs font-bold text-amber-200 mb-2 flex items-center gap-1.5">
          <Calculator className="w-4 h-4" /> Fee preview
        </h4>
        <div className="flex gap-2 items-center">
          <input value={testGross} onChange={(e) => setTestGross(e.target.value)} inputMode="decimal"
            className={inputCls + ' max-w-[140px]'} placeholder="₹ gross" />
          <div className="text-xs text-slate-300">
            {rules.filter((r) => r.active).map((r) => {
              const p = previewCommission(Number(testGross) || 0, r.ratePercent, r.minCommission || 0, r.maxCommission || 0);
              return (
                <p key={r.id} className="mb-1">
                  <span className="capitalize text-slate-500">{r.serviceType}:</span>{' '}
                  fee <span className="font-bold text-amber-300">₹{p.commission}</span> · provider gets{' '}
                  <span className="font-bold text-emerald-300">₹{p.net}</span>
                </p>
              );
            })}
            {rules.filter((r) => r.active).length === 0 && <span className="text-slate-500">No active rules.</span>}
          </div>
        </div>
      </Card>

      {form && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-4">{form.id ? 'Edit rule' : 'New rule'}</h3>
            <div className="space-y-3">
              <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} className={inputCls}>
                <option value="both">Both (purohit + jyotishi)</option>
                <option value="purohit">Purohit only</option>
                <option value="jyotishi">Jyotishi only</option>
              </select>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-[11px] text-slate-500">Rate %<input type="number" value={form.ratePercent}
                  onChange={(e) => setForm({ ...form, ratePercent: Number(e.target.value) })} className={inputCls} /></label>
                <label className="text-[11px] text-slate-500">Min ₹<input type="number" value={form.minCommission || ''}
                  onChange={(e) => setForm({ ...form, minCommission: Number(e.target.value) })} className={inputCls} /></label>
                <label className="text-[11px] text-slate-500">Max ₹ (0=none)<input type="number" value={form.maxCommission || ''}
                  onChange={(e) => setForm({ ...form, maxCommission: Number(e.target.value) })} className={inputCls} /></label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300 min-h-[44px]">
                <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-5 h-5 accent-amber-500" /> Active
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm(null)} className="flex-1 py-3 min-h-[44px] rounded-xl bg-slate-800 text-sm font-bold text-slate-300">Cancel</button>
                <button type="button" onClick={save} disabled={working}
                  className="flex-1 py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-black disabled:opacity-50">
                  {working ? 'Saving…' : 'Save rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TransactionsView: React.FC = () => {
  const { showToast } = useToast();
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [confirm, setConfirm] = useState<{ id: string; status: 'released' | 'disputed' | 'pending' } | null>(null);
  const [working, setWorking] = useState(false);
  const [earnFor, setEarnFor] = useState('');
  const [earnings, setEarnings] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.marketplaceTransactions(filter);
    if (r.ok) setTxns(r.data.transactions);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [filter, showToast]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async () => {
    if (!confirm) return;
    setWorking(true);
    const r = await firestoreAdmin.transactionSetStatus(confirm.id, confirm.status);
    setWorking(false);
    setConfirm(null);
    if (r.ok) { showToast('Transaction updated.', 'success'); load(); }
    else showToast(r.error || 'Failed.', 'error');
  };

  const checkEarnings = async () => {
    if (!earnFor.trim()) return;
    const r = await firestoreAdmin.providerEarnings(earnFor.trim());
    if (r.ok) setEarnings(r.data);
    else showToast(r.error || 'Failed.', 'error');
  };

  const statusCls = (s: string) =>
    s === 'released' ? 'bg-emerald-500/20 text-emerald-300' : s === 'disputed' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300';

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-amber-200/70 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
        Foundation only: the booking → payment → split flow is not built yet. Transactions recorded here (by the
        future marketplace or manual entry via DB Explorer) can be reviewed and released.
      </p>
      <div className="flex gap-1.5">
        {['all', 'pending', 'released', 'disputed'].map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold capitalize ${
              filter === s ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}>{s}</button>
        ))}
      </div>
      {txns.length === 0 && <Empty text="No marketplace transactions yet." />}
      {txns.map((t) => (
        <Card key={t.id}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white capitalize">{t.serviceType || 'service'}</p>
              <p className="text-[11px] text-slate-500 font-mono truncate">provider {t.providerId || '—'}</p>
            </div>
            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${statusCls(t.status)}`}>{t.status}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
            <div className="bg-slate-900 rounded-xl p-2"><p className="text-slate-500 text-[10px]">Gross</p><p className="font-black text-white">₹{Number(t.grossAmount || 0).toLocaleString('en-IN')}</p></div>
            <div className="bg-slate-900 rounded-xl p-2"><p className="text-slate-500 text-[10px]">Fee ({t.commissionPercent}%)</p><p className="font-black text-amber-300">₹{Number(t.commissionAmount || 0).toLocaleString('en-IN')}</p></div>
            <div className="bg-slate-900 rounded-xl p-2"><p className="text-slate-500 text-[10px]">Provider</p><p className="font-black text-emerald-300">₹{Number(t.netAmount || 0).toLocaleString('en-IN')}</p></div>
          </div>
          {t.status === 'pending' && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm({ id: t.id, status: 'released' })}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-emerald-600/20 text-emerald-300 text-xs font-black border border-emerald-500/30">Release payout</button>
              <button type="button" onClick={() => setConfirm({ id: t.id, status: 'disputed' })}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-red-600/20 text-red-300 text-xs font-black border border-red-500/30">Mark disputed</button>
            </div>
          )}
        </Card>
      ))}

      {/* Provider earnings lookup */}
      <Card>
        <h4 className="text-xs font-bold text-slate-200 mb-2">Provider earnings lookup</h4>
        <div className="flex gap-2">
          <input value={earnFor} onChange={(e) => setEarnFor(e.target.value)} placeholder="provider ID…"
            className={inputCls + ' font-mono'} />
          <button type="button" onClick={checkEarnings}
            className="px-5 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-xs font-black">Check</button>
        </div>
        {earnings && (
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-slate-900 rounded-xl p-2.5"><p className="text-slate-500 text-[10px]">Lifetime gross</p><p className="font-black text-white">₹{earnings.gross.toLocaleString('en-IN')}</p></div>
            <div className="bg-slate-900 rounded-xl p-2.5"><p className="text-slate-500 text-[10px]">Platform fees</p><p className="font-black text-amber-300">₹{earnings.commission.toLocaleString('en-IN')}</p></div>
            <div className="bg-slate-900 rounded-xl p-2.5"><p className="text-slate-500 text-[10px]">Released to provider</p><p className="font-black text-emerald-300">₹{earnings.netReleased.toLocaleString('en-IN')}</p></div>
            <div className="bg-slate-900 rounded-xl p-2.5"><p className="text-slate-500 text-[10px]">Pending ({earnings.txnCount} txns)</p><p className="font-black text-slate-300">₹{earnings.netPending.toLocaleString('en-IN')}</p></div>
          </div>
        )}
      </Card>

      {confirm && (
        <ConfirmDialog
          title={confirm.status === 'released' ? 'Release transaction?' : 'Mark as disputed?'}
          body={confirm.status === 'released'
            ? 'The provider’s net amount becomes eligible for payout. Recorded in the audit log.'
            : 'Flag this transaction for review. The provider will not be paid until resolved.'}
          confirmLabel={confirm.status === 'released' ? 'Release' : 'Mark disputed'}
          working={working} onConfirm={setStatus} onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

const PayoutsView: React.FC = () => {
  const { showToast } = useToast();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('requested');
  const [confirm, setConfirm] = useState<{ id: string; approve: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.payoutQueue(filter);
    if (r.ok) setPayouts(r.data.payouts);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [filter, showToast]);
  useEffect(() => { load(); }, [load]);

  const decide = async () => {
    if (!confirm) return;
    setWorking(true);
    const r = await firestoreAdmin.payoutDecide(confirm.id, confirm.approve, note);
    setWorking(false);
    setConfirm(null); setNote('');
    if (r.ok) { showToast(confirm.approve ? 'Payout approved.' : 'Payout rejected.', 'success'); load(); }
    else showToast(r.error || 'Failed.', 'error');
  };

  const markPaid = async (id: string) => {
    const r = await firestoreAdmin.payoutMarkPaid(id);
    if (r.ok) { showToast('Marked as paid.', 'success'); load(); }
    else showToast(r.error || 'Failed.', 'error');
  };

  const statusCls = (s: string) =>
    s === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : s === 'approved' ? 'bg-sky-500/20 text-sky-300'
    : s === 'rejected' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300';

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto">
        {['requested', 'approved', 'paid', 'rejected', 'all'].map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold capitalize shrink-0 ${
              filter === s ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}>{s}</button>
        ))}
      </div>
      {payouts.length === 0 && <Empty text="No payouts in this state." />}
      {payouts.map((p) => (
        <Card key={p.id}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-lg font-black text-white">₹{Number(p.amount || 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 font-mono truncate">provider {p.providerId || '—'} · {p.method || '—'}</p>
              {p.accountDetails && <p className="text-[11px] text-slate-500 font-mono truncate">{p.accountDetails}</p>}
            </div>
            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full shrink-0 ${statusCls(p.status)}`}>{p.status}</span>
          </div>
          {p.requestedAt && <p className="text-[11px] text-slate-500 mb-3">Requested {new Date(p.requestedAt).toLocaleString()}</p>}
          {p.status === 'requested' && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm({ id: p.id, approve: true })}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-black">Approve</button>
              <button type="button" onClick={() => setConfirm({ id: p.id, approve: false })}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-300">Reject</button>
            </div>
          )}
          {p.status === 'approved' && (
            <button type="button" onClick={() => markPaid(p.id)}
              className="w-full py-2.5 min-h-[44px] rounded-xl bg-sky-600 text-white text-xs font-black">
              Mark as paid (after bank/UPI transfer)
            </button>
          )}
        </Card>
      ))}
      {confirm && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-2">{confirm.approve ? 'Approve payout?' : 'Reject payout?'}</h3>
            <p className="text-xs text-slate-400 mb-3">
              {confirm.approve ? 'Verify the amount in your bank/UPI app before approving.' : 'The provider will see this as rejected.'}
            </p>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
              className={inputCls + ' mb-3'} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="flex-1 py-3 min-h-[44px] rounded-xl bg-slate-800 text-sm font-bold text-slate-300">Cancel</button>
              <button type="button" onClick={decide} disabled={working}
                className={`flex-1 py-3 min-h-[44px] rounded-xl text-sm font-black disabled:opacity-50 ${confirm.approve ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                {working ? 'Working…' : confirm.approve ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CommissionTab: React.FC = () => {
  const [sub, setSub] = useState('Rules');
  return (
    <div className="space-y-4">
      <SubTabs tabs={['Rules', 'Transactions', 'Payouts']} active={sub} onChange={setSub} />
      {sub === 'Rules' && <RulesView />}
      {sub === 'Transactions' && <TransactionsView />}
      {sub === 'Payouts' && <PayoutsView />}
    </div>
  );
};

/* ---------------------------- Content Manager ---------------------------- */

const AnnouncementsView: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [del, setDel] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.announcements();
    if (r.ok) setItems(r.data.announcements);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form?.title?.trim() || !form?.body?.trim()) { showToast('Title and body are required.', 'error'); return; }
    setWorking(true);
    const r = await firestoreAdmin.announcementSave(form);
    setWorking(false);
    if (r.ok) { showToast('Announcement saved.', 'success'); setForm(null); load(); }
    else showToast(r.error || 'Save failed.', 'error');
  };
  const doDelete = async () => {
    if (!del) return;
    setWorking(true);
    const r = await firestoreAdmin.announcementDelete(del);
    setWorking(false);
    setDel(null);
    if (r.ok) { showToast('Deleted.', 'success'); load(); }
    else showToast(r.error || 'Delete failed.', 'error');
  };

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => setForm({ title: '', body: '', type: 'info', active: true })}
          className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-xs font-black">
          <Plus className="w-4 h-4" /> New banner
        </button>
      </div>
      {items.length === 0 && <Empty text="No announcements. Create one to show a banner in the app." />}
      {items.map((a) => (
        <Card key={a.id} className={!a.active ? 'opacity-60' : ''}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-white text-sm">{a.title}</p>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{a.body}</p>
              <p className="text-[11px] text-slate-500 mt-1.5 capitalize">{a.type} · {a.active ? 'visible' : 'hidden'}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button type="button" aria-label="Edit" onClick={() => setForm({ ...a })}
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"><Pencil className="w-4 h-4" /></button>
              <button type="button" aria-label="Delete" onClick={() => setDel(a.id)}
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-red-300 hover:bg-slate-800"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </Card>
      ))}
      {form && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-4">{form.id ? 'Edit' : 'New'} announcement</h3>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title" className={inputCls} />
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Body" rows={4} className={inputCls} />
              <div className="flex gap-2">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="festival">Festival</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-300 px-3 min-h-[44px]">
                  <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-5 h-5 accent-amber-500" /> Visible
                </label>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm(null)} className="flex-1 py-3 min-h-[44px] rounded-xl bg-slate-800 text-sm font-bold text-slate-300">Cancel</button>
                <button type="button" onClick={save} disabled={working}
                  className="flex-1 py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-black disabled:opacity-50">
                  {working ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {del && <ConfirmDialog title="Delete announcement?" body="It will stop showing in the app immediately."
        confirmLabel="Delete" working={working} onConfirm={doDelete} onCancel={() => setDel(null)} />}
    </div>
  );
};

const TemplatesView: React.FC = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [del, setDel] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.messageTemplates();
    if (r.ok) setTemplates(r.data.templates);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form?.name?.trim() || !form?.body?.trim()) { showToast('Name and body are required.', 'error'); return; }
    setWorking(true);
    const r = await firestoreAdmin.templateSave(form);
    setWorking(false);
    if (r.ok) { showToast('Template saved.', 'success'); setForm(null); load(); }
    else showToast(r.error || 'Save failed.', 'error');
  };
  const doDelete = async () => {
    if (!del) return;
    setWorking(true);
    const r = await firestoreAdmin.templateDelete(del);
    setWorking(false);
    setDel(null);
    if (r.ok) { showToast('Deleted.', 'success'); load(); }
    else showToast(r.error || 'Delete failed.', 'error');
  };

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => setForm({ name: '', type: 'announcement', body: '', locale: 'en' })}
          className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-xs font-black">
          <Plus className="w-4 h-4" /> New template
        </button>
      </div>
      {templates.length === 0 && <Empty text="No templates yet." />}
      {templates.map((t) => (
        <Card key={t.id}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-white text-sm">{t.name}</p>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.body}</p>
              <p className="text-[11px] text-slate-500 mt-1.5">{t.type} · {t.locale || 'en'}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button type="button" aria-label="Edit" onClick={() => setForm({ ...t })}
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"><Pencil className="w-4 h-4" /></button>
              <button type="button" aria-label="Delete" onClick={() => setDel(t.id)}
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-red-300 hover:bg-slate-800"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </Card>
      ))}
      {form && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-4">{form.id ? 'Edit' : 'New'} template</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Template name" className={inputCls} />
              <div className="flex gap-2">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                  <option value="announcement">Announcement</option>
                  <option value="reminder">Reminder</option>
                  <option value="greeting">Greeting</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select value={form.locale || 'en'} onChange={(e) => setForm({ ...form, locale: e.target.value })} className={inputCls}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="bn">Bengali</option>
                </select>
              </div>
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Template body — use {{name}} for personalization" rows={5} className={inputCls} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm(null)} className="flex-1 py-3 min-h-[44px] rounded-xl bg-slate-800 text-sm font-bold text-slate-300">Cancel</button>
                <button type="button" onClick={save} disabled={working}
                  className="flex-1 py-3 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-sm font-black disabled:opacity-50">
                  {working ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {del && <ConfirmDialog title="Delete template?" body="Messages using this template will fall back to plain text."
        confirmLabel="Delete" working={working} onConfirm={doDelete} onCancel={() => setDel(null)} />}
    </div>
  );
};

const SiteContentView: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newKey, setNewKey] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.siteContent();
    if (r.ok) setItems(r.data.items);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const save = async (key: string, value: string) => {
    if (!key.trim()) return;
    setWorking(true);
    const r = await firestoreAdmin.siteContentSave(key.trim(), value);
    setWorking(false);
    if (r.ok) { showToast('Saved.', 'success'); setEditKey(null); setNewKey(''); load(); }
    else showToast(r.error || 'Save failed.', 'error');
  };

  const SUGGESTED = ['hero_title', 'hero_subtitle', 'testimonial_1', 'testimonial_2', 'faq_1_q', 'faq_1_a', 'seva_contribution_transparency_en', 'seva_contribution_transparency_bn', 'seva_contribution_transparency_hi'];

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Key-value content for the landing page. The app reads these keys when present, falling back to built-in copy.
      </p>
      {items.length === 0 && (
        <Card className="border-dashed">
          <p className="text-xs text-slate-500 mb-2">No overrides yet. Suggested keys:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.map((k) => (
              <button key={k} type="button" onClick={() => setNewKey(k)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-[11px] font-mono text-saffron-300 hover:bg-slate-700 min-h-[36px]">{k}</button>
            ))}
          </div>
        </Card>
      )}
      {items.map((it) => (
        <Card key={it.id}>
          <p className="font-mono text-xs text-saffron-300 mb-1.5">{it.key || it.id}</p>
          {editKey === it.id ? (
            <div className="space-y-2">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className={inputCls} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditKey(null)} className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-300">Cancel</button>
                <button type="button" onClick={() => save(it.key || it.id, draft)} disabled={working}
                  className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50">
                  {working ? '…' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-300 flex-1 line-clamp-3">{it.value || '—'}</p>
              <button type="button" onClick={() => { setEditKey(it.id); setDraft(it.value || ''); }}
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 shrink-0">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </Card>
      ))}
      <Card>
        <h4 className="text-xs font-bold text-slate-300 mb-2">Add content key</h4>
        <div className="flex gap-2">
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="e.g. hero_title"
            className={inputCls + ' font-mono'} />
          <button type="button" onClick={() => { if (newKey.trim()) { setEditKey('__new'); setDraft(''); } }}
            disabled={!newKey.trim()} className="px-5 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-xs font-black disabled:opacity-50">Add</button>
        </div>
        {editKey === '__new' && (
          <div className="space-y-2 mt-3">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Content…" className={inputCls} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditKey(null)} className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-300">Cancel</button>
              <button type="button" onClick={() => save(newKey, draft)} disabled={working}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50">
                {working ? '…' : 'Save'}</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

/* ------------------------- Panjika Intelligence ------------------------- */

const PanjikaIntelView: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disabled, setDisabled] = useState<string[]>([]);
  const [leads, setLeads] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await firestoreAdmin.getIntelConfig();
      if (r) {
        setDisabled(r.disabledKeys || []);
        setLeads(r.leadOverrides || {});
      }
    } catch { /* fail open — built-in defaults */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (key: string) =>
    setDisabled((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));
  const setLead = (key: string, v: number) =>
    setLeads((l) => ({ ...l, [key]: Math.min(90, Math.max(0, Math.round(v) || 0)) }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await firestoreAdmin.saveIntelConfig({ disabledKeys: disabled, leadOverrides: leads });
      if (r.ok) showToast('Panjika Intelligence config saved 🪔', 'success');
      else showToast('Save failed', 'error');
    } catch (e: any) {
      showToast(e?.message || 'Save failed', 'error');
    }
    setSaving(false);
  };

  const roles = useMemo(() => {
    const map = new Map<string, typeof DEFAULT_MATRIX>();
    for (const d of DEFAULT_MATRIX) {
      const arr = map.get(d.role) || [];
      arr.push(d);
      map.set(d.role, arr);
    }
    return [...map.entries()];
  }, []);

  if (loading) return <Loading text="Loading intelligence matrix…" />;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-extrabold text-slate-100">🪔 Panjika Intelligence matrix</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Role-aware suchana before each tithi. Disable any reminder or adjust its lead
              days. Empty = built-in defaults. Changes apply to all users within minutes
              (local cache refresh).
            </p>
          </div>
          <button type="button" onClick={save} disabled={saving}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-saffron-500/20 text-saffron-300 border border-saffron-500/40 text-xs font-bold hover:bg-saffron-500/30 disabled:opacity-50">
            <span className="inline-flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save matrix'}</span>
          </button>
        </div>
      </Card>

      {roles.map(([role, defs]) => (
        <Card key={role}>
          <h4 className="text-xs font-black uppercase tracking-widest text-saffron-400 mb-3">{role}</h4>
          <div className="space-y-2">
            {defs.map((d) => {
              const key = `${d.eventType}:${d.role}`;
              const off = disabled.includes(key);
              return (
                <div key={key} className={`rounded-xl border p-3 ${off ? 'border-slate-800 opacity-50' : 'border-slate-700/60'}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="text-sm font-bold text-slate-200">{d.title.en}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{key}</div>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      lead
                      <input type="number" min={0} max={90} value={leads[key] ?? d.leadDays}
                        onChange={(e) => setLead(key, Number(e.target.value))}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200" />
                      d
                    </label>
                    <button type="button" onClick={() => toggle(key)}
                      className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold ${off ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'}`}>
                      {off ? 'Disabled' : 'Enabled'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
};

export const ContentTab: React.FC = () => {
  const [sub, setSub] = useState('Announcements');
  return (
    <div className="space-y-4">
      <SubTabs tabs={['Announcements', 'Templates', 'Site Content', 'Panjika Intel']} active={sub} onChange={setSub} />
      {sub === 'Announcements' && <AnnouncementsView />}
      {sub === 'Templates' && <TemplatesView />}
      {sub === 'Site Content' && <SiteContentView />}
      {sub === 'Panjika Intel' && <PanjikaIntelView />}
    </div>
  );
};

/* Re-export shared bits for AdminTabsE */
export { Card as CCard, Empty as CEmpty, Loading as CLoading, SubTabs as CSubTabs, inputCls as cInputCls };
export const CheckIcon = CheckCircle2;
export const XIcon = XCircle;
