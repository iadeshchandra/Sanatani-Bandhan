/**
 * AdminsTab — delegated platform admins (QUEUED #21, owner-only tab).
 * ============================================================================
 * The bus-factor-1 repair: the owner grants a second trusted human console
 * access WITHOUT sharing the owner account. Grants live in the
 * `platformAdmins/{uid}` collection and gate ONLY what this console shows
 * (see src/lib/platformAdminRoles.ts for the role matrix). Owner-only
 * powers — API keys, billing, commission, finance, database, settings,
 * system, and this tab itself — are never delegable.
 *
 * HONESTY: until the flagged firestore.rules block for `platformAdmins`
 * is deployed, owner writes/reads here are denied by the deny-by-default
 * rules and this tab shows that plainly (RULES_PENDING state) instead of
 * pretending a grant worked. Every grant/revoke that DOES land is written
 * to audit_logs by the service.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, UserPlus, RefreshCw, AlertTriangle, Crown, Trash2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { ConfirmDialog } from '../GodModeConsole2';
import {
  listPlatformAdmins,
  grantPlatformAdmin,
  revokePlatformAdmin,
  type PlatformAdminRecord,
} from '../../../lib/platformAdmins';
import {
  ROLE_DESCRIPTIONS,
  type DelegatedAdminRole,
} from '../../../lib/platformAdminRoles';

const inputCls =
  'w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 min-h-[44px] text-sm text-slate-100 focus:ring-2 focus:ring-saffron-500 outline-none';

const isRulesPending = (msg?: string) =>
  !!msg && /permission|insufficient|denied/i.test(msg);

export const AdminsTab: React.FC = () => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<PlatformAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rulesPending, setRulesPending] = useState(false);

  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<DelegatedAdminRole>('moderator');
  const [granting, setGranting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<PlatformAdminRecord | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listPlatformAdmins();
    setLoading(false);
    if (r.ok) {
      setRows(r.data || []);
      setError(null);
      setRulesPending(false);
    } else {
      setError(r.error || 'Failed to load admins.');
      setRulesPending(isRulesPending(r.error));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (granting) return;
    if (!uid.trim()) {
      showToast('Paste the Firebase UID of the person you trust (find it in the Users tab).', 'error');
      return;
    }
    setGranting(true);
    const r = await grantPlatformAdmin({ uid: uid.trim(), email: email.trim(), displayName: displayName.trim(), role });
    setGranting(false);
    if (r.ok) {
      showToast(`Delegated ${role} access granted. They sign in here with their own account.`, 'success');
      setUid(''); setEmail(''); setDisplayName('');
      void load();
    } else {
      showToast(
        isRulesPending(r.error)
          ? 'Grant denied by Firestore rules — the platformAdmins rules block is not deployed yet (see ARCHITECTURE.md, QUEUED #21).'
          : (r.error || 'Grant failed.'),
        'error',
      );
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget || revoking) return;
    setRevoking(true);
    const r = await revokePlatformAdmin(revokeTarget.uid);
    setRevoking(false);
    setRevokeTarget(null);
    if (r.ok) {
      showToast('Delegated access revoked. It ends at their next sign-in.', 'success');
      void load();
    } else {
      showToast(r.error || 'Revoke failed.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Explainer */}
      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-saffron-400" /> Delegated admins — a second pair of trusted hands
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Until now this console answered to one account alone. Grant a trusted person their own
          sign-in here: they get only the sections their role allows, under their own name, and every
          grant and revoke is written to the audit log. API keys, billing, commission, finance, the
          database explorer, platform settings, system tools and this page itself stay
          <span className="text-saffron-300 font-semibold"> owner-only, always</span> — and Firestore
          rules remain the real boundary behind every screen.
        </p>
        <ul className="text-xs text-slate-400 mt-3 space-y-1.5">
          <li><span className="text-slate-200 font-semibold">Moderator</span> — {ROLE_DESCRIPTIONS.moderator}</li>
          <li><span className="text-slate-200 font-semibold">Admin</span> — {ROLE_DESCRIPTIONS.admin}</li>
        </ul>
      </div>

      {rulesPending && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-200">Delegation rules not deployed yet</p>
            <p className="text-amber-200/70 text-xs mt-1 leading-relaxed">
              The <span className="font-mono">platformAdmins</span> block for firestore.rules is written
              and waiting in ARCHITECTURE.md (QUEUED #21). Until it is deployed, the deny-by-default
              rules refuse reads and writes here — nothing below can load or save. The owner console
              itself is unaffected.
            </p>
          </div>
        </div>
      )}

      {/* Current admins */}
      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-200">Current delegated admins</h3>
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-2 min-h-[44px] rounded-xl bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : error && !rulesPending ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : rulesPending ? (
          <p className="text-xs text-slate-500">Unavailable until the rules block is deployed.</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-slate-500">
            No delegated admins yet — the platform still has a bus factor of one. Grant the first one below.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.uid} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100 truncate">
                    {row.displayName || row.email || row.uid}
                    {!row.active && <span className="ml-2 text-[10px] font-black uppercase text-red-300 bg-red-500/15 border border-red-500/40 rounded-md px-1.5 py-0.5">revoked</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{row.email ? `${row.email} · ` : ''}{row.uid}</p>
                  {row.grantedAt && <p className="text-[11px] text-slate-600">Granted {new Date(row.grantedAt).toLocaleString()}</p>}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
                  row.role === 'admin'
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                }`}>
                  {row.role}
                </span>
                <button
                  type="button"
                  onClick={() => setRevokeTarget(row)}
                  className="px-3 py-2 min-h-[44px] rounded-xl bg-red-600/15 border border-red-500/40 text-red-300 text-xs font-bold hover:bg-red-600/25 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant form */}
      <form onSubmit={handleGrant} className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-saffron-400" /> Grant delegated access
        </h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          The person needs a normal Sanatani Bandhan account first. Paste their Firebase UID
          (Users tab → their row), pick the smallest role that fits, and grant. Re-granting the
          same UID updates their role.
        </p>
        <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Firebase UID (required)" className={inputCls} />
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (for the list, optional)" type="email" className={inputCls} />
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name (optional)" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['moderator', 'admin'] as DelegatedAdminRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-4 py-3 min-h-[44px] rounded-xl text-sm font-bold border text-left ${
                role === r
                  ? 'bg-saffron-500/15 text-saffron-200 border-saffron-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {r === 'admin' ? '🛠️ Admin' : '🛡️ Moderator'}
              <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                {r === 'admin' ? 'Operations, no money or secrets' : 'Moderation + support only'}
              </span>
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={granting}
          className="w-full py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-600 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4" /> {granting ? 'Granting…' : `Grant ${role} access`}
        </button>
      </form>

      {revokeTarget && (
        <ConfirmDialog
          title="Revoke delegated access?"
          body={`${revokeTarget.displayName || revokeTarget.email || revokeTarget.uid} will lose console access at their next sign-in. This is recorded in the audit log.`}
          confirmLabel="Revoke access"
          working={revoking}
          onConfirm={() => void handleRevoke()}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
};

export default AdminsTab;
