import React from 'react';
import { ROLE_MIGRATION_MAP } from '../types';
import type { WorkspaceConfig } from '../types';
import type { WorkspaceMembership } from '../types/membership';
import { Card, T } from './ui';

/* ProfileOrgHub — the "My Organisations" hub section of the profile.
 * =====================================================================
 * Props-driven so it renders identically in the real Profile tab and in
 * dev previews. Each card shows the org's initial, name, type/city, the
 * user's REAL role in that org (membership edge), and one honest status
 * line: live member/request counts for the ACTIVE org when the user is a
 * steward, otherwise "Member since {Mon YYYY}". Numbers are never
 * invented — anything unavailable degrades to the member-since line.
 */

export interface ProfileOrgHubProps {
  memberships: WorkspaceMembership[];
  workspaces: WorkspaceConfig[];
  activeWorkspaceId?: string;
  /** Live member count for the active org (stewards only; 0 otherwise). */
  orgMembersCount: number;
  /** Live pending-request count for the active org (stewards only). */
  pendingRequestsCount: number;
  openingOrgId: string | null;
  onOpen: (wsId: string, wsName: string) => void;
  onJoin: () => void;
}

const memberSince = (ts: number) => {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export const ProfileOrgHub: React.FC<ProfileOrgHubProps> = ({
  memberships,
  workspaces,
  activeWorkspaceId,
  orgMembersCount,
  pendingRequestsCount,
  openingOrgId,
  onOpen,
  onJoin,
}) => {
  const myOrgs = memberships
    .map((m) => ({ membership: m, ws: workspaces.find((w) => w.id === m.workspaceId) }))
    .filter((x): x is { membership: WorkspaceMembership; ws: WorkspaceConfig } => Boolean(x.ws));

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-extrabold text-stone-900">
          <T en="My organisations" bn="আমার সংগঠনসমূহ" hi="मेरे संगठन" />
        </h3>
        {myOrgs.length > 0 && (
          <span className="text-[11px] font-bold text-stone-400">{myOrgs.length}</span>
        )}
      </div>
      {myOrgs.length === 0 ? (
        <p className="text-xs text-stone-500 text-center py-2">
          <T
            en="No organisations yet — join one below, or register your own."
            bn="এখনও কোনো সংগঠন নেই — নিচে যোগ দিন, অথবা নিজেরটি নিবন্ধন করুন।"
            hi="अभी कोई संगठन नहीं — नीचे जुड़ें, या अपना पंजीकृत करें।"
          />
        </p>
      ) : (
        <ul className="space-y-2">
          {myOrgs.map(({ membership, ws }) => {
            const role = (ROLE_MIGRATION_MAP[membership.role] || membership.role || 'Member') as string;
            const isSteward = ['Trustee', 'SuperAdmin'].includes(role);
            const isActiveOrg = ws.id === activeWorkspaceId;
            // Live counts only exist for the active org (stewards) — for
            // every other org we show the honest "Member since".
            const status =
              isActiveOrg && isSteward ? (
                <T
                  en={`${orgMembersCount} members · ${pendingRequestsCount} pending requests`}
                  bn={`${orgMembersCount} সদস্য · ${pendingRequestsCount} বিচারাধীন অনুরোধ`}
                  hi={`${orgMembersCount} सदस्य · ${pendingRequestsCount} लंबित अनुरोध`}
                />
              ) : (
                <T
                  en={`Member since ${memberSince(membership.joinedAt)}`}
                  bn={`${memberSince(membership.joinedAt)} থেকে সদস্য`}
                  hi={`${memberSince(membership.joinedAt)} से सदस्य`}
                />
              );
            const busy = openingOrgId === ws.id;
            return (
              <li key={ws.id}>
                <button
                  type="button"
                  onClick={() => onOpen(ws.id, ws.name)}
                  disabled={busy}
                  className="w-full flex items-center gap-3 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 px-4 py-3 text-left transition-colors min-h-[64px] disabled:opacity-60"
                >
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-lg font-black text-amber-700 shrink-0" aria-hidden>
                    {(ws.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-stone-900 text-sm truncate">
                      {ws.name}
                      {isActiveOrg && (
                        <span className="ml-2 inline-block rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 align-middle">
                          <T en="Current" bn="বর্তমান" hi="वर्तमान" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">
                      {ws.type}
                      {ws.city ? ` · ${ws.city}` : ''} · {status}
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-black px-2.5 py-1">
                    {role}
                  </span>
                  <span aria-hidden className="text-stone-300 text-sm shrink-0">
                    {busy ? '…' : '›'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {/* "+" card — join or create */}
      <button
        type="button"
        onClick={onJoin}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50/50 px-4 py-3 text-sm font-bold text-stone-600 transition-colors min-h-[56px]"
      >
        <span aria-hidden className="text-lg leading-none">＋</span>
        <T en="Join or create an organisation" bn="সংগঠনে যোগ দিন বা তৈরি করুন" hi="संगठन से जुड़ें या बनाएँ" />
      </button>
    </Card>
  );
};
