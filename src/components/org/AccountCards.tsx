/**
 * MyInvitesCard + OrgDiscoveryCard — account-area entries (Membership sprint).
 * ==========================================================================
 * MyInvitesCard: pending orgInvites matched to me (uid/email/phone) with
 * Accept / Decline. Accept mints membership and drops the organisation into
 * my switcher immediately — no re-login.
 * OrgDiscoveryCard: "Find Organisations" entry → /orgs directory.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailOpen, Check, X, Loader2, Building2, Search, Clock } from 'lucide-react';
import { useMembership } from '../../context/MembershipContext';
import { orgTypeLabel, OrgInvite } from '../../types/membership';

export const MyInvitesCard: React.FC = () => {
  const { myInvites, respondToInvite } = useMembership();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (myInvites.length === 0) return null;

  const respond = async (inv: OrgInvite, accept: boolean) => {
    setBusyId(inv.id);
    setError('');
    try {
      await respondToInvite(inv, accept);
    } catch (err: any) {
      setError(err?.message || 'Could not respond. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-amber-200 p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-600" />
      <h3 className="text-sm font-black text-temple-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <MailOpen className="w-4 h-4 text-amber-600" /> Organisation Invitations
        <span className="text-[10px] bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">{myInvites.length}</span>
      </h3>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs font-bold text-center mb-3">
          {error}
        </div>
      )}
      <div className="space-y-3">
        {myInvites.map((inv) => {
          const expired = (inv.expiresAt || 0) <= Date.now();
          return (
            <div key={inv.id} className="border border-stone-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-stone-900 truncate">{inv.orgName}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {orgTypeLabel(inv.orgType)} · invited as <span className="font-black text-amber-700">{inv.role}</span> by {inv.invitedByName || 'a Trustee'}
                  </p>
                  {inv.message && <p className="text-xs text-stone-600 mt-1.5 bg-stone-50 rounded-lg p-2">“{inv.message}”</p>}
                  <p className="text-[10px] text-stone-400 mt-1.5 flex items-center gap-1">
                    <Clock size={10} /> Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {expired ? (
                <p className="text-xs font-bold text-stone-400 mt-3">This invitation has expired.</p>
              ) : (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => respond(inv, true)}
                    disabled={busyId === inv.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black min-h-[44px] disabled:opacity-50"
                  >
                    {busyId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Accept & Join
                  </button>
                  <button
                    onClick={() => respond(inv, false)}
                    disabled={busyId === inv.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-600 hover:text-red-600 hover:border-red-300 text-xs font-black min-h-[44px] disabled:opacity-50"
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const OrgDiscoveryCard: React.FC = () => {
  const navigate = useNavigate();
  const { myJoinRequests } = useMembership();
  const pending = myJoinRequests.filter((r) => r.status === 'PENDING');

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-temple-100 p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
        <Building2 className="w-40 h-40" />
      </div>
      <h3 className="text-sm font-black text-temple-900 uppercase tracking-widest mb-2 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-temple-400" /> Organisations
      </h3>
      <p className="text-sm text-temple-600 mb-4 leading-relaxed relative z-10">
        Discover mandirs, sanghas, ashrams, gurukuls and trusts. Follow their pages,
        or request membership — a Trustee approves every request.
      </p>
      {pending.length > 0 && (
        <div className="mb-3 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 relative z-10">
          {pending.length} membership request{pending.length > 1 ? 's' : ''} awaiting approval
          {pending.length === 1 ? ` — ${pending[0].orgName}` : ''}.
        </div>
      )}
      <button
        onClick={() => navigate('/orgs')}
        className="relative z-10 w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-temple-900 hover:bg-temple-800 text-white rounded-xl text-sm font-bold transition-colors min-h-[44px]"
      >
        <Search size={16} /> Find Organisations
      </button>
    </div>
  );
};
