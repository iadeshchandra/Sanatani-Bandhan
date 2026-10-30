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
import { appLocale } from '../../lib/format';
import {
  Users, UserPlus, Inbox, Check, X, Loader2, Mail, Phone, Fingerprint,
  ShieldCheck, Trash2, Send, Pencil, CalendarClock,
} from 'lucide-react';
import { useMembership, syncOrgPage } from '../../context/MembershipContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { LimitReachedModal } from '../billing/LimitReachedModal';
import { WorkspaceMembership, JoinRequest } from '../../types/membership';
import { useLanguage } from '../../context/LanguageContext';
import { MemberAccessEditor } from './MemberAccessEditor';
import { ApprovalsPanel } from './ApprovalsPanel';
import {
  resolveAssignment, templateById, validateAssignment, type RoleAssignment,
} from '../../lib/roleTemplates';
import { expiryState } from '../../lib/membershipAccess';
import { APPROVAL_REQUIRED } from '../../lib/approvals';
import { resolveEdgeRole } from '../../lib/landingSurface';
import { friendlyError } from '../../lib/friendlyError';

type Tab = 'MEMBERS' | 'REQUESTS' | 'INVITE';

export const MembershipDesk: React.FC = () => {
  const { t } = useLanguage();
  const { activeWorkspace, currentRole } = useAuthWorkspace();
  const {
    orgMembers, orgJoinRequests, orgInvites,
    decideJoinRequest, sendInvite, removeMember, ensureOrgPage,
    requestRoleGrant, updateMembershipAccess,
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
  const [invite, setInvite] = useState({ email: '', phone: '', uid: '', name: '', message: '' });
  // Blueprint B: the assignment (template + scope + expiry) is a
  // first-class value, resolved by lib/roleTemplates.
  const [assignment, setAssignment] = useState<RoleAssignment>(() =>
    resolveAssignment({ templateId: 'member-donor' }, Date.now())
  );
  const [inviteBusy, setInviteBusy] = useState(false);

  const resetInviteForm = () => {
    setInvite({ email: '', phone: '', uid: '', name: '', message: '' });
    setAssignment(resolveAssignment({ templateId: 'member-donor' }, Date.now()));
  };

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs = validateAssignment(assignment, Date.now());
    if (errs.length) {
      setError(
        t(errs[0] === 'SCOPE_REQUIRED' ? 'org.access.editor.scopeRequired' : 'org.access.editor.expiryPast')
      );
      return;
    }
    // Freemium seat-limit enforcement — invite counts as a staff seat.
    if (!(await guardPlanLimit('seats'))) return;
    setInviteBusy(true);
    try {
      await sendInvite({
        email: invite.email || undefined,
        phone: invite.phone || undefined,
        uid: invite.uid || undefined,
        name: invite.name || undefined,
        role: assignment.role,
        templateId: assignment.templateId,
        deskScope: assignment.deskScope,
        roleExpiresAt: assignment.roleExpiresAt,
        message: invite.message || undefined,
      });
      resetInviteForm();
    } catch (err: any) {
      if (err?.code === APPROVAL_REQUIRED) {
        // Blueprint B: a gated grant (> Sevadar) files a maker–checker
        // request instead; the invite is sent by the checker's
        // client once a DIFFERENT Trustee approves it.
        try {
          await requestRoleGrant({
            mode: 'invite',
            invite: {
              email: invite.email || undefined,
              phone: invite.phone || undefined,
              uid: invite.uid || undefined,
              name: invite.name || undefined,
              message: invite.message || undefined,
            },
            targetName: invite.name || invite.email || invite.phone || invite.uid || 'Invitee',
            assignment,
          });
          resetInviteForm();
        } catch (e2: any) {
          console.error(e2);
          setError(friendlyError(e2, t, 'save'));
        }
      } else {
        console.error(err);
        setError(friendlyError(err, t, 'save'));
      }
    } finally {
      setInviteBusy(false);
    }
  };

  // ---- member access editing (Blueprint B) ----
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAssignment, setEditAssignment] = useState<RoleAssignment | null>(null);

  const beginEdit = (m: WorkspaceMembership) => {
    setEditAssignment({
      role: resolveEdgeRole(m.role),
      templateId: m.templateId ?? null,
      deskScope: m.deskScope ?? null,
      roleExpiresAt: m.roleExpiresAt ?? null,
    });
    setEditingId(m.id);
    setError('');
  };

  // Blueprint D — the Access Review card's deep link: it stores the
  // member's uid in sessionStorage ('sb_focus_member'); on arrival,
  // open that member's editor directly. Consumed once.
  useEffect(() => {
    let focusUid: string | null = null;
    try {
      focusUid = sessionStorage.getItem('sb_focus_member');
      if (focusUid) sessionStorage.removeItem('sb_focus_member');
    } catch {
      focusUid = null;
    }
    if (!focusUid) return;
    const m = orgMembers.find((x) => x.uid === focusUid);
    if (m) beginEdit(m);
    // beginEdit is a stable local closure over the current render's
    // setters; orgMembers identity is the meaningful trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgMembers]);

  const saveEdit = async (m: WorkspaceMembership) => {
    if (!editAssignment) return;
    const errs = validateAssignment(editAssignment, Date.now());
    if (errs.length) {
      setError(
        t(errs[0] === 'SCOPE_REQUIRED' ? 'org.access.editor.scopeRequired' : 'org.access.editor.expiryPast')
      );
      return;
    }
    const changes: {
      role?: string;
      templateId?: string | null;
      deskScope?: string[] | null;
      roleExpiresAt?: number | null;
    } = {};
    if (editAssignment.role !== resolveEdgeRole(m.role)) changes.role = editAssignment.role;
    if ((editAssignment.templateId ?? null) !== (m.templateId ?? null)) changes.templateId = editAssignment.templateId;
    if (JSON.stringify(editAssignment.deskScope ?? null) !== JSON.stringify(m.deskScope ?? null)) changes.deskScope = editAssignment.deskScope;
    if ((editAssignment.roleExpiresAt ?? null) !== (m.roleExpiresAt ?? null)) changes.roleExpiresAt = editAssignment.roleExpiresAt;
    if (Object.keys(changes).length === 0) {
      setEditingId(null);
      return;
    }
    setBusyId(m.id);
    setError('');
    try {
      await updateMembershipAccess(m, changes);
      setEditingId(null);
    } catch (err: any) {
      if (err?.code === APPROVAL_REQUIRED) {
        try {
          await requestRoleGrant({
            mode: 'membership',
            membershipId: m.id,
            targetUid: m.uid,
            targetName: m.displayName || m.email || 'Member',
            assignment: editAssignment,
          });
          setEditingId(null);
        } catch (e2: any) {
          console.error(e2);
          setError(friendlyError(e2, t, 'save'));
        }
      } else {
        console.error(err);
        setError(friendlyError(err, t, 'save'));
      }
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (req: JoinRequest, approve: boolean) => {
    setBusyId(req.id);
    setError('');
    try {
      await decideJoinRequest(req, approve);
    } catch (err: any) {
      console.error(err);
      setError(friendlyError(err, t, 'save'));
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
      console.error(err);
      setError(friendlyError(err, t, 'save'));
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
          {orgMembers.map((m) => {
            const tpl = templateById(m.templateId);
            const expState = expiryState(m, Date.now());
            return (
              <div key={m.id} className="bg-white border border-stone-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {(m.displayName || 'M').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-stone-900 truncate">{m.displayName || 'Member'}</p>
                    <p className="text-[11px] text-stone-500">
                      {resolveEdgeRole(m.role)} · via {m.joinedVia === 'invite' ? 'invitation' : m.joinedVia === 'request' ? 'join request' : m.joinedVia}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tpl && (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">
                          {t(tpl.nameKey)}
                        </span>
                      )}
                      {Array.isArray(m.deskScope) && (
                        <span className="text-[10px] font-black text-stone-600 bg-stone-100 rounded-full px-2 py-0.5">
                          {m.deskScope.length} {t('org.access.member.desksWord')}
                        </span>
                      )}
                      {expState === 'expired' && (
                        <span className="text-[10px] font-black text-red-700 bg-red-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                          <CalendarClock size={10} /> {t('org.access.member.roleExpired')}
                        </span>
                      )}
                      {(expState === 'active' || expState === 'expiringSoon') && m.roleExpiresAt != null && (
                        <span className={`text-[10px] font-black rounded-full px-2 py-0.5 flex items-center gap-1 ${
                          expState === 'expiringSoon' ? 'text-amber-800 bg-amber-100' : 'text-stone-600 bg-stone-100'
                        }`}>
                          <CalendarClock size={10} />
                          {t('org.access.member.expiresOn')} {new Date(m.roleExpiresAt).toLocaleDateString(appLocale())}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => (editingId === m.id ? setEditingId(null) : beginEdit(m))}
                    className="p-2.5 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`${t('org.access.member.editAccess')} ${m.displayName || ''}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => doRemove(m)}
                    disabled={busyId === m.id}
                    className="p-2.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`Remove ${m.displayName}`}
                  >
                    {busyId === m.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
                {editingId === m.id && editAssignment && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <MemberAccessEditor
                      value={editAssignment}
                      onChange={setEditAssignment}
                      isSuperAdmin={currentRole === 'SuperAdmin'}
                    />
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => saveEdit(m)}
                        disabled={busyId === m.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black min-h-[44px] disabled:opacity-50"
                      >
                        {busyId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {t('org.access.member.saveAccess')}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-600 text-xs font-black min-h-[44px]"
                      >
                        {t('org.access.member.cancelEdit')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
                  <p className="text-[11px] text-stone-500">{new Date(r.createdAt).toLocaleString(appLocale())}</p>
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
            <MemberAccessEditor
              value={assignment}
              onChange={setAssignment}
              isSuperAdmin={currentRole === 'SuperAdmin'}
            />
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
      <ApprovalsPanel />
      {limitModalInfo && (
        <LimitReachedModal info={limitModalInfo} onClose={closeLimitModal} />
      )}
    </div>
  );
};
