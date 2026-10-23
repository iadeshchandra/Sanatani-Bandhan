/**
 * AdminTabsH — Console: Marketplace anti-bypass + provider payments.
 * ================================================================
 * - Provider Payments: approval queue for own QR/UPI/link + inquiry inbox
 * - Bypass Flags: review queue for flagged messages (dismiss / warn / suspend)
 * - Bypass Rules: owner-editable detection patterns
 *
 * Dark sovereign console, saffron accents, mobile-first.
 * Every mutation is audit-logged in firestoreAdmin.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, CheckCircle2, XCircle, QrCode, Link2, CreditCard,
  MessageSquare, AlertTriangle, ShieldCheck, Ban, Plus, Pencil, Trash2, Eye,
} from 'lucide-react';
import { firestoreAdmin } from '../../../lib/firestoreAdmin';
import { safeExternalUrl } from '../../../lib/safeUrl';
import { adminApi } from '../../../lib/adminApi';
import { ConfirmDialog } from '../GodModeConsole2';
import { useToast } from '../../../context/ToastContext';

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
const btnPrimary = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-saffron-500 text-slate-950 hover:bg-saffron-400 transition-colors';
const btnGhost = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors';
const btnDanger = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-500 transition-colors';
const btnGreen = 'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-500 transition-colors';

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-emerald-500/20 text-emerald-300',
  rejected: 'bg-red-500/20 text-red-300',
  platform_assigned: 'bg-sky-500/20 text-sky-300',
  open: 'bg-yellow-500/20 text-yellow-300',
  replied: 'bg-emerald-500/20 text-emerald-300',
  dismissed: 'bg-slate-700 text-slate-400',
  actioned: 'bg-saffron-500/20 text-saffron-300',
};

/* ------------------------- Provider Payments ------------------------- */

export const ProviderPaymentsTab: React.FC = () => {
  const { showToast } = useToast();
  const [queue, setQueue] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; action: 'approved' | 'rejected' | 'platform_assigned' } | null>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [q, iq] = await Promise.all([
        adminApi.providerPaymentQueue('pending'),
        adminApi.providerInquiries('open'),
      ]);
      if (q.ok) setQueue((q.data as any).rows || []);
      if (iq.ok) setInquiries((iq.data as any).rows || []);
    } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const doReview = async () => {
    if (!confirm) return;
    const r = await adminApi.providerPaymentReview(confirm.id, confirm.action, notes);
    if (r.ok) { showToast('Decision recorded.', 'success'); setConfirm(null); setNotes(''); load(); }
    else showToast((r as any).error || 'Failed.', 'error');
  };

  const doReply = async () => {
    if (!replyTo || !replyText.trim()) return;
    const r = await adminApi.providerInquiryReply(replyTo.id, replyText);
    if (r.ok) { showToast('Reply sent.', 'success'); setReplyTo(null); setReplyText(''); load(); }
    else showToast((r as any).error || 'Failed.', 'error');
  };

  if (loading) return <Loading />;
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-black text-slate-300 mb-2 uppercase tracking-wider">Pending payment method requests ({queue.length})</h4>
        {queue.length === 0 && <Empty text="No pending requests." />}
        {queue.map((m: any) => (
          <Card key={m.id} className="mb-2">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-200">{m.providerName || m.providerUid?.slice(0, 12)} <span className="text-slate-500 font-normal">· {m.providerType}</span></p>
                <p className="text-[11px] text-saffron-300 font-bold mt-1">
                  {m.methodType === 'own_qr' ? '📷 Own QR code' : m.methodType === 'own_upi' ? '💳 Own UPI ID' : '🔗 Own payment link'}
                </p>
                {m.methodType === 'own_qr' && m.details?.qrImageUrl && (
                  <img src={m.details.qrImageUrl} alt="Provider QR" className="w-28 h-28 rounded-xl border border-slate-700 mt-2 bg-white" />
                )}
                {m.methodType === 'own_upi' && <p className="text-xs text-slate-300 font-mono mt-1">{m.details?.upiId}</p>}
                {m.methodType === 'own_link' && safeExternalUrl(m.details?.paymentLink) && <a href={safeExternalUrl(m.details?.paymentLink)!} target="_blank" rel="noreferrer" className="text-xs text-sky-300 underline break-all">{m.details?.paymentLink}</a>}
                {m.details?.accountLabel && <p className="text-[11px] text-slate-400 mt-1">{m.details.accountLabel}</p>}
                <p className="text-[11px] text-slate-400 mt-2 italic">"{m.reason}"</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              <button type="button" onClick={() => setConfirm({ id: m.id, action: 'approved' })} className={btnGreen}>Approve</button>
              <button type="button" onClick={() => setConfirm({ id: m.id, action: 'rejected' })} className={btnDanger}>Reject</button>
              <button type="button" onClick={() => setConfirm({ id: m.id, action: 'platform_assigned' })} className={btnGhost}>Assign platform</button>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <h4 className="text-xs font-black text-slate-300 mb-2 uppercase tracking-wider">Provider inquiries ({inquiries.length})</h4>
        {inquiries.length === 0 && <Empty text="No open inquiries." />}
        {inquiries.map((q: any) => (
          <Card key={q.id} className="mb-2">
            <div className="flex justify-between items-center">
              <p className="text-xs font-black text-slate-200">{q.subject}</p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${statusBadge[q.status]}`}>{q.status}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{q.providerName || q.providerUid?.slice(0, 12)} · {q.providerType}</p>
            <p className="text-xs text-slate-300 mt-2">{q.message}</p>
            <button type="button" onClick={() => setReplyTo(q)} className={`${btnGhost} w-full mt-2`}>
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Reply
            </button>
          </Card>
        ))}
      </div>

      {confirm && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 block">Review notes (shown to provider)<textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} /></label>
          <ConfirmDialog
            title={confirm.action === 'approved' ? 'Approve payment method?' : confirm.action === 'rejected' ? 'Reject payment method?' : 'Assign platform payment?'}
            body="The provider will be notified via inbox."
            onConfirm={() => { doReview(); }}
            onCancel={() => { setConfirm(null); setNotes(''); }}
          />
        </div>
      )}
      {replyTo && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setReplyTo(null)}>
          <div className="bg-slate-950 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-black text-slate-200 mb-1">Reply to provider</h4>
            <p className="text-[11px] text-slate-500 mb-3">{replyTo.subject}</p>
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className={inputCls} rows={4} placeholder="Write your reply…" />
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={doReply} className={`${btnPrimary} flex-1`}>Send reply</button>
              <button type="button" onClick={() => setReplyTo(null)} className={`${btnGhost} flex-1`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------------------- Bypass Flags ---------------------------- */

const sevBadge: Record<string, string> = {
  high: 'bg-red-500/20 text-red-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  low: 'bg-slate-700 text-slate-400',
};

export const BypassFlagsTab: React.FC = () => {
  const { showToast } = useToast();
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; action: 'dismiss' | 'warn' | 'suspend_gigs'; label: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.bypassFlags('pending');
      if (r.ok) setFlags((r.data as any).rows || []);
    } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const doResolve = async () => {
    if (!confirm) return;
    const r = await adminApi.bypassFlagResolve(confirm.id, confirm.action);
    if (r.ok) { showToast('Resolved.', 'success'); setConfirm(null); load(); }
    else showToast((r as any).error || 'Failed.', 'error');
  };

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex gap-2.5">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Messages are <b className="text-slate-200">flagged, never blocked</b>. Only excerpts (first 50 chars) are stored — never full content.
          Warn = strike + inbox warning. Suspend = strike + 7-day gig suspension.
        </p>
      </div>
      {flags.length === 0 && <Empty text="No pending flags. The marketplace is clean." />}
      {flags.map((f: any) => (
        <Card key={f.id}>
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${sevBadge[f.severity] || sevBadge.low}`}>{f.severity || 'low'}</span>
                <p className="text-[10px] text-slate-500 font-mono">{f.senderUid?.slice(0, 12)}…{f.orderId ? ` · order ${String(f.orderId).slice(0, 8)}` : ''}</p>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 italic">"{f.excerpt}"</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(f.reasons || []).map((r: string, i: number) => (
                  <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg">{r}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            <button type="button" onClick={() => setConfirm({ id: f.id, action: 'dismiss', label: 'Dismiss this flag?' })} className={btnGhost}>Dismiss</button>
            <button type="button" onClick={() => setConfirm({ id: f.id, action: 'warn', label: 'Issue strike + send warning?' })} className={btnPrimary}>Warn (strike)</button>
            <button type="button" onClick={() => setConfirm({ id: f.id, action: 'suspend_gigs', label: 'Suspend gigs for 7 days + strike?' })} className={btnDanger}>Suspend 7d</button>
          </div>
        </Card>
      ))}
      {confirm && (
        <ConfirmDialog title={confirm.label} body="This action is audit-logged." onConfirm={() => { doResolve(); }} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
};

/* ---------------------------- Bypass Rules ---------------------------- */

export const BypassRulesTab: React.FC = () => {
  const { showToast } = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [pattern, setPattern] = useState('');
  const [label, setLabel] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.bypassKeywords();
      if (r.ok) setRules((r.data as any).rows || []);
    } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const r = await adminApi.bypassKeywordSave({ id: editing?.id, pattern, label, severity, active: true });
    if (r.ok) { showToast('Pattern saved.', 'success'); setEditing(null); setPattern(''); setLabel(''); setSeverity('medium'); load(); }
    else showToast((r as any).error || 'Failed.', 'error');
  };

  const remove = async (id: string) => {
    if (!confirm('Deactivate this pattern?')) return;
    const r = await adminApi.bypassKeywordDelete(id);
    if (r.ok) { showToast('Deactivated.', 'success'); load(); }
    else showToast((r as any).error || 'Failed.', 'error');
  };

  const startEdit = (r: any) => {
    setEditing(r); setPattern(r.pattern || ''); setLabel(r.label || ''); setSeverity(r.severity || 'medium');
  };

  if (loading) return <Loading />;
  return (
    <div className="space-y-3">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex gap-2.5">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Built-in patterns (phone numbers, bKash/Nagad keywords, URLs, Bengali variants) always run.
          Add custom regex patterns here — they take effect within 5 minutes on all clients.
        </p>
      </div>
      <button type="button" onClick={() => { setEditing({}); setPattern(''); setLabel(''); setSeverity('medium'); }} className={`${btnPrimary} w-full`}>
        <Plus className="w-4 h-4 inline mr-1" /> Add pattern
      </button>
      {rules.filter((r: any) => r.active !== false).map((r: any) => (
        <Card key={r.id}>
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-200">{r.label}</p>
              <p className="text-[11px] text-slate-500 font-mono break-all mt-0.5">{r.pattern}</p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg mt-1.5 inline-block ${sevBadge[r.severity] || sevBadge.medium}`}>{r.severity}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              <button type="button" onClick={() => startEdit(r)} className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 text-slate-300" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
              <button type="button" onClick={() => remove(r.id)} className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-red-900/40 text-red-300" aria-label="Deactivate"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </Card>
      ))}
      {rules.filter((r: any) => r.active !== false).length === 0 && <Empty text="No custom patterns. Built-in detection is active." />}

      {editing && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditing(null)}>
          <div className="bg-slate-950 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-black text-slate-200 mb-3">{editing.id ? 'Edit pattern' : 'New pattern'}</h4>
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400">Label<input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder="e.g. Cash on delivery attempt" /></label>
              <label className="text-[11px] font-bold text-slate-400">Regex pattern<input value={pattern} onChange={(e) => setPattern(e.target.value)} className={inputCls} placeholder="e.g. \bcash\b.*\bdelivery\b" /></label>
              <label className="text-[11px] font-bold text-slate-400">Severity
                <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className={inputCls}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select></label>
              <div className="flex gap-2">
                <button type="button" onClick={save} className={`${btnPrimary} flex-1`}><CheckCircle2 className="w-4 h-4 inline mr-1" />Save</button>
                <button type="button" onClick={() => setEditing(null)} className={`${btnGhost} flex-1`}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------------- Strikes in provider detail ---------------------- */

/** Strike history panel for the owner provider-detail view. */
export const ProviderStrikesPanel: React.FC<{ providerUid: string }> = ({ providerUid }) => {
  const { showToast } = useToast();
  const [strikes, setStrikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [iType, setIType] = useState<'bypass_attempt' | 'payment_fraud' | 'fake_completion' | 'other'>('other');
  const [iNotes, setINotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.providerStrikes(providerUid);
      if (r.ok) setStrikes((r.data as any).rows || []);
    } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [providerUid, showToast]);
  useEffect(() => { load(); }, [load]);

  const issue = async () => {
    const r = await adminApi.issueStrike(providerUid, iType, '', iNotes);
    if (r.ok) { showToast(`Strike ${(r.data as any).strikeNumber} issued.`, 'success'); setIssueOpen(false); setINotes(''); load(); }
    else showToast((r as any).error || 'Failed.', 'error');
  };

  if (loading) return <Loading />;
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-2">
        <h5 className="text-[11px] font-black text-slate-400 uppercase">Strikes ({strikes.length})</h5>
        <button type="button" onClick={() => setIssueOpen(true)} className={`${btnDanger} !min-h-[40px] !py-2`}>
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> Issue strike
        </button>
      </div>
      {strikes.length === 0 && <Empty text="No strikes on record." />}
      {strikes.map((s: any) => (
        <div key={s.id} className="bg-slate-900 rounded-xl p-2.5 mb-1.5 text-[11px]">
          <p className="font-black text-red-300">Strike {s.strikeNumber}: {s.type?.replace('_', ' ')}</p>
          <p className="text-slate-400 mt-0.5">{s.notes}</p>
          <p className="text-slate-500 mt-1">Action: {s.actionTaken?.replace('_', ' ')}</p>
        </div>
      ))}
      {issueOpen && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setIssueOpen(false)}>
          <div className="bg-slate-950 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-black text-slate-200 mb-3">Issue strike</h4>
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400">Type
                <select value={iType} onChange={(e) => setIType(e.target.value as any)} className={inputCls}>
                  <option value="bypass_attempt">Off-platform payment/contact attempt</option>
                  <option value="payment_fraud">Payment fraud</option>
                  <option value="fake_completion">False completion claim</option>
                  <option value="other">Other</option>
                </select></label>
              <label className="text-[11px] font-bold text-slate-400">Notes<textarea value={iNotes} onChange={(e) => setINotes(e.target.value)} className={inputCls} rows={3} /></label>
              <p className="text-[10px] text-amber-400">Escalation is automatic: 1st = warning, 2nd = 7-day suspension, 3rd+ = flagged for your review.</p>
              <div className="flex gap-2">
                <button type="button" onClick={issue} className={`${btnDanger} flex-1`}>Issue strike</button>
                <button type="button" onClick={() => setIssueOpen(false)} className={`${btnGhost} flex-1`}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
