/**
 * MembershipDesk — organisation-side membership management (Membership sprint).
 * ==========================================================================
 * Trustee/SuperAdmin desk with three tabs:
 *   Members  — live roster from workspaceMembers (+ remove).
 *   Requests — pending joinRequests with Approve / Reject.
 *   Invite   — send invites by email/phone/uid with a role picker that
 *              enforces the grant matrix (Trustee cannot grant Trustee+).
 *
 * On mount (trustee), syncs the public org page so the directory stays fresh.
 */
import React, { useEffect, useState } from 'react';
import {
  Users, UserPlus, Inbox, Check, X, Loader2, Mail, Phone, Fingerprint,
  ShieldCheck, Trash2, Send,
} from 'lucide-react';
import { useMembership, syncOrgPage } from '../../context/MembershipContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { LimitReachedModal } from '../billing/LimitReachedModal';
import { TRUSTEE_GRANTABLE_ROLES, WorkspaceMembership, JoinRequest } from '../../types/membership';

type Tab = 'MEMBERS' | 'REQUESTS' | 'INVITE';

const ROLE_OPTIONS =
  TRUSTEE_GRANTABLE_ROLES.map((r) => ({ value: r, label: r }));

export const MembershipDesk: React.FC = () => {
  const { activeWorkspace, currentRole } = useAuthWorkspace();
  const {
    orgMembers, orgJoinRequests, orgInvites,
    decideJoinRequest, sendInvite, removeMember, ensureOrgPage,
  } = useMembership();

  const [tab, setTab] = useState<Tab>('MEMBERS');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { guard: guardPlanLimit, modalInfo: limitModalInfo, closeModal: closeLimitModal } = usePlanLimits();

  // Keep the public page in sync whenever a trustee opens this desk.
  useEffect(() => {
    if (activeWorkspace && !activeWorkspace.id.startsWith('DEMO_')) {
      ensureOrgPage(activeWorkspace).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  // ---- invite form ----
  const [invite, setInvite] = useState({ email: '', phone: '', uid: '', name: '', role: 'Devotee', message: '' });
  const [inviteBusy, setInviteBusy] = useState(false);

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Freemium seat-limit enforcement — invite counts as a staff seat.
    if (!(await guardPlanLimit('seats'))) return;
    setInviteBusy(true);
    try {
      await sendInvite({
        email: invite.email || undefined,
        phone: invite.phone || undefined,
        uid: invite.uid || undefined,
        name: invite.name || undefined,
        role: invite.role,
        message: invite.message || undefined,
      });
      setInvite({ email: '', phone: '', uid: '', name: '', role: 'Devotee', message: '' });
    } catch (err: any) {
      setError(err?.message || 'Could not send the invitation.');
    } finally {
      setInviteBusy(false);
    }
  };

  const decide = async (req: JoinRequest, approve: boolean) => {
    setBusyId(req.id);
    setError('');
    try {
      await decideJoinRequest(req, approve);
    } catch (err: any) {
      setError(err?.message || 'Could not decide the request.');
    } finally {
      setBusyId(null);
    }
  };

  const doRemove = async (m: WorkspaceMembership) => {
    if (!window.confirm(`Remove ${m.displayName || 'this member'} from the organisation?`)) return;
    setBusyId(m.id);
    setError('');
    try {
      await removeMember(m);
    } catch (err: any) {
      setError(err?.message || 'Could not remove the member.');
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'MEMBERS', label: 'Members', icon: <Users size={15} />, count: orgMembers.length },
    { id: 'REQUESTS', label: 'Join Requests', icon: <Inbox size={15} />, count: orgJoinRequests.length },
    { id: 'INVITE', label: 'Invite', icon: <UserPlus size={15} /> },
  ];

  const inputCls =
    'w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none min-h-[44px]';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white shadow">
          <Users size={22} />
        </div>
        <div>
          <h1 className="text-xl font-black text-stone-900">Membership</h1>
          <p className="text-xs text-stone-500">
            {activeWorkspace?.name} · invites, join requests and the member roster
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-2xl mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap min-h-[44px] ${
              tab === t.id ? 'bg-white text-amber-800 shadow' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.icon}
            {t.label}
            {typeof t.count === 'number' && t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs font-bold text-center mb-4">
          {error}
        </div>
      )}

      {/* ---- MEMBERS ---- */}
      {tab === 'MEMBERS' && (
        <div className="space-y-2">
          {orgMembers.length === 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
              <Users size={36} className="text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-stone-600">No members yet</p>
              <p className="text-xs text-stone-400 mt-1">Approved join requests and accepted invites appear here.</p>
            </div>
          )}
          {orgMembers.map((m) => (
            <div key={m.id} className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                {(m.displayName || 'M').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-stone-900 truncate">{m.displayName || 'Member'}</p>
                <p className="text-[11px] text-stone-500">
                  {m.role} · via {m.joinedVia === 'invite' ? 'invitation' : m.joinedVia === 'request' ? 'join request' : m.joinedVia}
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 bg-stone-100 rounded-full px-2 py-1">
                {m.role}
              </span>
              <button
                onClick={() => doRemove(m)}
                disabled={busyId === m.id}
                className="p-2.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={`Remove ${m.displayName}`}
              >
                {busyId === m.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
          <p className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-1">
            <ShieldCheck size={12} /> Membership is enforced by Firestore rules — the roster here mirrors the secure record.
          </p>
        </div>
      )}

      {/* ---- REQUESTS ---- */}
      {tab === 'REQUESTS' && (
        <div className="space-y-2">
          {orgJoinRequests.length === 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
              <Inbox size={36} className="text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-stone-600">No pending requests</p>
              <p className="text-xs text-stone-400 mt-1">When devotees tap “Request to Join” on your public page, they appear here.</p>
            </div>
          )}
          {orgJoinRequests.map((r) => (
            <div key={r.id} className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden">
                  {r.userPhoto ? <img src={r.userPhoto} alt="" className="w-full h-full object-cover" /> : (r.userName || 'D').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-stone-900 truncate">{r.userName}</p>
                  <p className="text-[11px] text-stone-500">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {r.message && (
                <p className="text-xs text-stone-600 bg-stone-50 border border-stone-100 rounded-xl p-3 mt-3">“{r.message}”</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => decide(r, true)}
                  disabled={busyId === r.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black min-h-[44px] disabled:opacity-50"
                >
                  {busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                </button>
                <button
                  onClick={() => decide(r, false)}
                  disabled={busyId === r.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-stone-300 hover:border-red-300 text-stone-600 hover:text-red-600 text-xs font-black min-h-[44px] disabled:opacity-50"
                >
                  <X size={14} /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- INVITE ---- */}
      {tab === 'INVITE' && (
        <form onSubmit={submitInvite} className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <p className="text-xs text-stone-500">
            Invite by email, phone, or user ID. They’ll see it in their account area and can accept in one tap.
            {currentRole !== 'SuperAdmin' && (
              <span className="block mt-1 font-bold text-amber-700">
                As Trustee you may grant operational roles only — never Trustee or SuperAdmin.
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} type="email" placeholder="Email address" className={`${inputCls} pl-10`} />
            </div>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} type="tel" placeholder="Phone number" className={`${inputCls} pl-10`} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Fingerprint size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={invite.uid} onChange={(e) => setInvite({ ...invite, uid: e.target.value })} placeholder="User ID (if known)" className={`${inputCls} pl-10`} />
            </div>
            <input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} placeholder="Name (optional note)" className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">Role to grant</label>
            <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })} className={`${inputCls} cursor-pointer`}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
              {currentRole === 'SuperAdmin' && (
                <>
                  <option value="Trustee">Trustee (SuperAdmin only)</option>
                  <option value="SuperAdmin">SuperAdmin (SuperAdmin only)</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
              Message <span className="normal-case font-medium">(optional)</span>
            </label>
            <textarea value={invite.message} onChange={(e) => setInvite({ ...invite, message: e.target.value.slice(0, 300) })} rows={2} maxLength={300} placeholder="e.g. We’d love you to join our sevadar team…" className={`${inputCls} resize-none`} />
          </div>
          <button
            type="submit"
            disabled={inviteBusy}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-black py-3 rounded-xl text-sm shadow-md disabled:opacity-50 min-h-[44px]"
          >
            {inviteBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {inviteBusy ? 'Sending…' : 'Send Invitation'}
          </button>
          <p className="text-[11px] text-stone-400">Invitations expire after 30 days.</p>

          {orgInvites.length > 0 && (
            <div className="pt-4 border-t border-stone-100">
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Recent invitations</p>
              <div className="space-y-2">
                {orgInvites.slice(0, 10).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs bg-stone-50 border border-stone-100 rounded-xl px-3 py-2.5">
                    <span className="font-bold text-stone-700 truncate">
                      {inv.invitedEmail || inv.invitedPhone || inv.invitedName || inv.invitedUid || '—'}
                      <span className="ml-2 font-medium text-stone-400">→ {inv.role}</span>
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      inv.status === 'PENDING' ? 'bg-amber-100 text-amber-700'
                      : inv.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-stone-200 text-stone-500'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      )}
      {limitModalInfo && (
        <LimitReachedModal info={limitModalInfo} onClose={closeLimitModal} />
      )}
    </div>
  );
};
