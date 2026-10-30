/**
 * MarketplaceDuesRisk — GodMode Console: Rail-2 Dues + Risk subtabs.
 * ===================================================================
 * Dues: outstanding platform commission receivables on Rail-2 orders.
 *       Settle (with "verify in bKash first" confirm), waive (reason +
 *       audit), threshold/grace settings, auto-suspension checks.
 * Risk: Layer-7 anomaly signals + random audit picker with one-tap
 *       SMS-proof requests.
 *
 * Dark sovereign console, mobile-first. Every mutation audit-logged.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  HandCoins, ShieldAlert, RefreshCw, CheckCircle2, Search,
  Dices, MessageSquareText, Eye, Settings2, Ban,
} from 'lucide-react';
import { firestoreAdmin } from '../../../lib/firestoreAdmin';
import { ConfirmDialog } from '../GodModeConsole2';
import { useToast } from '../../../context/ToastContext';
import { useLanguage } from '../../../context/LanguageContext';
import { friendlyError } from '../../../lib/friendlyError';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl bg-slate-950/70 border border-slate-800 p-4 ${className}`}>{children}</div>
);
const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs text-slate-500 py-6 text-center">{text}</p>
);
const Loading: React.FC = () => (
  <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
    <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
  </div>
);
const inputCls = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500';
const btnPrimary = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-saffron-500 text-slate-950 hover:bg-saffron-400 transition-colors disabled:opacity-40';
const btnGhost = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors';

function fmt(n: number): string {
  return `৳${Math.round(n).toLocaleString('bn-BD')}`;
}

/* ------------------------------ Dues tab ------------------------------ */

export const DuesTab: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [dues, setDues] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [confirmSettle, setConfirmSettle] = useState<string | null>(null);
  const [waiving, setWaiving] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [settings, setSettings] = useState({ duesThreshold: 2000, duesGraceDays: 15 });
  const [editingSettings, setEditingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([firestoreAdmin.duesList(filter), firestoreAdmin.duesSettingsGet()]);
      if (d.ok) { setDues((d.data as any).dues || []); setTotal((d.data as any).totalPending || 0); }
      if (s.ok) setSettings({ duesThreshold: (s.data as any).duesThreshold, duesGraceDays: (s.data as any).duesGraceDays });
    } catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'save'), 'error'); }
    setLoading(false);
  }, [filter, showToast]);
  useEffect(() => { load(); }, [load]);

  const doSettle = async () => {
    if (!confirmSettle) return;
    try {
      const r = await firestoreAdmin.dueSettle(confirmSettle);
      if (!r.ok) throw new Error(r.error);
      showToast('Due marked settled.', 'success');
      setConfirmSettle(null); load();
    } catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'save'), 'error'); }
  };

  const doWaive = async () => {
    if (!waiving) return;
    if (!waiveReason.trim()) { showToast('Waiver reason is required.', 'error'); return; }
    try {
      const r = await firestoreAdmin.dueWaive(waiving, waiveReason);
      if (!r.ok) throw new Error(r.error);
      showToast('Due waived.', 'success');
      setWaiving(null); setWaiveReason(''); load();
    } catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'save'), 'error'); }
  };

  const saveSettings = async () => {
    try {
      const r = await firestoreAdmin.duesSettingsSave(settings.duesThreshold, settings.duesGraceDays);
      if (!r.ok) throw new Error(r.error);
      showToast('Dues settings saved.', 'success'); setEditingSettings(false); load();
    } catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'save'), 'error'); }
  };

  const runSuspensionCheck = async (providerUid: string) => {
    try {
      const r = await firestoreAdmin.checkDuesSuspension(providerUid);
      if (!r.ok) throw new Error(r.error);
      showToast((r.data as any).suspended ? 'Provider auto-suspended (dues overdue).' : 'Dues OK — no suspension.', (r.data as any).suspended ? 'error' : 'success');
      load();
    } catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'save'), 'error'); }
  };

  if (loading) return <Loading />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800">
          <p className="text-slate-500 text-[10px] uppercase font-bold">Outstanding dues</p>
          <p className="text-xl font-black text-amber-300">{fmt(total)}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800">
          <p className="text-slate-500 text-[10px] uppercase font-bold">Records</p>
          <p className="text-xl font-black text-slate-100">{dues.length}</p>
        </div>
      </div>

      {/* Settings */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-slate-200 flex items-center gap-1.5"><Settings2 className="w-4 h-4" /> Auto-suspension policy</p>
          <button type="button" onClick={() => setEditingSettings(!editingSettings)} className={btnGhost}>Edit</button>
        </div>
        {editingSettings ? (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <label className="text-[11px] text-slate-400">Threshold (৳)
              <input type="number" value={settings.duesThreshold} onChange={(e) => setSettings({ ...settings, duesThreshold: Number(e.target.value) })} className={inputCls} /></label>
            <label className="text-[11px] text-slate-400">Grace (days)
              <input type="number" value={settings.duesGraceDays} onChange={(e) => setSettings({ ...settings, duesGraceDays: Number(e.target.value) })} className={inputCls} /></label>
            <button type="button" onClick={saveSettings} className={`${btnPrimary} col-span-2`}>Save policy</button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 mt-2">
            Gigs auto-pause when dues ≥ <b className="text-slate-200">{fmt(settings.duesThreshold)}</b> and oldest due is older than <b className="text-slate-200">{settings.duesGraceDays} days</b>.
          </p>
        )}
      </Card>

      {/* Filter */}
      <div className="flex gap-1.5">
        {(['pending', 'settled', 'waived', 'all'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold capitalize ${filter === f ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>{f}</button>
        ))}
      </div>

      {/* Dues list */}
      <div className="space-y-2">
        {dues.length === 0 && <Empty text="No dues in this view." />}
        {dues.map((d: any) => (
          <Card key={d.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-100">{fmt(d.amount)} <span className="text-slate-500 font-normal">· {d.orderCode || d.orderId?.slice(0, 8)}</span></p>
                <p className="text-[11px] text-slate-400 truncate">{d.gigTitle || ''}</p>
                <p className="text-[10px] text-slate-500">Provider: {String(d.providerUid || '').slice(0, 12)}… · {String(d.createdAt || '').slice(0, 10)} · {d.ratePercent}% rate</p>
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${d.status === 'pending' ? 'bg-amber-500/15 text-amber-300' : d.status === 'settled' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                {String(d.status).toUpperCase()}
              </span>
            </div>
            {d.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setConfirmSettle(d.id)} className={`${btnPrimary} flex-1`}>
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Mark settled
                </button>
                <button type="button" onClick={() => setWaiving(d.id)} className={btnGhost}>Waive</button>
                <button type="button" onClick={() => runSuspensionCheck(d.providerUid)} className={btnGhost} title="Check auto-suspension">
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {waiving && (
        <Card className="border-amber-500/30">
          <p className="text-[11px] text-slate-400 mb-2">Waiver reason (required, audit-logged):</p>
          <input value={waiveReason} onChange={(e) => setWaiveReason(e.target.value)} className={inputCls} placeholder="e.g. Goodwill — provider's first month" maxLength={500} />
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={doWaive} className={btnPrimary}>Confirm waive</button>
            <button type="button" onClick={() => { setWaiving(null); setWaiveReason(''); }} className={btnGhost}>Cancel</button>
          </div>
        </Card>
      )}

      {confirmSettle && (
        <ConfirmDialog
          title="Mark due as settled?"
          body="Only confirm AFTER verifying the bKash payment in your own bKash app. This cannot be undone."
          confirmLabel="Verified — settle"
          onCancel={() => setConfirmSettle(null)}
          onConfirm={doSettle}
        />
      )}
    </div>
  );
};

/* ------------------------------ Risk tab ------------------------------ */

const RiskCard: React.FC<{ title: string; count: number; icon: React.ReactNode; children: React.ReactNode }> = ({ title, count, icon, children }) => (
  <Card>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <p className="text-xs font-black text-slate-200">{title}</p>
      <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-lg ${count > 0 ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{count}</span>
    </div>
    {children}
  </Card>
);

export const RiskTab: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await firestoreAdmin.riskDashboard();
      if (r.ok) setData(r.data);
      else showToast(r.error || 'Failed to load risk data.', 'error');
    } catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'save'), 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const runAuditPick = async () => {
    const ids = (data?.auditPick || []).map((a: any) => a.orderId);
    if (!ids.length) { showToast('No Rail-2 orders last week to audit.', 'info'); return; }
    setAuditing(true);
    try {
      const r = await firestoreAdmin.auditPickRequestSms(ids);
      if (!r.ok) throw new Error(r.error);
      showToast(`SMS verification requested for ${(r.data as any).sent} order(s).`, 'success');
    } catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'save'), 'error'); }
    setAuditing(false);
  };

  const smsFor = async (orderId: string, kind: 'request' | 'verify') => {
    try {
      const r = kind === 'request' ? await firestoreAdmin.requestSmsProof(orderId) : await firestoreAdmin.verifySms(orderId);
      if (!r.ok) throw new Error(r.error);
      showToast(kind === 'request' ? 'SMS proof requested from provider.' : 'Order marked SMS-verified.', 'success');
      load();
    } catch (e: any) { console.error(e); showToast(friendlyError(e, t, 'save'), 'error'); }
  };

  if (loading) return <Loading />;
  if (!data) return <Empty text="Could not load risk data." />;
  const s = data.summary || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800"><p className="text-[10px] text-slate-500 uppercase font-bold">Rail-2 orders</p><p className="text-lg font-black text-slate-100">{s.rail2Orders || 0}</p></div>
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800"><p className="text-[10px] text-slate-500 uppercase font-bold">Pending dues</p><p className="text-lg font-black text-amber-300">{fmt(s.pendingDuesTotal || 0)}</p></div>
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800"><p className="text-[10px] text-slate-500 uppercase font-bold">Risk signals</p><p className={`text-lg font-black ${(s.signals || 0) > 0 ? 'text-red-300' : 'text-emerald-300'}`}>{s.signals || 0}</p></div>
      </div>

      <RiskCard title="No-proof Rail-2 providers" count={data.noProofRail2?.length || 0} icon={<ShieldAlert className="w-4 h-4 text-red-400" />}>
        {(data.noProofRail2 || []).length === 0 ? <p className="text-[11px] text-slate-500">Clean.</p> :
          (data.noProofRail2 || []).map((r: any, i: number) => (
            <p key={i} className="text-[11px] text-slate-300 py-1 border-t border-slate-800 first:border-0">
              <b className="font-mono">{String(r.providerUid).slice(0, 12)}…</b> — {r.rail2Orders} Rail-2 orders, zero TrxIDs submitted
            </p>
          ))}
      </RiskCard>

      <RiskCard title="Overdue dues" count={data.overdueDues?.length || 0} icon={<HandCoins className="w-4 h-4 text-amber-400" />}>
        {(data.overdueDues || []).length === 0 ? <p className="text-[11px] text-slate-500">Clean.</p> :
          (data.overdueDues || []).map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1 border-t border-slate-800 first:border-0">
              <p className="text-[11px] text-slate-300"><b className="font-mono">{String(r.providerUid).slice(0, 12)}…</b> — {fmt(r.total)} · {r.ageDays}d overdue</p>
              <button type="button" onClick={() => firestoreAdmin.checkDuesSuspension(r.providerUid).then(() => { showToast('Suspension check run.', 'success'); load(); }).catch(() => showToast('Suspension check failed.', 'error'))} className={btnGhost}>
                <Ban className="w-3.5 h-3.5 inline mr-1" />Suspend
              </button>
            </div>
          ))}
      </RiskCard>

      <RiskCard title="High views, low orders" count={data.highViewsLowOrders?.length || 0} icon={<Eye className="w-4 h-4 text-sky-400" />}>
        {(data.highViewsLowOrders || []).length === 0 ? <p className="text-[11px] text-slate-500">Clean.</p> :
          (data.highViewsLowOrders || []).slice(0, 5).map((r: any, i: number) => (
            <p key={i} className="text-[11px] text-slate-300 py-1 border-t border-slate-800 first:border-0">{r.title} — {r.views} views, {r.orders} orders</p>
          ))}
      </RiskCard>

      <RiskCard title="Chatty non-bookers" count={data.chattyNonBookers?.length || 0} icon={<MessageSquareText className="w-4 h-4 text-violet-400" />}>
        {(data.chattyNonBookers || []).length === 0 ? <p className="text-[11px] text-slate-500">Clean.</p> :
          (data.chattyNonBookers || []).slice(0, 5).map((r: any, i: number) => (
            <p key={i} className="text-[11px] text-slate-300 py-1 border-t border-slate-800 first:border-0">
              <b className="font-mono">{String(r.clientUid).slice(0, 12)}…</b> — {r.abandonedOrders} abandoned bookings
            </p>
          ))}
      </RiskCard>

      <RiskCard title="Suspicious rating velocity" count={data.ratingVelocity?.length || 0} icon={<ShieldAlert className="w-4 h-4 text-orange-400" />}>
        {(data.ratingVelocity || []).length === 0 ? <p className="text-[11px] text-slate-500">Clean.</p> :
          (data.ratingVelocity || []).slice(0, 5).map((r: any, i: number) => (
            <p key={i} className="text-[11px] text-slate-300 py-1 border-t border-slate-800 first:border-0">{r.title} — ★{r.rating} with only {r.orders} orders</p>
          ))}
      </RiskCard>

      {/* Random audit picker — Layer 7 */}
      <Card className="border-dashed">
        <div className="flex items-center gap-2 mb-2">
          <Dices className="w-4 h-4 text-saffron-400" />
          <p className="text-xs font-black text-slate-200">Random audit — last week's Rail-2 orders</p>
        </div>
        {(data.auditPick || []).length === 0
          ? <p className="text-[11px] text-slate-500">No Rail-2 orders in the last 7 days.</p>
          : (
            <div className="space-y-1.5">
              {(data.auditPick || []).map((a: any) => (
                <div key={a.orderId} className="flex items-center justify-between bg-slate-900 rounded-xl px-3 py-2">
                  <p className="text-[11px] text-slate-300">
                    <b className="font-mono">{a.orderCode || a.orderId.slice(0, 8)}</b>
                    <span className="text-slate-500"> · TrxID {a.trxId || '—'} · {a.amount}</span>
                  </p>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => smsFor(a.orderId, 'request')} className={btnGhost}>Request SMS</button>
                    <button type="button" onClick={() => smsFor(a.orderId, 'verify')} className={btnGhost} title="Mark SMS-verified"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              <button type="button" disabled={auditing} onClick={runAuditPick} className={`${btnPrimary} w-full mt-2`}>
                {auditing ? 'Sending…' : `Request SMS proof for all ${data.auditPick.length} picked orders`}
              </button>
            </div>
          )}
      </Card>
    </div>
  );
};
