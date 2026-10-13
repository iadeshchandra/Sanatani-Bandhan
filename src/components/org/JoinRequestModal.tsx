/**
 * JoinRequestModal — user → org membership request (Membership sprint).
 * ==========================================================================
 * Opened from an OrgPage's "Request to Join". Optional 300-char message.
 * Creates a PENDING joinRequests/{orgId}_{uid} doc (one pending per user
 * per org, enforced by the deterministic id + rules).
 */
import React, { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { useMembership } from '../../context/MembershipContext';
import { OrgPage } from '../../types/membership';

export const JoinRequestModal: React.FC<{ page: OrgPage; onClose: () => void }> = ({ page, onClose }) => {
  const { requestToJoin } = useMembership();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await requestToJoin(page, message);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not send the request. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Request to join ${page.name}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <UserPlus size={20} className="text-amber-600" /> Request to Join
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              {page.name} · a Trustee will review your request.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 rounded-full min-h-[44px] min-w-[44px]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
              Introduce yourself <span className="normal-case font-medium">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 300))}
              rows={3}
              maxLength={300}
              placeholder="e.g. I live nearby and would like to volunteer for Sunday seva…"
              className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none"
            />
            <p className="text-[10px] text-stone-400 text-right mt-1">{message.length}/300</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-3 rounded-xl text-sm shadow-md disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? 'Sending…' : 'Send Request'}
          </button>
          <p className="text-[11px] text-stone-400 text-center">
            You can follow the page right away; membership needs a Trustee’s approval.
          </p>
        </form>
      </div>
    </div>
  );
};
