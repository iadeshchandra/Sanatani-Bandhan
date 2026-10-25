import React, { useEffect, useMemo, useState } from 'react';
import { MODULE_CATALOG } from '../common/Sidebar';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { effectiveDeskScope } from '../../lib/membershipAccess';
import { buildDirectoryModel } from '../../lib/deskDirectory';
import { getPinnedDesks, getRecentDesks, recordDeskVisit } from '../common/ui/deskHistory';
import { hasAnyUsage, rankByUsage, readUsage, recordUse } from '../../lib/usageStore';
import { getEssentialDesks } from '../onboarding/wizardDeskMap';
import { YourUsualRow, type UsualItem } from '../common/YourUsualRow';

/**
 * OrgUsualRow — VIBE B2: the org home's "Your usual" row.
 * =====================================================================
 * Membership of the row is decided ONLY by real, device-local signals,
 * in this order:
 *
 *   1. USAGE — tap counts in lib/usageStore (recorded at the App mount
 *      point for every desk actually opened, plus this row's own taps).
 *      Ranked by count, then recency. When any usage exists the heading
 *      is the honest "Your usual".
 *   2. COLD START — no usage yet: the row shows the workspace's own
 *      starter set — the desks pinned at setup (the wizard's essential
 *      desks, pinned by the user themselves) or, when nothing was
 *      pinned, the wizard's canonical essentials for this org type —
 *      under the plain heading "Begin here". It NEVER claims to be
 *      "your usual" before a single real open exists.
 *
 * Every candidate is filtered through buildDirectoryModel — the same
 * role/scope/plan predicate the Directory uses — so the row can never
 * promise a desk the mount guards would refuse, and plan-locked desks
 * are excluded (the Directory is their honest home). Recents and pins
 * only break ties / fill the row; they never outrank real usage.
 */

const MAX_ITEMS = 5;

export const OrgUsualRow: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  const { activeWorkspace, effectiveRole, checkPermission, firebaseUser } = useAuthWorkspace();
  const { myMemberships } = useMembership();
  const { t } = useLanguage();
  const taxonomy = useWorkspaceTaxonomy();
  const [pins, setPins] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);

  const scope = activeWorkspace?.id || null;

  useEffect(() => {
    let live = true;
    if (!scope) {
      setPins([]);
      setRecents([]);
      return;
    }
    getPinnedDesks(scope).then((v) => { if (live) setPins(v); }).catch(() => {});
    getRecentDesks(scope).then((v) => { if (live) setRecents(v); }).catch(() => {});
    return () => { live = false; };
  }, [scope]);

  const myMembership = useMemo(
    () =>
      activeWorkspace
        ? (myMemberships.find(
            (m: any) => m.workspaceId === activeWorkspace.id && m.uid === firebaseUser?.uid,
          ) as any)
        : undefined,
    [myMemberships, activeWorkspace, firebaseUser],
  );
  const myDeskScope = useMemo(
    () =>
      effectiveDeskScope(myMembership, Date.now(), {
        creatorUid: activeWorkspace?.createdBy,
      }),
    [myMembership, activeWorkspace],
  );

  const model = useMemo(
    () =>
      activeWorkspace
        ? buildDirectoryModel(
            activeWorkspace,
            { role: effectiveRole, checkPermission, deskScope: myDeskScope },
            MODULE_CATALOG,
          )
        : null,
    [activeWorkspace, effectiveRole, checkPermission, myDeskScope],
  );

  const { heading, items } = useMemo<{ heading: string; items: UsualItem[] }>(() => {
    if (!model || !activeWorkspace) return { heading: '', items: [] };
    const openable = new Map(
      model.desks
        .filter((d) => !model.lockedIds.has(d.id))
        .map((d) => [d.id, d]),
    );
    const labelFor = (id: string): string => {
      if (id === 'devotees') return taxonomy.directoryName;
      const translated = t(id);
      if (translated !== id) return translated;
      return openable.get(id)?.name || id;
    };
    const toItem = (id: string): UsualItem | null => {
      const desk = openable.get(id);
      if (!desk) return null;
      return { id, label: labelFor(id), Icon: desk.icon };
    };

    const usage = readUsage(scope);
    if (hasAnyUsage(scope)) {
      // Candidates: everything used, then recents, then pins — ranked
      // by the usage order; unused candidates keep their signal order.
      const candidates: string[] = [];
      const seen = new Set<string>();
      for (const id of [...usage.map((u) => u.id), ...recents, ...pins]) {
        if (!seen.has(id) && openable.has(id)) {
          seen.add(id);
          candidates.push(id);
        }
      }
      const ranked = rankByUsage(candidates, usage).slice(0, MAX_ITEMS);
      return {
        heading: t('vibe.yourUsual'),
        items: ranked.map(toItem).filter((x): x is UsualItem => x !== null),
      };
    }

    // Cold start: the workspace's own starter set, plainly labelled.
    const starters = (pins.length > 0
      ? pins
      : getEssentialDesks(activeWorkspace.type || 'Mandir', [], null)
    ).filter((id) => openable.has(id));
    return {
      heading: t('vibe.beginHere'),
      items: starters.slice(0, MAX_ITEMS).map(toItem).filter((x): x is UsualItem => x !== null),
    };
  }, [model, activeWorkspace, pins, recents, scope, t, taxonomy]);

  if (items.length === 0) return null;

  const open = (id: string) => {
    recordUse(id, scope);
    recordDeskVisit(id, scope).catch(() => {});
    onNavigate(id);
  };

  return <YourUsualRow heading={heading} items={items} onOpen={open} />;
};

export default OrgUsualRow;
