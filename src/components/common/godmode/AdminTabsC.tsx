/**
 * AdminTabsC — Console 3.0: Insights Dashboard + Database Explorer.
 * Spark-native (firestoreAdmin direct). Dark/gold sovereign aesthetic.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Building2, Wallet, BellRing, RefreshCw, Search,
  Database, FileJson, Pencil, Plus, Trash2, ChevronRight, ChevronLeft,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { firestoreAdmin } from '../../../lib/firestoreAdmin';
import { ConfirmDialog } from '../GodModeConsole2';
import { useToast } from '../../../context/ToastContext';

/* ------------------------- Shared small pieces ------------------------- */

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

/** Human-readable audit action labels for the activity feed. */
function humanizeAction(action: string, details: any): string {
  const d = details || {};
  const short = (s: string, n = 40) => (s || '').toString().slice(0, n);
  switch (action) {
    case 'verification.approve': return `Approved ${d.kind || 'verification'} (${short(d.tier)})`;
    case 'verification.reject': return `Rejected ${d.kind || 'verification'} application`;
    case 'billing.claim.approve': return `Approved payment claim → ${d.planId} plan`;
    case 'billing.claim.reject': return `Rejected payment claim`;
    case 'workspace.plan.change': return `Plan changed: ${d.prevPlan} → ${d.planId}`;
    case 'moderation.action': return `Moderation: ${d.action} on report`;
    case 'message.send': return `Sent ${d.type}: “${short(d.title, 32)}”`;
    case 'message.schedule': return `Scheduled message: “${short(d.title, 32)}”`;
    case 'commission.rule.create': return `Created commission rule (${d.ratePercent}%)`;
    case 'commission.rule.update': return `Updated commission rule (${d.ratePercent}%)`;
    case 'commission.payout.decide': return `${d.approved ? 'Approved' : 'Rejected'} payout ₹${d.amount}`;
    case 'commission.payout.paid': return `Marked payout as paid`;
    case 'commission.txn.status': return `Transaction → ${d.status}`;
    case 'content.announcement.create': return `Published announcement: “${short(d.title, 32)}”`;
    case 'content.announcement.update': return `Updated announcement: “${short(d.title, 32)}”`;
    case 'content.announcement.delete': return `Deleted announcement`;
    case 'content.template.create': return `Created message template: ${short(d.name, 30)}`;
    case 'content.template.update': return `Updated message template: ${short(d.name, 30)}`;
    case 'content.site.save': return `Updated site content: ${d.key}`;
    case 'settings.flag.set': return `Feature flag ${d.key} → ${d.enabled ? 'ON' : 'OFF'}`;
    case 'settings.plan.save': return `Updated plan: ${d.name}`;
    case 'settings.config.set': return `Platform config updated`;
    case 'support.lead.status': return `Support lead → ${d.status}`;
    case 'support.lead.reply': return `Replied to support lead${d.inboxDelivered ? ' (inbox)' : ''}`;
    case 'db.field.set': return `Edited ${d.collection}/${short(d.docId, 12)}.${d.field}`;
    case 'db.field.delete': return `Deleted field ${d.collection}/${short(d.docId, 12)}.${d.field}`;
    default: return action.replace(/\./g, ' · ');
  }
}

/** Lightweight SVG sparkline — no chart deps. */
const Sparkline: React.FC<{ values: number[]; width?: number; height?: number }> = ({ values, width = 280, height = 64 }) => {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const step = width / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 6 - (v / max) * (height - 14)).toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={height - 6 - (v / max) * (height - 14)} r={i === values.length - 1 ? 3.5 : 1.6}
          fill={i === values.length - 1 ? '#fbbf24' : '#b45309'} />
      ))}
      <text x={width - 4} y={14} textAnchor="end" fill="#fbbf24" fontSize="11" fontWeight="bold">{last}</text>
    </svg>
  );
};

/* --------------------------- Insights Dashboard -------------------------- */

export const InsightsTab: React.FC<{ goToTab: (t: string) => void }> = ({ goToTab }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ins, audit] = await Promise.all([
        firestoreAdmin.insights(),
        firestoreAdmin.auditLogs({ limit: 20 }),
      ]);
      if (ins.ok) setData(ins.data);
      else showToast(ins.error || 'Insights failed.', 'error');
      if (audit.ok) setFeed(audit.data.entries || []);
    } catch (e: any) {
      showToast(e?.message || 'Load failed.', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading text="Computing live insights…" />;
  if (!data) return <Empty text="No insight data available." />;

  const k = data.kpis;
  const kpis = [
    { label: 'Total Users', value: k.totalUsers, icon: <Users className="w-4 h-4" />, tone: 'text-sky-300' },
    { label: 'Workspaces', value: k.activeWorkspaces, icon: <Building2 className="w-4 h-4" />, tone: 'text-emerald-300' },
    { label: 'MRR', value: `₹${k.mrr.toLocaleString('en-IN')}`, icon: <Wallet className="w-4 h-4" />, tone: 'text-amber-300' },
    { label: 'Needs Action', value: k.pendingActions, icon: <BellRing className="w-4 h-4" />, tone: k.pendingActions > 0 ? 'text-red-300' : 'text-slate-400' },
  ];
  const f = data.verificationFunnel;
  const funnelTotal = Math.max(f.pending + f.approved + f.rejected, 1);
  const revEntries = Object.entries(data.revenueByMonth || {}).sort().slice(-6);

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((c) => (
          <Card key={c.label}>
            <div className={`flex items-center gap-2 ${c.tone}`}>{c.icon}
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">{c.label}</p>
            </div>
            <p className="text-2xl font-black text-white mt-1.5">{c.value}</p>
            {/* AUDIT FIX #8: show the math, not just the number. */}
            {c.label === 'MRR' && data.mrrBreakdown && data.mrrBreakdown.length > 0 && (
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                {data.mrrBreakdown.map((l: any) =>
                  `${l.count}×${l.planId}${l.cadence === 'annual' ? ' (yr÷12)' : ''}`
                ).join(' + ')}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Needs attention */}
      {(data.pendingClaims > 0 || data.openReports > 0 || f.pending > 0) && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <h3 className="text-sm font-bold text-amber-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Needs attention
          </h3>
          <div className="flex flex-wrap gap-2">
            {f.pending > 0 && (
              <button type="button" onClick={() => goToTab('verification')}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500/20 text-amber-200 text-xs font-bold hover:bg-amber-500/30">
                {f.pending} verifications pending →
              </button>
            )}
            {data.pendingClaims > 0 && (
              <button type="button" onClick={() => goToTab('billing')}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500/20 text-amber-200 text-xs font-bold hover:bg-amber-500/30">
                {data.pendingClaims} payment claims →
              </button>
            )}
            {data.openReports > 0 && (
              <button type="button" onClick={() => goToTab('moderation')}
                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500/20 text-amber-200 text-xs font-bold hover:bg-amber-500/30">
                {data.openReports} open reports →
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Signups sparkline */}
      <Card>
        <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" /> Signups — last 30 days
        </h3>
        {data.signupsDated < data.signupsTotal && (
          <p className="text-[11px] text-slate-500 mb-2">
            Based on {data.signupsDated} of {data.signupsTotal} users with timestamps.
          </p>
        )}
        <Sparkline values={data.signups30d} />
      </Card>

      {/* Revenue + funnel */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <h3 className="text-sm font-bold text-slate-200 mb-3">Revenue by month</h3>
          {revEntries.length === 0 ? <Empty text="No subscription revenue yet." /> : (
            <div className="space-y-2">
              {revEntries.map(([m, v]: any) => (
                <div key={m} className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-slate-400 w-16">{m}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                      style={{ width: `${Math.min(100, (v / Math.max(...revEntries.map((e: any) => e[1]), 1)) * 100)}%` }} />
                  </div>
                  <span className="font-bold text-amber-200 w-20 text-right">₹{Number(v).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-bold text-slate-200 mb-3">Verification funnel</h3>
          {[
            { label: 'Pending', v: f.pending, cls: 'bg-amber-500' },
            { label: 'Approved', v: f.approved, cls: 'bg-emerald-500' },
            { label: 'Rejected', v: f.rejected, cls: 'bg-red-500' },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-3 text-xs mb-2">
              <span className="text-slate-400 w-20">{r.label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${r.cls}`} style={{ width: `${(r.v / funnelTotal) * 100}%` }} />
              </div>
              <span className="font-bold text-white w-8 text-right">{r.v}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Activity feed */}
      <Card>
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Latest activity
        </h3>
        {feed.length === 0 ? <Empty text="No activity recorded yet." /> : (
          <div className="space-y-2.5">
            {feed.map((e) => (
              <div key={e.id} className="flex items-start gap-3 text-xs py-1.5 border-b border-slate-800/50 last:border-0">
                <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                  e.severity === 'critical' ? 'bg-red-400' : e.severity === 'warning' ? 'bg-amber-400' : 'bg-sky-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 font-medium">{humanizeAction(e.action, e.details)}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {e.actorEmail || 'owner'}{e.createdAt ? ` · ${new Date(e.createdAt).toLocaleString()}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <button type="button" onClick={load}
        className="w-full py-3 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4" /> Refresh insights
      </button>
    </div>
  );
}

/* --------------------------- Database Explorer --------------------------- */

type FieldType = 'string' | 'number' | 'boolean' | 'timestamp' | 'object' | 'null';

function detectType(v: any): FieldType {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'string') return 'string';
  if (v?.toDate) return 'timestamp';
  return 'object';
}

function fieldPreview(v: any): string {
  const t = detectType(v);
  if (t === 'timestamp') { try { return v.toDate().toLocaleString(); } catch { return 'timestamp'; } }
  if (t === 'object') { const s = JSON.stringify(v); return s.length > 60 ? s.slice(0, 60) + '…' : s; }
  if (t === 'null') return 'null';
  return String(v);
}

export const DatabaseExplorerTab: React.FC = () => {
  const { showToast } = useToast();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCol, setActiveCol] = useState<string | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selDoc, setSelDoc] = useState<{ id: string; fields: any } | null>(null);
  const [editing, setEditing] = useState<{ field: string; type: FieldType; draft: string } | null>(null);
  const [newField, setNewField] = useState({ name: '', type: 'string' as FieldType, value: '' });
  const [delField, setDelField] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    const r = await firestoreAdmin.explorerCollections();
    if (r.ok) setCollections(r.data.collections);
    else showToast(r.error || 'Failed.', 'error');
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadCollections(); }, [loadCollections]);

  const openCollection = useCallback(async (name: string, q = '') => {
    setActiveCol(name);
    setSelDoc(null);
    setDocsLoading(true);
    const r = await firestoreAdmin.explorerListDocs(name, q);
    setDocsLoading(false);
    if (r.ok) setDocs(r.data.docs);
    else showToast(r.error || 'Failed.', 'error');
  }, [showToast]);

  const openDoc = useCallback(async (docId: string) => {
    if (!activeCol) return;
    const r = await firestoreAdmin.explorerGetDoc(activeCol, docId);
    if (r.ok) setSelDoc({ id: r.data.id, fields: r.data.fields });
    else showToast(r.error || 'Failed.', 'error');
  }, [activeCol, showToast]);

  const parseDraft = (type: FieldType, draft: string): any => {
    if (type === 'number') { const n = Number(draft); if (Number.isNaN(n)) throw new Error('Not a number'); return n; }
    if (type === 'boolean') return draft === 'true' || draft === '1';
    return draft;
  };

  const saveField = async () => {
    if (!activeCol || !selDoc || !editing) return;
    setWorking(true);
    try {
      const value = parseDraft(editing.type, editing.draft);
      const r = await firestoreAdmin.explorerSetField(activeCol, selDoc.id, editing.field, value);
      if (r.ok) {
        showToast('Field saved.', 'success');
        setEditing(null);
        openDoc(selDoc.id);
      } else showToast(r.error || 'Save failed.', 'error');
    } catch (e: any) {
      showToast(e?.message || 'Invalid value.', 'error');
    }
    setWorking(false);
  };

  const addField = async () => {
    if (!activeCol || !selDoc || !newField.name.trim()) return;
    setWorking(true);
    try {
      const value = parseDraft(newField.type, newField.value);
      const r = await firestoreAdmin.explorerSetField(activeCol, selDoc.id, newField.name.trim(), value);
      if (r.ok) {
        showToast('Field added.', 'success');
        setNewField({ name: '', type: 'string', value: '' });
        openDoc(selDoc.id);
      } else showToast(r.error || 'Add failed.', 'error');
    } catch (e: any) {
      showToast(e?.message || 'Invalid value.', 'error');
    }
    setWorking(false);
  };

  const confirmDeleteField = async () => {
    if (!activeCol || !selDoc || !delField) return;
    setWorking(true);
    const r = await firestoreAdmin.explorerDeleteField(activeCol, selDoc.id, delField);
    setWorking(false);
    setDelField(null);
    if (r.ok) { showToast('Field deleted.', 'success'); openDoc(selDoc.id); }
    else showToast(r.error || 'Delete failed.', 'error');
  };

  const activeMeta = collections.find((c) => c.name === activeCol);

  return (
    <div className="space-y-4">
      {!activeCol ? (
        <>
          <p className="text-xs text-slate-400">
            Browse and safely edit any collection. <span className="text-amber-300">audit_logs</span> is read-only —
            every edit you make is recorded.
          </p>
          {loading ? <Loading text="Counting documents…" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {collections.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => openCollection(c.name)}
                  className="flex items-center gap-3 p-3.5 min-h-[56px] rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-saffron-500/40 text-left"
                >
                  <Database className="w-4 h-4 text-saffron-400 shrink-0" />
                  <span className="font-mono text-xs text-slate-200 flex-1 truncate">{c.name}</span>
                  {c.readonly && <span className="text-[10px] font-bold text-slate-500 uppercase">read-only</span>}
                  <span className="text-xs font-black text-slate-400">{c.count < 0 ? '—' : c.count}</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : selDoc ? (
        <>
          <button type="button" onClick={() => setSelDoc(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white min-h-[44px]">
            <ChevronLeft className="w-4 h-4" /> {activeCol}
          </button>
          <Card>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white font-mono truncate">{selDoc.id}</h3>
              {activeMeta?.readonly && (
                <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-800 px-2 py-1 rounded-full">read-only</span>
              )}
            </div>
            <div className="divide-y divide-slate-800/60">
              {Object.entries(selDoc.fields || {}).map(([field, value]) => {
                const type = detectType(value);
                const isEditing = editing?.field === field;
                return (
                  <div key={field} className="py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <FileJson className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-xs text-saffron-300 truncate flex-1">{field}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{type}</span>
                      {!activeMeta?.readonly && (type === 'string' || type === 'number' || type === 'boolean') && !isEditing && (
                        <div className="flex gap-1">
                          <button type="button" aria-label={`Edit ${field}`}
                            onClick={() => setEditing({ field, type, draft: type === 'boolean' ? String(!!value) : String(value ?? '') })}
                            className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" aria-label={`Delete ${field}`}
                            onClick={() => setDelField(field)}
                            className="p-2 min-w-[36px] min-h-[36px] rounded-lg text-slate-400 hover:text-red-300 hover:bg-slate-800">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="flex gap-2 mt-1.5">
                        {editing.type === 'boolean' ? (
                          <select value={editing.draft} onChange={(e) => setEditing({ ...editing, draft: e.target.value })}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none">
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <input value={editing.draft} onChange={(e) => setEditing({ ...editing, draft: e.target.value })}
                            inputMode={editing.type === 'number' ? 'decimal' : 'text'}
                            className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500" />
                        )}
                        <button type="button" onClick={saveField} disabled={working}
                          className="px-4 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50">
                          {working ? '…' : 'Save'}
                        </button>
                        <button type="button" onClick={() => setEditing(null)}
                          className="px-4 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-300">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 font-mono break-all pl-5">{fieldPreview(value)}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {!activeMeta?.readonly && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add field
                </h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={newField.name} onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    placeholder="field_name"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm font-mono text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500" />
                  <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value as FieldType })}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none">
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                  <input value={newField.value} onChange={(e) => setNewField({ ...newField, value: e.target.value })}
                    placeholder="value"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500" />
                  <button type="button" onClick={addField} disabled={working || !newField.name.trim()}
                    className="px-5 min-h-[44px] rounded-xl bg-saffron-500 text-slate-950 text-xs font-black disabled:opacity-50">
                    {working ? '…' : 'Add'}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          <button type="button" onClick={() => { setActiveCol(null); setDocs([]); }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white min-h-[44px]">
            <ChevronLeft className="w-4 h-4" /> All collections
          </button>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && openCollection(activeCol, search)}
              placeholder={`Search in ${activeCol}…`}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 min-h-[44px] text-sm text-slate-200 outline-none focus:ring-2 focus:ring-saffron-500" />
          </div>
          {docsLoading ? <Loading /> : docs.length === 0 ? <Empty text="No documents found." /> : (
            <div className="space-y-2">
              {docs.map((d) => (
                <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                  className="w-full flex items-center gap-3 p-3.5 min-h-[56px] rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-saffron-500/40 text-left">
                  <FileJson className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="font-mono text-xs text-slate-200 flex-1 truncate">{d.id}</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {delField && (
        <ConfirmDialog
          title="Delete field?"
          body={`Permanently remove “${delField}” from this document. This is recorded in the audit log.`}
          confirmLabel="Delete field"
          working={working}
          onConfirm={confirmDeleteField}
          onCancel={() => setDelField(null)}
        />
      )}
    </div>
  );
}
