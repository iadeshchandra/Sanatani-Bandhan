/**
 * CoordinatorManage — Trustee UI to assign / remove Crisis Coordinators.
 * =========================================================================
 * Writes the crisisCoordinators/{orgId}_{uid} edge docs. Fail-closed:
 * only renders for Trustee/SuperAdmin access; others see a notice.
 * ≥44px targets, mobile-first.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { Search, ShieldCheck, UserMinus, UserPlus } from 'lucide-react';
import { db } from '../firebase';
import type { WorkspaceMembership } from '../types/membership';
import type { CrisisAccess, CrisisCoordinator } from './crisisCommandTypes';
import { useCrisisT } from './crisisI18n';
import { addCoordinator, removeCoordinator } from './crisisActions';
import { coordinatorDocId } from './crisisAccess';

interface Props {
  orgId: string;
  access: CrisisAccess;
  assignedBy: string;
}

export const CoordinatorManage: React.FC<Props> = ({ orgId, access, assignedBy }) => {
  const t = useCrisisT();
  const [coordinators, setCoordinators] = useState<CrisisCoordinator[]>([]);
  const [members, setMembers] = useState<WorkspaceMembership[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!orgId) return;
    const unsub = onSnapshot(
      query(collection(db, 'crisisCoordinators'), where('orgId', '==', orgId)),
      (snap) => {
        const list: CrisisCoordinator[] = [];
        snap.forEach((d) => list.push(d.data() as CrisisCoordinator));
        setCoordinators(list);
      },
      () => setCoordinators([]),
    );
    getDocs(
      query(collection(db, 'workspaceMembers'), where('workspaceId', '==', orgId), limit(300)),
    )
      .then((snap) => {
        const list: WorkspaceMembership[] = [];
        snap.forEach((d) => list.push(d.data() as WorkspaceMembership));
        setMembers(list);
      })
      .catch(() => setMembers([]));
    return () => unsub();
  }, [orgId]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const coordUids = useMemo(() => new Set(coordinators.map((c) => c.uid)), [coordinators]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => !coordUids.has(m.uid))
      .filter((m) => !q || (m.displayName || '').toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q))
      .slice(0, 50);
  }, [members, coordUids, search]);

  if (!access.canManageCoordinators) {
    return (
      <div className="py-12 px-6 text-center">
        <ShieldCheck size={40} className="mx-auto mb-3 text-stone-300" />
        <p className="text-[16px] text-stone-600">{t('coord.trusteeOnly')}</p>
      </div>
    );
  }

  const doAdd = async (m: WorkspaceMembership) => {
    setBusy(m.uid);
    try {
      await addCoordinator(orgId, m.uid, m.displayName || m.uid, assignedBy);
      flash(t('coord.added'));
    } catch {
      flash(t('act.noPermission'));
    } finally {
      setBusy(null);
    }
  };

  const doRemove = async (c: CrisisCoordinator) => {
    setBusy(c.uid);
    try {
      await removeCoordinator(orgId, c.uid);
      flash(t('coord.removed'));
    } catch {
      flash(t('act.noPermission'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-[14px] text-stone-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-2xl p-3">
        {t('coord.desc')}
      </p>

      {/* current coordinators */}
      <section>
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-stone-400 mb-2">
          {t('coord.current')} ({coordinators.length})
        </h3>
        {coordinators.length === 0 ? (
          <p className="text-[14px] text-stone-500 bg-stone-50 rounded-2xl p-4">{t('coord.none')}</p>
        ) : (
          <ul className="space-y-2">
            {coordinators.map((c) => (
              <li key={coordinatorDocId(c.orgId, c.uid)} className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3">
                <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-lg shrink-0">
                  {(c.name || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-stone-900 truncate">{c.name}</p>
                  <p className="text-[12px] text-stone-500">
                    {t('coord.assignedBy')}: {c.assignedBy}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => doRemove(c)}
                  disabled={busy === c.uid}
                  className="min-h-[48px] min-w-[48px] px-3 rounded-2xl bg-red-50 text-red-700 font-semibold text-[14px] flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <UserMinus size={17} /> {t('coord.remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* member picker */}
      <section>
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-stone-400 mb-2">
          {t('coord.members')}
        </h3>
        <div className="relative mb-2">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('coord.search')}
            className="w-full min-h-[52px] rounded-2xl border border-stone-200 pl-11 pr-4 text-[16px] bg-white"
          />
        </div>
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {filteredMembers.map((m) => (
            <li key={m.uid} className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3">
              <div className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-lg shrink-0">
                {(m.displayName || '?').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px] text-stone-900 truncate">{m.displayName || m.uid}</p>
                <p className="text-[12px] text-stone-500">{m.role}</p>
              </div>
              <button
                type="button"
                onClick={() => doAdd(m)}
                disabled={busy === m.uid}
                className="min-h-[48px] min-w-[48px] px-3 rounded-2xl bg-amber-700 text-amber-50 font-semibold text-[14px] flex items-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-[0_4px_14px_rgba(180,83,9,0.3)]"
              >
                <UserPlus size={17} /> {t('coord.add')}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {toast ? (
        <div className="sticky bottom-2 bg-stone-900 text-white text-[14px] rounded-2xl px-4 py-3 text-center shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
};
