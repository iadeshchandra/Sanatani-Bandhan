import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useToast } from '../../context/ToastContext';
import { provisionalSoloProfile } from '../../solo/soloSession';
import { NotificationBell } from '../../notifications/NotificationBell';
import { NotificationCenterUI } from '../../notifications/NotificationCenterUI';
import { useLiveNotifications } from '../../notifications/useLiveNotifications';
import {
  scopeItemsForOrg,
  unreadInScope,
  criticalUnreadInScope,
} from '../../notifications/orgScope';
import { MODULE_CATALOG } from '../common/Sidebar';
import { normalizeMembershipRole, resolveEdgeRole } from '../../lib/landingSurface';
import { T } from '../../solo/ui';
import { OrgLogo } from '../common/OrgLogo';

/* OrgSpaceShell — the Phase 2 organisation-space chrome.
 * =====================================================================
 * Rendered ONLY for org sessions (sessionKind === 'org') by
 * AppContentRouter: <OrgSpaceShell><AppContent /></OrgSpaceShell>.
 * It adds, without touching AppContent's desk navigation:
 *
 *  - Header: back button (← Home → solo session), the org's mark +
 *    breadcrumb (the org NAME renders once, in the ERP header below —
 *    QUEUED #61 A3-1), and a role
 *    chip that reflects the user's ACTUAL role in THIS org (from the
 *    rules-enforced workspaceMembers edge via myMemberships), falling
 *    back to the global role when the edge has not loaded yet.
 *  - The membership role also drives RBAC: the shell publishes it into
 *    AuthWorkspaceContext as orgRoleOverride, so checkPermission(),
 *    the Sidebar nav filter and AppContent's devotee guard all evaluate
 *    the per-org role. A Devotee in this org never sees Trustee desks,
 *    even if they are a Trustee elsewhere.
 *  - Breadcrumb: {Org} → {current desk}; the org crumb returns to the
 *    org's Command Center (QUEUED #50 — it used to exit the org). The
 *    desk name arrives via the 'sanatani:org-desk' window event that
 *    AppContent broadcasts on every module change (labels resolved
 *    from MODULE_CATALOG).
 *  - Suchana bell (QUEUED #50): org-scoped notification center,
 *    reachable at every width from this header.
 *  - First-entry role hint: a dismissable, warm banner shown once per
 *    role per org (localStorage org_role_hint_{orgId}_{role}).
 */

const ROLE_PILL_STYLE: Record<string, string> = {
  SuperAdmin: 'bg-red-100 text-red-800 border-red-300',
  Trustee: 'bg-amber-100 text-amber-900 border-amber-300',
  Priest: 'bg-violet-100 text-violet-800 border-violet-300',
  Accountant: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Sevadar: 'bg-sky-100 text-sky-800 border-sky-300',
  Devotee: 'bg-stone-100 text-stone-700 border-stone-300',
  CSO: 'bg-rose-100 text-rose-800 border-rose-300',
};

interface Cap {
  en: string;
  bn: string;
  hi: string;
}

const ROLE_CAPABILITIES: Record<string, Cap[]> = {
  Trustee: [
    { en: 'approve expenses and join requests', bn: 'ব্যয় ও সদস্যতার অনুরোধ অনুমোদন', hi: 'व्यय व सदस्यता अनुरोध स्वीकृत' },
    { en: 'invite and manage members', bn: 'সদস্যদের আমন্ত্রণ ও পরিচালনা', hi: 'सदस्यों को आमंत्रित व प्रबंधित' },
    { en: 'review reports and audit logs', bn: 'প্রতিবেদন ও নিরীক্ষা দেখুন', hi: 'रिपोर्ट व ऑडिट लॉग देखें' },
    { en: 'configure organisation settings', bn: 'সংগঠনের সেটিংস নির্ধারণ', hi: 'संगठन सेटिंग निर्धारित' },
  ],
  Accountant: [
    { en: 'record donations and expenses', bn: 'দান ও ব্যয় লিপিবদ্ধ', hi: 'दान व व्यय दर्ज' },
    { en: 'reconcile the treasury ledger', bn: 'কোষাগার মিলিয়ে নিন', hi: 'कोषागार मिलान' },
    { en: 'issue tax receipts (80G)', bn: 'কর রসিদ (80G) প্রদান', hi: 'कर रसीद (80G) जारी' },
  ],
  Priest: [
    { en: 'manage pooja bookings', bn: 'পূজা বুকিং পরিচালনা', hi: 'पूजा बुकिंग प्रबंधन' },
    { en: 'maintain the ritual calendar', bn: 'আচার-সূচি রক্ষণাবেক্ষণ', hi: 'अनुष्ठान सूची बनाए रखें' },
    { en: 'coordinate with devotees', bn: 'ভক্তদের সাথে সমন্বয়', hi: 'भक्तों से समन्वय' },
  ],
  Sevadar: [
    { en: 'check in devotees at the gate', bn: 'দ্বারে ভক্তদের নিবন্ধন', hi: 'द्वार पर भक्त पंजीकरण' },
    { en: 'view the volunteer roster', bn: 'স্বেচ্ছাসেবী তালিকা দেখুন', hi: 'स्वयंसेवक सूची देखें' },
    { en: 'help with events and announcements', bn: 'অনুষ্ঠান ও ঘোষণায় সহায়তা', hi: 'आयोजन व घोषणाओं में सहायता' },
  ],
  Devotee: [
    { en: 'book poojas and sevas', bn: 'পূজা ও সেবা বুক করুন', hi: 'पूजा व सेवा बुक करें' },
    { en: 'make donations', bn: 'দান করুন', hi: 'दान करें' },
    { en: 'view events and announcements', bn: 'অনুষ্ঠান ও ঘোষণা দেখুন', hi: 'आयोजन व घोषणाएँ देखें' },
  ],
  CSO: [
    { en: 'monitor gate check-in and radar', bn: 'দ্বার নিবন্ধন ও রাডার পর্যবেক্ষণ', hi: 'द्वार पंजीकरण व राडार निगरानी' },
    { en: 'respond to crisis alerts', bn: 'সংকট সতর্কতায় সাড়া', hi: 'संकट अलर्ट पर कार्रवाई' },
    { en: 'scan devotee QR passes', bn: 'ভক্তদের QR পাস স্ক্যান', hi: 'भक्त QR पास स्कैन' },
  ],
  SuperAdmin: [
    { en: 'full platform oversight', bn: 'সম্পূর্ণ প্ল্যাটফর্ম তত্ত্বাবধান', hi: 'पूर्ण प्लेटफ़ॉर्म निगरानी' },
  ],
};

const hintKeyFor = (orgId: string, role: string) => `org_role_hint_${orgId}_${role}`;

const prettifyDeskId = (id: string) =>
  id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const OrgSpaceShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeWorkspace,
    currentRole,
    enterSoloSession,
    setOrgRoleOverride,
  } = useAuthWorkspace();
  const { myMemberships } = useMembership();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const orgId = activeWorkspace?.id || '';
  const orgName = activeWorkspace?.name || 'Organisation';

  // The ACTUAL role in this org — membership edge first, global fallback.
  const membership = useMemo(
    () => myMemberships.find((m) => m.workspaceId === orgId),
    [myMemberships, orgId]
  );
  const displayRole = useMemo(() => {
    // QUEUED #56 (audit A2-D1): the chip displays the RESOLVED role,
    // never the raw edge string — a legacy 'Manager' edge reads
    // "Sevadar" (its migration-map intent), 'Member'/unknown reads
    // "Devotee", matching what every gate actually grants this user.
    if (membership) return resolveEdgeRole(membership.role) as string;
    return (normalizeMembershipRole(currentRole as string) || 'Devotee') as string;
  }, [membership, currentRole]);

  // Publish the per-org role into the auth context so every RBAC check
  // (checkPermission, Sidebar nav filter, AppContent devotee guard)
  // evaluates THIS org's role. Cleared when the org session ends.
  useEffect(() => {
    setOrgRoleOverride(membership?.role || null);
  }, [orgId, membership, setOrgRoleOverride]);
  useEffect(() => {
    return () => setOrgRoleOverride(null);
  }, [setOrgRoleOverride]);

  // Current desk for the breadcrumb (broadcast by AppContent).
  const [deskId, setDeskId] = useState('dashboard');
  useEffect(() => {
    const onDesk = (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (typeof id === 'string' && id) setDeskId(id);
    };
    window.addEventListener('sanatani:org-desk', onDesk);
    return () => window.removeEventListener('sanatani:org-desk', onDesk);
  }, []);
  const deskLabel = useMemo(
    () => MODULE_CATALOG.find((m) => m.id === deskId)?.name || prettifyDeskId(deskId),
    [deskId]
  );
  // QUEUED #61 (A3-1): the breadcrumb root names the place it goes — the
  // org's Command Center — instead of repeating the org name (which the
  // ERP header directly below already renders, with type + city).
  const commandCenterLabel = useMemo(
    () => MODULE_CATALOG.find((m) => m.id === 'dashboard')?.name || 'Command Center',
    []
  );

  // F-RBAC-1: the devotee preview renders chromeless — the org-space header
  // (org name, breadcrumb, role chip) and the first-entry hint must not leak
  // around the member-facing pane.
  const isDevoteePreview = deskId === 'devoteePortal' || deskId === 'devotee-super-app';

  // First-entry role hint — once per role per org.
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (!orgId || !displayRole) return;
    let dismissed = true;
    try {
      dismissed = localStorage.getItem(hintKeyFor(orgId, displayRole)) === '1';
    } catch {
      dismissed = true;
    }
    setShowHint(!dismissed);
  }, [orgId, displayRole]);
  const dismissHint = () => {
    try {
      localStorage.setItem(hintKeyFor(orgId, displayRole), '1');
    } catch {
      /* storage unavailable — hint may reappear, harmless */
    }
    setShowHint(false);
  };

  const goHome = () => {
    // Mirrors the purohit/jyotish → solo pattern: enter the personal
    // session with a provisional profile; SoloProvider lazy-mints the real
    // SAN-XXXXXX on mount (get-or-create, never duplicates).
    setOrgRoleOverride(null);
    enterSoloSession(provisionalSoloProfile());
    showToast('Welcome to My Space 🙏', 'success');
    navigate('/app/home');
  };

  // QUEUED #50 (audit D11e): the breadcrumb root is THIS org's Command
  // Center — the old "Home" crumb exited the org entirely, so the
  // breadcrumb's first step threw the user out of the workspace they
  // were navigating. Leaving the org stays on the explicit ← Home back
  // button above; the crumb walks the desk tree instead. AppContent
  // listens for 'sanatani:navigate' and switches the desk.
  const goCommandCenter = () => {
    try {
      window.dispatchEvent(
        new CustomEvent('sanatani:navigate', { detail: { module: 'dashboard' } })
      );
    } catch {
      /* non-DOM environment — nothing to navigate */
    }
  };

  // QUEUED #50 (audit D8): the org Suchana bell — reachable at EVERY
  // width (the ERP header's bell is desktop-only, so mobile org users
  // had no bell at all). The stream is per-user; in org context it is
  // scoped to THIS org (orgScope), and the badge counts the same
  // scoped, duplicate-collapsed list the center opens — badge == list.
  const live = useLiveNotifications();
  const orgItems = useMemo(() => scopeItemsForOrg(live.items, orgId), [live.items, orgId]);
  const orgUnread = unreadInScope(orgItems);
  const orgCritical = criticalUnreadInScope(orgItems);
  const [showOrgCenter, setShowOrgCenter] = useState(false);
  const markOrgAllRead = async () => {
    for (const item of orgItems) {
      if (!item.read) await live.markRead(item.id);
    }
  };

  const pillCls = ROLE_PILL_STYLE[displayRole] || ROLE_PILL_STYLE.Devotee;
  const caps = ROLE_CAPABILITIES[displayRole] || ROLE_CAPABILITIES.Devotee;

  return (
    <div className="anim-org-enter h-screen w-full flex flex-col overflow-hidden bg-slate-50">
      {!isDevoteePreview && (
        <>
      {/* Org-space header */}
      <header className="shrink-0 bg-temple-950 text-amber-100 border-b border-amber-900/30 z-30">
        <div className="px-3 sm:px-5 py-2.5 flex items-center gap-3">
          <button
            type="button"
            onClick={goHome}
            aria-label="Back to My Space"
            title="Back to My Space"
            className="shrink-0 min-w-[44px] min-h-[44px] px-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 flex items-center justify-center gap-1 text-sm font-bold border border-white/10 transition-colors"
          >
            <span aria-hidden className="text-lg leading-none">←</span>
            <T en="Home" bn="হোম" hi="होम" />
          </button>
          <div className="min-w-0 flex-1 flex items-center gap-2">
            {/* Pillar 1 — the org's own mark (logo or monogram), never a generic icon. */}
            <OrgLogo
              name={orgName}
              logoUrl={(activeWorkspace as any)?.logoUrl}
              size={32}
              withRing={false}
            />
            {/* QUEUED #61 (A3-1 + breadcrumb truncation): ONE org name —
                the ERP header below renders it (with type + city); this
                bar keeps the mark + breadcrumb only, so the stacked
                mobile chrome sheds a line. The crumb path gets a real
                flex row: root + separator never shrink, the desk segment
                truncates (min-w-0) instead of clipping mid-word.
                QUEUED #50 (D11e) stands: root = Command Center, not exit. */}
            <nav aria-label="Breadcrumb" className="flex items-center min-w-0 text-xs font-medium">
              <button
                type="button"
                onClick={goCommandCenter}
                className="shrink-0 min-h-[44px] flex items-center font-bold text-amber-200/90 hover:text-amber-300 underline-offset-2 hover:underline"
                title={`${orgName} — Command Center`}
              >
                {commandCenterLabel}
              </button>
              {deskId !== 'dashboard' && (
                <>
                  <span aria-hidden className="mx-1 shrink-0 text-amber-400/70">›</span>
                  <span className="text-amber-400/80 truncate min-w-0">{deskLabel}</span>
                </>
              )}
            </nav>
          </div>
          {/* QUEUED #50 (D8): org Suchana bell — every width, this org only. */}
          <div className="relative shrink-0">
            <NotificationBell
              unreadCount={orgUnread}
              criticalCount={orgCritical}
              onClick={() => setShowOrgCenter(true)}
              className="text-amber-200 hover:text-white hover:bg-white/10 border border-white/10"
              label={{
                en: `🪔 Suchana — ${orgName}`,
                bn: `🪔 সূচনা — ${orgName}`,
                hi: `🪔 सूचना — ${orgName}`,
              }}
            />
          </div>
          {/* Role chip — plain role name, no "Viewing as" framing (Track 0:
              "viewing" language reads as demo/preview chrome to real users). */}
          <span
            className={`shrink-0 inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black ${pillCls}`}
            title={`Your role in ${orgName}: ${displayRole}`}
          >
            {displayRole}
          </span>
        </div>
      </header>

      {/* QUEUED #50 (D8): the org center — fixed overlay mounted outside
          the header so no transformed/hidden ancestor can trap it. */}
      {showOrgCenter && (
        <NotificationCenterUI
          items={orgItems}
          onClose={() => setShowOrgCenter(false)}
          onMarkRead={(id) => void live.markRead(id)}
          onMarkGroupRead={(group) => void live.markGroupRead(group)}
          onMarkAllRead={() => void markOrgAllRead()}
          onClearRead={() => void markOrgAllRead()}
          onAcknowledge={(id) => void live.acknowledge(id)}
        />
      )}

      {/* First-entry role hint — warm welcome, not a warning */}
      {showHint && (
        <div className="shrink-0 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-start sm:items-center gap-3">
            <span aria-hidden className="text-2xl leading-none shrink-0 mt-0.5 sm:mt-0">🙏</span>
            <p className="flex-1 text-xs sm:text-sm text-stone-700 leading-relaxed">
              <T
                en={`Welcome to ${orgName} — you are here as ${displayRole}.`}
                bn={`${orgName}-এ স্বাগতম — আপনি এখানে ${displayRole} হিসেবে আছেন।`}
                hi={`${orgName} में स्वागत है — आप यहाँ ${displayRole} के रूप में हैं।`}
              />{' '}
              <T en="You can" bn="আপনি পারবেন" hi="आप कर सकते हैं" />
              :{' '}
              {caps.map((c, i) => {
                const last = i === caps.length - 1;
                return (
                  <React.Fragment key={c.en}>
                    {i > 0 && (last && caps.length > 2 ? ', ' : last ? ' ' : ', ')}
                    {last && i > 0 && (
                      <>
                        <T en="and" bn="ও" hi="और" />{' '}
                      </>
                    )}
                    <T en={c.en} bn={c.bn} hi={c.hi} />
                  </React.Fragment>
                );
              })}
              .
            </p>
            <button
              type="button"
              onClick={dismissHint}
              className="shrink-0 min-w-[44px] min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-temple-950 text-xs font-black transition-colors"
            >
              <T en="Got it" bn="বুঝেছি" hi="समझ गया" />
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* The existing org content (AppContent) — desk navigation untouched */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
};
