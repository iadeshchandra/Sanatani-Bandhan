/**
 * crisis/FamilySafety.tsx — Phase 3: family safety circle.
 * =====================================================================
 * Consent-first, always:
 * - Linking requires the OTHER party's explicit grant. An invite creates
 *   zero visibility — no consent = no visibility, ever.
 * - Accepting an invite IS the mutual consent grant (recorded on both
 *   docs). Either side can revoke at any time; revocation removes the
 *   link and the consent from both docs.
 * - A member's SOS history renders read-only, in the same card format
 *   as the personal safety log (EventHistoryCard).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Heart,
  UserPlus,
  Check,
  X,
  Trash2,
  ChevronDown,
  MailOpen,
  Send,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import {
  crisisCopy,
  useCrisisT,
  normalizeLang,
} from './crisisStrings';
import { type CrisisEvent, type CrisisResponse } from './crisisCommandTypes';
import { EventHistoryCard } from './EventHistoryCard';
import {
  getFamilyLinks,
  sendFamilyInvite,
  acceptFamilyInvite,
  declineFamilyInvite,
  revokeFamilyLink,
  lookupProfileBySanIdOrPhone,
  getConsentedMemberEvents,
  type FamilyLinkRecord,
  type LinkedProfile,
} from './historyService';

interface MemberView {
  uid: string;
  name: string;
  sanId: string | null;
}

type LinkStage =
  | { kind: 'idle' }
  | { kind: 'looking' }
  | { kind: 'found'; profile: LinkedProfile }
  | { kind: 'sent' }
  | { kind: 'error'; message: string };

export const FamilySafety: React.FC = () => {
  const { currentLang } = useLanguage();
  const { firebaseUser, currentUser } = useAuthWorkspace();
  const t = useCrisisT();
  const lang = normalizeLang(currentLang);

  const uid = firebaseUser?.uid ?? (currentUser as { id?: string } | undefined)?.id ?? '';
  const myName =
    (currentUser as { name?: string; fullName?: string } | undefined)?.name ??
    (currentUser as { fullName?: string } | undefined)?.fullName ??
    firebaseUser?.displayName ??
    'Sanatani';
  const myPhoto = (firebaseUser as { photoURL?: string } | null)?.photoURL ?? null;

  const [links, setLinks] = useState<FamilyLinkRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberView[]>([]);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [memberEvents, setMemberEvents] = useState<Record<string, { event: CrisisEvent; responses: CrisisResponse[] }[]>>({});
  const [memberLoading, setMemberLoading] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [stage, setStage] = useState<LinkStage>({ kind: 'idle' });
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }
    try {
      const l = await getFamilyLinks(uid);
      setLinks(l);
      const views = await Promise.all(
        l.linkedUids.map(async (mUid): Promise<MemberView> => {
          try {
            const snap = await getDoc(doc(db, 'sanataniProfiles', mUid));
            const d = snap.exists() ? snap.data() : undefined;
            return {
              uid: mUid,
              name: String(d?.displayName ?? 'Sanatani'),
              sanId: (d?.id as string) ?? null,
            };
          } catch {
            return { uid: mUid, name: 'Sanatani', sanId: null };
          }
        }),
      );
      setMembers(views);
    } catch {
      setLinks(null);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const incoming = useMemo(
    () =>
      links
        ? Object.values(links.incomingInvites).filter((i) => i.status === 'pending')
        : [],
    [links],
  );
  const outgoingPending = useMemo(
    () =>
      links
        ? Object.values(links.outgoingInvites).filter((i) => i.status === 'pending')
        : [],
    [links],
  );

  /* ---------------- link flow ---------------- */

  const handleLookup = async () => {
    const input = linkInput.trim();
    if (!input) return;
    setStage({ kind: 'looking' });
    try {
      const profile = await lookupProfileBySanIdOrPhone(input);
      if (!profile) {
        setStage({ kind: 'error', message: t(crisisCopy.inviteNotFound) });
        return;
      }
      if (profile.uid === uid) {
        setStage({ kind: 'error', message: t(crisisCopy.inviteYourself) });
        return;
      }
      if (links?.linkedUids.includes(profile.uid)) {
        setStage({ kind: 'error', message: t(crisisCopy.alreadyLinked) });
        return;
      }
      setStage({ kind: 'found', profile });
    } catch {
      setStage({ kind: 'error', message: t(crisisCopy.inviteNotFound) });
    }
  };

  const handleSendInvite = async (profile: LinkedProfile) => {
    setBusy('send');
    try {
      await sendFamilyInvite(
        { uid, name: myName, photo: myPhoto, sanId: null },
        profile.uid,
      );
      setStage({ kind: 'sent' });
      setLinkInput('');
      await refresh();
    } catch {
      setStage({ kind: 'error', message: t(crisisCopy.inviteNotFound) });
    } finally {
      setBusy(null);
    }
  };

  const handleAccept = async (fromUid: string) => {
    setBusy(`accept-${fromUid}`);
    try {
      await acceptFamilyInvite(uid, fromUid);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const handleDecline = async (fromUid: string) => {
    setBusy(`decline-${fromUid}`);
    try {
      await declineFamilyInvite(uid, fromUid);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (otherUid: string) => {
    setBusy(`remove-${otherUid}`);
    try {
      await revokeFamilyLink(uid, otherUid);
      setConfirmRemove(null);
      setExpandedUid((e) => (e === otherUid ? null : e));
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const toggleMemberHistory = async (mUid: string) => {
    if (expandedUid === mUid) {
      setExpandedUid(null);
      return;
    }
    setExpandedUid(mUid);
    if (memberEvents[mUid]) return; // cached
    setMemberLoading(mUid);
    try {
      const evts = await getConsentedMemberEvents(uid, mUid);
      setMemberEvents((m) => ({ ...m, [mUid]: evts }));
    } catch {
      setMemberEvents((m) => ({ ...m, [mUid]: [] }));
    } finally {
      setMemberLoading(null);
    }
  };

  if (!uid) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="rounded-2xl bg-stone-50 p-6 text-center text-sm text-stone-600">
          {t(crisisCopy.notSignedIn)}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-900">
          <Heart className="h-5 w-5 text-rose-700" />
          {t(crisisCopy.familyTitle)}
        </h1>
        <p className="mt-1 text-sm text-stone-500">{t(crisisCopy.familySubtitle)}</p>
      </header>

      {/* Elder-care nudge — warm, never pushy */}
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm leading-relaxed text-amber-900">{t(crisisCopy.elderNudge)}</p>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Incoming invites — the consent moment */}
          {incoming.length > 0 && (
            <section className="mb-6" aria-label={t(crisisCopy.pendingInvites)}>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-stone-500">
                <MailOpen className="h-4 w-4" /> {t(crisisCopy.pendingInvites)}
              </h2>
              <div className="space-y-2">
                {incoming.map((inv) => (
                  <div key={inv.fromUid} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <p className="text-sm text-stone-800">
                      <span className="font-semibold">{inv.fromName}</span>{' '}
                      {t(crisisCopy.inviteFrom)}
                      {inv.fromSanId && <span className="text-stone-500"> · {inv.fromSanId}</span>}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">{t(crisisCopy.inviteExplain)}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={busy === `accept-${inv.fromUid}`}
                        onClick={() => handleAccept(inv.fromUid)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-700 px-4 text-sm font-medium text-amber-50 disabled:opacity-60 shadow-[0_4px_14px_rgba(180,83,9,0.3)]"
                      >
                        <Check className="h-4 w-4" /> {t(crisisCopy.accept)}
                      </button>
                      <button
                        type="button"
                        disabled={busy === `decline-${inv.fromUid}`}
                        onClick={() => handleDecline(inv.fromUid)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 disabled:opacity-60"
                      >
                        <X className="h-4 w-4" /> {t(crisisCopy.decline)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Link someone new */}
          <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-stone-500">
              <UserPlus className="h-4 w-4" /> {t(crisisCopy.linkNew)}
            </h2>
            <div className="flex gap-2">
              <input
                value={linkInput}
                onChange={(e) => {
                  setLinkInput(e.target.value);
                  if (stage.kind !== 'idle') setStage({ kind: 'idle' });
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLookup(); }}
                placeholder={t(crisisCopy.linkInputHint)}
                className="min-h-[44px] flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-amber-400"
                inputMode="text"
                autoCapitalize="characters"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={stage.kind === 'looking' || !linkInput.trim()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-700 px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                <Search2Icon />
              </button>
            </div>

            {stage.kind === 'looking' && (
              <p className="mt-2 text-sm text-stone-500">…</p>
            )}
            {stage.kind === 'found' && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-stone-50 p-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{stage.profile.displayName}</p>
                  {stage.profile.sanId && <p className="text-xs text-stone-500">{stage.profile.sanId}</p>}
                </div>
                <button
                  type="button"
                  disabled={busy === 'send'}
                  onClick={() => handleSendInvite(stage.profile)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-700 px-4 text-sm font-medium text-white disabled:opacity-60"
                >
                  <Send className="h-4 w-4" /> {t(crisisCopy.sendInvite)}
                </button>
              </div>
            )}
            {stage.kind === 'sent' && (
              <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                {t(crisisCopy.inviteSent)}
              </p>
            )}
            {stage.kind === 'error' && (
              <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{stage.message}</p>
            )}

            {outgoingPending.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {outgoingPending.map((inv) => (
                  <p key={inv.fromUid} className="text-xs text-stone-500">
                    {t(crisisCopy.outgoingPending)}: <span className="font-medium">{inv.fromName}</span>
                  </p>
                ))}
              </div>
            )}
          </section>

          {/* The circle */}
          <section aria-label={t(crisisCopy.linkedMembers)}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-stone-500">
              {t(crisisCopy.linkedMembers)}
            </h2>
            {members.length === 0 ? (
              <p className="rounded-2xl bg-stone-50 p-5 text-sm text-stone-500">
                {t(crisisCopy.noLinkedMembers)}
              </p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => {
                  const expanded = expandedUid === m.uid;
                  const evts = memberEvents[m.uid];
                  return (
                    <div key={m.uid} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                      <div className="flex items-center gap-2 p-3">
                        <button
                          type="button"
                          onClick={() => toggleMemberHistory(m.uid)}
                          className="flex min-h-[44px] flex-1 items-center justify-between gap-2 text-left"
                          aria-expanded={expanded}
                        >
                          <span>
                            <span className="block text-sm font-semibold text-stone-900">{m.name}</span>
                            {m.sanId && <span className="block text-xs text-stone-500">{m.sanId}</span>}
                          </span>
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {confirmRemove === m.uid ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(null)}
                              className="min-h-[44px] rounded-xl border border-stone-200 px-3 text-xs text-stone-600"
                            >
                              {t(crisisCopy.cancel)}
                            </button>
                            <button
                              type="button"
                              disabled={busy === `remove-${m.uid}`}
                              onClick={() => handleRemove(m.uid)}
                              className="min-h-[44px] rounded-xl bg-red-600 px-3 text-xs font-medium text-white disabled:opacity-60"
                            >
                              {t(crisisCopy.remove)}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRemove(m.uid)}
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-400 hover:bg-stone-50 hover:text-red-600"
                            title={t(crisisCopy.remove)}
                            aria-label={`${t(crisisCopy.remove)} ${m.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {confirmRemove === m.uid && (
                        <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">
                          {t(crisisCopy.removeConfirm)}
                        </p>
                      )}

                      {expanded && (
                        <div className="border-t border-stone-100 bg-stone-50/60 p-3">
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                            {t(crisisCopy.memberHistory)}
                          </h3>
                          {memberLoading === m.uid && (
                            <div className="h-16 animate-pulse rounded-xl bg-stone-200/60" />
                          )}
                          {memberLoading !== m.uid && evts && evts.length === 0 && (
                            <p className="rounded-xl bg-white p-4 text-sm text-stone-500">
                              {t(crisisCopy.memberNoEvents)}
                            </p>
                          )}
                          {memberLoading !== m.uid && evts && evts.length > 0 && (
                            <div className="space-y-2">
                              {evts.map(({ event, responses }) => (
                                <EventHistoryCard
                                  key={event.id}
                                  event={event}
                                  responses={responses}
                                  t={t}
                                  lang={lang}
                                  showConsentNote
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

/** Tiny inline search glyph to keep the button compact on mobile. */
const Search2Icon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export default FamilySafety;
