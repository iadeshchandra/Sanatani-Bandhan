import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useMembership } from '../context/MembershipContext';
import { useToast } from '../context/ToastContext';
import { ROLE_MIGRATION_MAP } from '../types';
import type { OrgPage, OrgInvite } from '../types/membership';
import { Card, T, Btn, inputCls } from './ui';

/* JoinOrgScreen — find & join an organisation. Route: /app/orgs/join
 * (inside the solo shell, Orgs tab highlighted).
 * =====================================================================
 * Invitations first (Accept / Decline), then the org directory with a
 * search box. Each org card resolves to exactly one honest state:
 *   already a member   → "Open"
 *   request PENDING     → "Pending" (disabled — never re-send)
 *   invite PENDING      → "Accept"
 *   otherwise           → "Request to join" (uses requestToJoin)
 * Tapping a card expands the org details (about, type, city, verified).
 * Counts shown are the directory's denormalized numbers, never invented.
 */

const memberSince = (ts: number) => {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export const JoinOrgScreen: React.FC = () => {
  const { switchWorkspace, exitSoloSession } = useAuthWorkspace();
  const {
    browseOrgPages,
    myMemberships,
    myJoinRequests,
    myInvites,
    respondToInvite,
    requestToJoin,
  } = useMembership();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [pages, setPages] = useState<OrgPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        setPages(await browseOrgPages(q ? { q } : undefined));
      } catch {
        setPages([]);
      } finally {
        setLoading(false);
      }
    },
    [browseOrgPages]
  );

  useEffect(() => {
    load('');
  }, [load]);

  const onSearch = (v: string) => {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(v.trim()), 350);
  };

  const openOrg = async (wsId: string, wsName: string) => {
    setBusyId(wsId);
    try {
      const ok = await switchWorkspace(wsId);
      if (ok) {
        exitSoloSession();
        showToast(`🙏 ${wsName}`, 'success');
      } else {
        showToast('Could not open this organisation right now.', 'error');
      }
    } finally {
      setBusyId(null);
    }
  };

  const acceptInvite = async (invite: OrgInvite) => {
    setBusyId(invite.id);
    try {
      await respondToInvite(invite, true);
      // respondToInvite already minted the membership + joined the
      // workspace switcher — now leave the solo session so the org
      // space takes over.
      exitSoloSession();
    } catch (e: any) {
      showToast(e?.message || 'Could not accept the invitation.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const declineInvite = async (invite: OrgInvite) => {
    setBusyId(invite.id);
    try {
      await respondToInvite(invite, false);
    } catch (e: any) {
      showToast(e?.message || 'Could not decline the invitation.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const sendRequest = async (page: OrgPage) => {
    setBusyId(page.orgId);
    try {
      await requestToJoin(page);
    } catch (e: any) {
      showToast(e?.message || 'Could not send the request.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const membershipFor = (orgId: string) => myMemberships.find((m) => m.workspaceId === orgId);
  const pendingRequestFor = (orgId: string) =>
    myJoinRequests.find((r) => r.orgId === orgId && r.status === 'PENDING');
  const inviteFor = (orgId: string) => myInvites.find((i) => i.orgId === orgId);

  const renderAction = (page: OrgPage) => {
    const busy = busyId === page.orgId;
    const membership = membershipFor(page.orgId);
    if (membership) {
      const role = ROLE_MIGRATION_MAP[membership.role] || membership.role || 'Member';
      return (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-stone-500">
            {role} <T en={`· since ${memberSince(membership.joinedAt)}`} bn={`· ${memberSince(membership.joinedAt)} থেকে`} hi={`· ${memberSince(membership.joinedAt)} से`} />
          </span>
          <Btn onClick={() => openOrg(page.orgId, page.name)} disabled={busy}>
            {busy ? '…' : <T en="Open" bn="খুলুন" hi="खोलें" />}
          </Btn>
        </div>
      );
    }
    const pending = pendingRequestFor(page.orgId);
    if (pending) {
      return (
        <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 text-stone-500 text-xs font-bold px-4 py-2 min-h-[44px]">
          <T en="Request pending" bn="অনুরোধ বিচারাধীন" hi="अनुरोध लंबित" />
        </span>
      );
    }
    const invite = inviteFor(page.orgId);
    if (invite) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-emerald-700">
            <T en={`Invited as ${invite.role}`} bn={`${invite.role} হিসেবে আমন্ত্রিত`} hi={`${invite.role} हेतु आमंत्रित`} />
          </span>
          <Btn onClick={() => acceptInvite(invite)} disabled={busy}>
            {busy ? '…' : <T en="Accept" bn="গ্রহণ" hi="स्वीकार" />}
          </Btn>
        </div>
      );
    }
    return (
      <Btn variant="ghost" onClick={() => sendRequest(page)} disabled={busy}>
        {busy ? '…' : <T en="Request to join" bn="যোগদানের অনুরোধ" hi="जुड़ने का अनुरोध" />}
      </Btn>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
      <div>
        <h1 className="text-xl font-black text-stone-900">
          🔍 <T en="Find an organisation" bn="সংগঠন খুঁজুন" hi="संगठन खोजें" />
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          <T
            en="Search the directory, request membership, or accept an invitation."
            bn="নির্দেশিকা থেকে খুঁজুন, সদস্যতার অনুরোধ পাঠান বা আমন্ত্রণ গ্রহণ করুন।"
            hi="निर्देशिका में खोजें, सदस्यता अनुरोध भेजें या आमंत्रण स्वीकार करें।"
          />
        </p>
      </div>

      {/* Invitations */}
      {myInvites.length > 0 && (
        <Card className="!border-emerald-200 !bg-emerald-50/60">
          <h2 className="font-extrabold text-stone-900 text-sm mb-3">
            ✉️ <T en="Your invitations" bn="আপনার আমন্ত্রণ" hi="आपके आमंत्रण" /> ({myInvites.length})
          </h2>
          <ul className="space-y-2">
            {myInvites.map((inv) => {
              const busy = busyId === inv.id;
              return (
                <li
                  key={inv.id}
                  className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl shrink-0" aria-hidden>
                    🏛️
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-stone-900 text-sm truncate">{inv.orgName}</div>
                    <div className="text-[11px] text-stone-500 truncate">
                      <T en="Invited as" bn="আমন্ত্রিত" hi="आमंत्रित" /> {inv.role}
                      {inv.invitedByName ? ` · ${inv.invitedByName}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Btn variant="ghost" onClick={() => declineInvite(inv)} disabled={busy}>
                      <T en="Decline" bn="প্রত্যাখ্যান" hi="अस्वीकार" />
                    </Btn>
                    <Btn onClick={() => acceptInvite(inv)} disabled={busy}>
                      {busy ? '…' : <T en="Accept" bn="গ্রহণ" hi="स्वीकार" />}
                    </Btn>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Search */}
      <div>
        <input
          className={inputCls}
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name, city…"
          aria-label="Search organisations"
        />
      </div>

      {/* Directory results */}
      {loading ? (
        <Card>
          <p className="text-sm text-stone-500 text-center py-6">
            <T en="Searching…" bn="খোঁজা হচ্ছে…" hi="खोज जारी…" />
          </p>
        </Card>
      ) : pages.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-500 text-center py-6">
            <T
              en="No organisations found. Try a different search."
              bn="কোনো সংগঠন পাওয়া যায়নি। অন্য কিছু লিখে দেখুন।"
              hi="कोई संगठन नहीं मिला। कुछ और खोजें।"
            />
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {pages.map((page) => {
            const expanded = expandedId === page.orgId;
            return (
              <li key={page.orgId} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : page.orgId)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    aria-expanded={expanded}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-lg font-black text-amber-700 shrink-0" aria-hidden>
                      {(page.name || '?').trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-stone-900 text-sm truncate">
                        {page.name}
                        {page.verified && (
                          <span className="ml-2 inline-block rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 align-middle">
                            ✓ <T en="Verified" bn="যাচাইকৃত" hi="सत्यापित" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 truncate">
                        {page.type}
                        {page.city ? ` · ${page.city}` : ''}
                        {typeof page.memberCount === 'number' && page.memberCount > 0 && (
                          <>
                            {' · '}
                            {page.memberCount}{' '}
                            <T en="members" bn="সদস্য" hi="सदस्य" />
                          </>
                        )}
                      </div>
                    </div>
                    <span aria-hidden className="text-stone-400 text-xs shrink-0 ml-1">
                      {expanded ? '▾' : '▸'}
                    </span>
                  </button>
                  <div className="shrink-0">{renderAction(page)}</div>
                </div>
                {expanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-stone-100">
                    {page.about ? (
                      <p className="text-xs text-stone-600 leading-relaxed mt-2">{page.about}</p>
                    ) : (
                      <p className="text-xs text-stone-400 mt-2 italic">
                        <T en="No description yet." bn="এখনও বিবরণ নেই।" hi="अभी विवरण नहीं।" />
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-stone-500">
                      {page.state && <span>{page.state}</span>}
                      {page.country && <span>{page.country}</span>}
                      {typeof page.followerCount === 'number' && page.followerCount > 0 && (
                        <span>
                          {page.followerCount} <T en="followers" bn="অনুসারী" hi="अनुयायी" />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Create */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <div className="font-extrabold text-stone-900 text-sm">
              <T en="Starting a new institution?" bn="নতুন প্রতিষ্ঠান শুরু করছেন?" hi="नई संस्था आरंभ कर रहे हैं?" />
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              <T
                en="Register your organisation and grow with Sanatani Bandhan."
                bn="আপনার সংগঠন নিবন্ধন করুন এবং সনাতনী বন্ধনের সাথে এগিয়ে যান।"
                hi="अपना संगठन पंजीकृत करें और सनातनी बंधन के साथ आगे बढ़ें।"
              />
            </div>
          </div>
          <Btn onClick={() => navigate('/register-org')}>
            <T en="Register an organisation" bn="সংগঠন নিবন্ধন" hi="संगठन पंजीकृत करें" />
          </Btn>
        </div>
      </Card>
    </div>
  );
};
