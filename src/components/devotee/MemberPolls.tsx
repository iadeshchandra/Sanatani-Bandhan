/**
 * MemberPolls.tsx — POLLS NEXT-LEVEL P2a: the member's Polls home.
 * =====================================================================
 * The desk (CommunityPollsTab) is the committee's door into the one
 * ballot box; this is the MEMBER's door, in Personal mode. Placement
 * (chosen against the shell's structure): a slim entry band at the
 * top of the Personal Home (above the social feed — the first thing
 * a member sees), opening a full-screen Polls sheet. No new tab:
 * the shell's navigation is untouched, and the polls are two taps
 * from Home at most (Home → band → tap an option to vote).
 *
 * The data is shaped by lib/memberPolls.assembleMemberPolls from
 * the member's workspaceMembers edges (plus the active workspace —
 * the member's own temple, whose register holds them even when no
 * staff edge exists), and every vote casts through the SHARED
 * ballot write path (lib/pollVoting) — byte-identical writes to
 * the desk's. All display judgements (audience, result visibility,
 * class/binding labels before voting, the recorded outcome) come
 * from lib/pollLogic, exactly as the desk renders them.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { friendlyError } from '../../lib/friendlyError';
import {
  ABSTAIN_OPTION_ID, pollAbstainVotes, pollClass, pollCountedKind, pollIsBinding, pollIsOpen,
  pollKind, pollResultsVisible, pollResultVisibility, pollStoredOutcome,
  pollTotalVotes, validateAllocations, validateMultiChoice, validateRanking, validateTextResponse,
  type MyBallot,
} from '../../lib/pollLogic';
import { castAbstainVote, castChoiceBallot, castMultiBallot, castPointsBallot, castRankedBallot, castTextBallot } from '../../lib/pollVoting';
import { countPollOutcome } from '../../lib/pollCounting';
import {
  assembleMemberPolls, memberPollsAwaitingCount,
  type MemberPollDoc, type MemberPollEntry,
} from '../../lib/memberPolls';
import {
  BarChart3, CheckCircle2, ChevronRight, Clock, Lock, MessageSquare,
  ShieldCheck, Users, X, Award,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Data hook                                                           */
/* ------------------------------------------------------------------ */

function useMemberPolls() {
  const { firebaseUser, currentUser, currentRole, activeWorkspace, workspaces } = useAuthWorkspace();
  const { myMemberships } = useMembership();
  const uid = firebaseUser?.uid || null;

  const memberships = useMemo(() => {
    const list = (myMemberships || []).map((m) => ({
      workspaceId: m.workspaceId,
      role: m.role as string | null | undefined,
    }));
    // The active workspace is the member's own temple: its devotee
    // register holds them even when no workspaceMembers edge exists
    // (a plain devotee holds no staff edge). The rules decide read
    // access; a workspace they cannot read simply returns no polls.
    if (activeWorkspace?.id && !list.some((m) => m.workspaceId === activeWorkspace.id)) {
      list.push({ workspaceId: activeWorkspace.id, role: (currentRole as string) || 'Devotee' });
    }
    return list;
  }, [myMemberships, activeWorkspace?.id, currentRole]);

  const workspaceNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ws of workspaces || []) if (ws?.id) map[ws.id] = ws.name || '';
    if (activeWorkspace?.id && !map[activeWorkspace.id]) map[activeWorkspace.id] = activeWorkspace.name || '';
    return map;
  }, [workspaces, activeWorkspace?.id, activeWorkspace?.name]);

  const [pollsByWorkspace, setPollsByWorkspace] = useState<Record<string, MemberPollDoc[]>>({});
  const [ballotDocs, setBallotDocs] = useState<Record<string, MyBallot | null>>({});

  // Polls of every workspace I belong to (one listener per workspace).
  // P2b: drafts are committee-only at the rules layer — the status
  // filter keeps them out of this read entirely (an unfiltered
  // query returning one would fail the whole listener).
  useEffect(() => {
    const unsubs = memberships.map((m) =>
      onSnapshot(
        query(
          collection(db, 'polls'),
          where('workspaceId', '==', m.workspaceId),
          where('status', 'in', ['ACTIVE', 'CONCLUDED'])
        ),
        (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as MemberPollDoc);
          arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setPollsByWorkspace((prev) => ({ ...prev, [m.workspaceId]: arr }));
        },
        () => { /* unreadable workspace — it simply contributes no polls */ }
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [memberships]);

  const allPolls = useMemo(
    () => Object.values(pollsByWorkspace).flat(),
    [pollsByWorkspace]
  );

  // My own ballot per poll (one tiny listener per poll, as the desk).
  useEffect(() => {
    if (!uid || allPolls.length === 0) return;
    const unsubs = allPolls.map((p) =>
      onSnapshot(doc(db, 'polls', p.id, 'votes', uid), (snap) => {
        const data = snap.exists() ? (snap.data() as any) : null;
        setBallotDocs((prev) => ({
          ...prev,
          [p.id]: data
            ? {
                ...(data.optionId ? { optionId: data.optionId } : {}),
                ...(Array.isArray(data.optionIds) ? { optionIds: data.optionIds } : {}),
                ...(typeof data.text === 'string' ? { text: data.text } : {}),
                ...(data.abstain === true ? { abstain: true } : {}),
                ...(Array.isArray(data.ranking) ? { ranking: data.ranking } : {}),
                ...(Array.isArray(data.allocations) ? { allocations: data.allocations } : {}),
              }
            : null,
        }));
      }, () => { /* ballot unreadable — counts still show */ })
    );
    return () => unsubs.forEach((u) => u());
  }, [allPolls, uid]);

  // My ballot under any model: the ballot box first, the legacy
  // frozen votedUsers map second (the desk's myBallotFor, mirrored).
  const myBallots = useMemo(() => {
    const map: Record<string, MyBallot | null> = {};
    for (const p of allPolls) {
      if (ballotDocs[p.id]) { map[p.id] = ballotDocs[p.id]; continue; }
      const legacy = p.votedUsers && currentUser?.id ? p.votedUsers[currentUser.id] : null;
      map[p.id] = legacy ? { optionId: legacy } : null;
    }
    return map;
  }, [allPolls, ballotDocs, currentUser?.id]);

  const entries = useMemo(
    () => assembleMemberPolls({ memberships, workspaceNames, pollsByWorkspace, myBallots, now: Date.now() }),
    [memberships, workspaceNames, pollsByWorkspace, myBallots]
  );

  // Deadline truth does not wait for a manager's visit (the desk's
  // law, mirrored): any member's client may land the conclusion
  // once the deadline has passed — the rules verify the stored
  // deadline timestamp before allowing the flip.
  useEffect(() => {
    if (!uid || allPolls.length === 0) return;
    const now = Date.now();
    allPolls
      .filter((p) => p.status === 'ACTIVE' && p.expiresAt && p.expiresAt < now)
      .forEach((p) => {
        updateDoc(doc(db, 'polls', p.id), { status: 'CONCLUDED' }).catch(() => { /* rules will land it for an eligible writer */ });
      });
  }, [allPolls, uid]);

  // The recorded outcome (POLLS P1): a poll the committee concluded
  // in the desk carries its outcome in that write; an auto-concluded
  // poll gets its outcome stamped by the first BOARD member's client
  // that finds it concluded without one — from this door too, under
  // the same write-once rules guard as the desk's stamper.
  const stampTried = useRef<Set<string>>(new Set());
  useEffect(() => {
    entries.forEach((e) => {
      if (!e.isBoard) return;
      const p = e.poll;
      if (p.status !== 'CONCLUDED' || pollStoredOutcome(p) || stampTried.current.has(p.id)) return;
      stampTried.current.add(p.id);
      // P3: lib/pollCounting — a counted kind's outcome MUST be
      // counted from its ballot papers here (a doc-only compute
      // would stamp an all-zero outcome, write-once, forever).
      countPollOutcome(db, p)
        .then((outcome) => updateDoc(doc(db, 'polls', p.id), { outcome }))
        .catch(() => { /* already stamped, or not ours to stamp */ });
    });
  }, [entries]);

  return { entries, uid };
}

/* ------------------------------------------------------------------ */
/* One poll card — the member's voting surface                         */
/* ------------------------------------------------------------------ */

const PollVoteCard: React.FC<{ entry: MemberPollEntry; uid: string | null }> = ({ entry, uid }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { poll, workspaceName, myBallot, hasVoted, open, scheduled, isBoard } = entry;
  const [multiPick, setMultiPick] = useState<string[]>([]);
  const [textDraft, setTextDraft] = useState('');
  // P3 — in-progress counted-kind ballots on this card.
  const [rankPick, setRankPick] = useState<string[]>([]);
  const [pointsDraft, setPointsDraft] = useState<Record<string, number>>({});
  const [casting, setCasting] = useState(false);

  const kind = pollKind(poll);
  const cls = pollClass(poll);
  const totalVotes = pollTotalVotes(poll);
  const options = Object.keys(poll.options || {}).map((k) => ({ id: k, ...poll.options![k] }));
  const showResults = pollResultsVisible(poll, { hasVoted, isCommittee: isBoard }, Date.now());
  const visRule = pollResultVisibility(poll);
  const storedOutcome = poll.status === 'CONCLUDED' ? pollStoredOutcome(poll) : null;
  const abstainCount = pollAbstainVotes(poll);
  const myAbstain = myBallot?.abstain === true || myBallot?.optionId === ABSTAIN_OPTION_ID;

  let winnerIds: string[] = [];
  if (poll.status === 'CONCLUDED' && totalVotes > 0 && showResults && kind !== 'text') {
    if (storedOutcome) winnerIds = storedOutcome.winnerOptionIds;
    else if (!pollCountedKind(poll)) {
      // P2b: an abstention never "wins" the derived fallback either.
      // P3: counted kinds have no derived fallback — only the
      // recorded count names their winner.
      const candidates = options.filter((o) => o.id !== ABSTAIN_OPTION_ID);
      if (candidates.length > 0) winnerIds = [candidates.reduce((max, o) => (o.votes > max.votes ? o : max), candidates[0]).id];
    }
  }
  // P3 — the points draft's running total on this card.
  const pointsPlaced = Object.values(pointsDraft).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  const pointsRemaining = 100 - pointsPlaced;

  const fail = (e: any) => showToast(friendlyError(e, t, 'save'), 'error');

  // The desk's guards, mirrored: signed in, poll still open at the
  // moment of the tap, and no ballot of mine yet — then the shared
  // write path casts (its anchored batch refuses a second ballot
  // from any device regardless).
  const guardCast = (): boolean => {
    if (!uid) { showToast(t('surfaces.events.memberPollsSignIn'), 'error'); return false; }
    if (!pollIsOpen(poll, Date.now())) { showToast(t('surfaces.events.memberPollsClosed'), 'error'); return false; }
    if (hasVoted) { showToast(t('surfaces.events.memberPollsVoted'), 'error'); return false; }
    return true;
  };

  const castChoice = async (optionId: string) => {
    if (casting || !guardCast()) return;
    setCasting(true);
    try {
      await castChoiceBallot(db, poll.id, uid as string, optionId);
      showToast(t('surfaces.events.memberPollsVoted'), 'success');
    } catch (e) { fail(e); } finally { setCasting(false); }
  };

  const castMulti = async () => {
    if (casting || !guardCast()) return;
    const problem = validateMultiChoice(poll, multiPick);
    if (problem) {
      showToast(
        problem === 'abstain-exclusive'
          ? t('surfaces.events.memberPollsAbstainExclusive')
          : t('surfaces.events.multiHint'),
        'error'
      );
      return;
    }
    setCasting(true);
    try {
      await castMultiBallot(db, poll.id, uid as string, multiPick);
      showToast(t('surfaces.events.memberPollsVoted'), 'success');
    } catch (e) { fail(e); } finally { setCasting(false); }
  };

  const castText = async () => {
    if (casting || !guardCast()) return;
    const text = textDraft.trim();
    const problem = validateTextResponse(text);
    if (problem) { showToast(t('surfaces.events.textPlaceholder'), 'error'); return; }
    setCasting(true);
    try {
      await castTextBallot(db, poll.id, uid as string, text);
      showToast(t('surfaces.events.memberPollsVoted'), 'success');
    } catch (e) { fail(e); } finally { setCasting(false); }
  };

  // P2b: the abstention — through the SAME shared write path the
  // desk uses (castAbstainVote), so the member's abstention is
  // byte-identical to a desk abstention on either poll generation.
  const castAbstain = async () => {
    if (casting || !guardCast()) return;
    setCasting(true);
    try {
      await castAbstainVote(db, poll.id, uid as string, poll);
      showToast(t('surfaces.events.memberPollsAbstained'), 'success');
    } catch (e) { fail(e); } finally { setCasting(false); }
  };

  const togglePick = (optionId: string) => {
    setMultiPick((cur) => {
      if (optionId === ABSTAIN_OPTION_ID) return cur.includes(optionId) ? [] : [optionId];
      const withoutAbstain = cur.filter((id) => id !== ABSTAIN_OPTION_ID);
      const next = withoutAbstain.includes(optionId)
        ? withoutAbstain.filter((id) => id !== optionId)
        : [...withoutAbstain, optionId];
      return next.slice(0, 5);
    });
  };

  // P3 — tap-to-order for the ranked ballot (the desk's gesture).
  const toggleRank = (optionId: string) => {
    setRankPick((cur) => (cur.includes(optionId) ? cur.filter((id) => id !== optionId) : [...cur, optionId]));
  };

  // P3 — the ranked ballot, through the shared write path: the
  // same bytes the desk would write for the same ranking.
  const castRanked = async () => {
    if (casting || !guardCast()) return;
    const problem = validateRanking(poll, rankPick);
    if (problem) { showToast(t('surfaces.events.rankNeedOne'), 'error'); return; }
    setCasting(true);
    try {
      await castRankedBallot(db, poll.id, uid as string, rankPick);
      showToast(t('surfaces.events.memberPollsVoted'), 'success');
    } catch (e) { fail(e); } finally { setCasting(false); }
  };

  // P3 — the points ballot: exactly 100 placed, validated here
  // and proven again by the rules; the shared write path casts.
  const castPoints = async () => {
    if (casting || !guardCast()) return;
    const allocations = Object.entries(pointsDraft)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([optionId, points]) => ({ optionId, points }));
    const problem = validateAllocations(poll, allocations);
    if (problem) { showToast(t('surfaces.events.pointsNeed100'), 'error'); return; }
    setCasting(true);
    try {
      await castPointsBallot(db, poll.id, uid as string, allocations);
      showToast(t('surfaces.events.memberPollsVoted'), 'success');
    } catch (e) { fail(e); } finally { setCasting(false); }
  };

  const closesLine = poll.expiresAt
    ? new Date(poll.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  return (
    <div className={`bg-white rounded-3xl p-5 shadow-sm border ${open ? 'border-saffron-200' : 'border-temple-200 opacity-95'}`}>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border bg-temple-50 text-temple-600 border-temple-200 flex items-center gap-1.5">
          {poll.targetAudience === 'MANAGERS' ? <ShieldCheck size={12} /> : <Users size={12} />}
          {poll.targetAudience === 'MANAGERS' ? t('surfaces.events.memberPollsBoardOnly') : t('surfaces.events.memberPollsPublic')}
        </span>
        {scheduled ? (
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1.5">
            <Clock size={12} /> {t('surfaces.events.memberPollsScheduled').replace('{date}', poll.opensAt ? new Date(poll.opensAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '')}
          </span>
        ) : open ? (
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border bg-saffron-50 text-saffron-700 border-saffron-200 flex items-center gap-1.5">
            <Clock size={12} /> {closesLine ? t('surfaces.events.memberPollsCloses').replace('{date}', closesLine) : t('surfaces.events.memberPollsOpen')}
          </span>
        ) : (
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border bg-temple-800 text-white border-temple-900 flex items-center gap-1.5">
            <Lock size={12} /> {t('surfaces.events.memberPollsClosed')}
          </span>
        )}
        {/* The class + standing + secrecy, labelled BEFORE voting (P1 law). */}
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${cls === 'decision' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-temple-50 text-temple-500 border-temple-200'}`}>
          {cls === 'decision' ? t('surfaces.events.badgeDecision') : t('surfaces.events.badgePulse')}
        </span>
        {cls === 'decision' && (
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5">
            {pollIsBinding(poll) ? t('surfaces.events.badgeBinding') : t('surfaces.events.badgeAdvisory')}
          </span>
        )}
      </div>

      <p className="text-[10px] font-bold text-temple-400 uppercase tracking-widest mb-1">
        {workspaceName || t('surfaces.events.memberPollsOrgFallback')}
      </p>
      <h3 className="text-lg font-black text-temple-900 leading-tight mb-2">{poll.title}</h3>
      {poll.description && (
        <p className="text-xs font-bold text-temple-500 leading-relaxed bg-temple-50 p-3.5 rounded-xl border border-temple-100 mb-4">
          {poll.description}
        </p>
      )}

      <div className="space-y-2.5">
        {scheduled ? (
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-center">
            <Clock size={16} className="mx-auto text-blue-500 mb-1.5" />
            <p className="text-xs font-bold text-blue-900">
              {t('surfaces.events.memberPollsScheduled').replace('{date}', poll.opensAt ? new Date(poll.opensAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')}
            </p>
            <p className="text-[10px] font-bold text-temple-500 mt-1.5 leading-relaxed">
              {t('surfaces.events.scheduleNote')}
            </p>
          </div>
        ) : kind === 'text' ? (
          open && !hasVoted ? (
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold text-temple-500 leading-relaxed flex items-start gap-1.5">
                <MessageSquare size={13} className="shrink-0 mt-0.5 text-saffron-500" />
                {t('surfaces.events.textNote')}
              </p>
              <textarea
                rows={3}
                maxLength={280}
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                placeholder={t('surfaces.events.textPlaceholder')}
                className="w-full p-3.5 bg-temple-50 border border-temple-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none resize-none"
              />
              <button
                onClick={() => void castText()}
                disabled={!textDraft.trim() || casting}
                className="w-full bg-temple-900 hover:bg-black disabled:opacity-40 text-white font-black py-3.5 rounded-xl text-[11px] uppercase tracking-widest min-h-[44px]"
              >
                {t('surfaces.events.castVote')}
              </button>
            </div>
          ) : (
            <div className="bg-temple-50 border border-temple-100 rounded-xl p-4">
              <p className="text-sm font-black text-temple-800">
                {t('surfaces.events.memberPollsResponses').replace('{count}', String(totalVotes))}
              </p>
              {myBallot?.text && (
                <p className="text-xs font-bold text-temple-500 mt-1.5">“{myBallot.text}”</p>
              )}
            </div>
          )
        ) : open && !hasVoted ? (
          kind === 'multi' ? (
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold text-temple-500">{t('surfaces.events.multiHint')}</p>
              {options.map((opt) => {
                const picked = multiPick.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => togglePick(opt.id)}
                    aria-pressed={picked}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center min-h-[44px] ${picked ? 'border-saffron-500 bg-saffron-50/60' : 'border-temple-100 hover:border-saffron-300'}`}
                  >
                    <span className="text-sm font-black text-temple-700">{opt.text}</span>
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${picked ? 'bg-saffron-500 border-saffron-500 text-white' : 'border-temple-300'}`}>
                      {picked && <CheckCircle2 size={13} />}
                    </span>
                  </button>
                );
              })}
              {poll.allowAbstain === true && (
                <button
                  onClick={() => void castAbstain()}
                  disabled={casting}
                  className="w-full text-left p-4 rounded-xl border-2 border-dashed border-temple-200 hover:border-temple-400 transition-all flex justify-between items-center min-h-[44px] disabled:opacity-50"
                >
                  <span className="text-sm font-black text-temple-500">{t('surfaces.events.abstainOption')}</span>
                  <span className="text-[9px] font-black text-temple-400 uppercase tracking-widest">{t('surfaces.events.abstainStandAside')}</span>
                </button>
              )}
              <button
                onClick={() => void castMulti()}
                disabled={multiPick.length === 0 || casting}
                className="w-full bg-temple-900 hover:bg-black disabled:opacity-40 text-white font-black py-3.5 rounded-xl text-[11px] uppercase tracking-widest min-h-[44px]"
              >
                {t('surfaces.events.castVote')}
              </button>
            </div>
          ) : kind === 'ranked' ? (
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold text-temple-500">{t('surfaces.events.rankTapToRank')}</p>
              {options.filter((o) => o.id !== ABSTAIN_OPTION_ID).map((opt) => {
                const rank = rankPick.indexOf(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleRank(opt.id)}
                    aria-pressed={rank >= 0}
                    disabled={casting}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center min-h-[44px] disabled:opacity-50 ${rank >= 0 ? 'border-saffron-500 bg-saffron-50/60' : 'border-temple-100 hover:border-saffron-300'}`}
                  >
                    <span className="text-sm font-black text-temple-700">{opt.text}</span>
                    <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 ${rank >= 0 ? 'bg-saffron-500 border-saffron-500 text-white' : 'border-temple-300 text-temple-300'}`}>
                      {rank >= 0 ? rank + 1 : '·'}
                    </span>
                  </button>
                );
              })}
              {rankPick.length > 0 && (
                <div className="flex items-center justify-between gap-3 bg-temple-50 border border-temple-100 rounded-xl px-4 py-2">
                  <p className="text-xs font-bold text-temple-600 min-w-0">
                    <span className="font-black uppercase tracking-widest text-[10px] text-temple-400 block">{t('surfaces.events.rankYourOrder')}</span>
                    {rankPick.map((id) => options.find((o) => o.id === id)?.text || id).join(' → ')}
                  </p>
                  <button onClick={() => setRankPick([])} className="shrink-0 text-[10px] font-black uppercase tracking-widest text-saffron-600 min-h-[44px] px-2">
                    {t('surfaces.events.rankReset')}
                  </button>
                </div>
              )}
              {poll.allowAbstain === true && (
                <button
                  onClick={() => void castAbstain()}
                  disabled={casting}
                  className="w-full text-left p-4 rounded-xl border-2 border-dashed border-temple-200 hover:border-temple-400 transition-all flex justify-between items-center min-h-[44px] disabled:opacity-50"
                >
                  <span className="text-sm font-black text-temple-500">{t('surfaces.events.abstainOption')}</span>
                  <span className="text-[9px] font-black text-temple-400 uppercase tracking-widest">{t('surfaces.events.abstainStandAside')}</span>
                </button>
              )}
              <button
                onClick={() => void castRanked()}
                disabled={rankPick.length === 0 || casting}
                className="w-full bg-temple-900 hover:bg-black disabled:opacity-40 text-white font-black py-3.5 rounded-xl text-[11px] uppercase tracking-widest min-h-[44px]"
              >
                {t('surfaces.events.rankCast')}
              </button>
              <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest">{t('surfaces.events.countedByCommittee')}</p>
            </div>
          ) : kind === 'points' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between bg-temple-50 border border-temple-100 rounded-xl px-4 py-3">
                <span className="text-[10px] font-black text-temple-500 uppercase tracking-widest">{t('surfaces.events.pointsYourBudget')}</span>
                <span className={`text-xs font-black ${pointsRemaining === 0 ? 'text-green-600' : 'text-saffron-600'}`}>
                  {t('surfaces.events.pointsRemaining').replace('{n}', String(pointsRemaining))}
                </span>
              </div>
              {options.filter((o) => o.id !== ABSTAIN_OPTION_ID).map((opt) => (
                <div key={opt.id} className="w-full p-4 rounded-xl border-2 border-temple-100 flex justify-between items-center gap-3">
                  <span className="text-sm font-black text-temple-700 min-w-0">{opt.text}</span>
                  <input
                    type="number" min={0} max={100} step={1} inputMode="numeric"
                    value={pointsDraft[opt.id] ?? 0}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(100, Math.floor(Number(e.target.value) || 0)));
                      setPointsDraft((prev) => ({ ...prev, [opt.id]: v }));
                    }}
                    className="w-24 shrink-0 p-2.5 bg-white border border-temple-200 rounded-lg text-sm font-black text-right focus:border-saffron-500 outline-none"
                    aria-label={opt.text}
                  />
                </div>
              ))}
              {poll.allowAbstain === true && (
                <button
                  onClick={() => void castAbstain()}
                  disabled={casting}
                  className="w-full text-left p-4 rounded-xl border-2 border-dashed border-temple-200 hover:border-temple-400 transition-all flex justify-between items-center min-h-[44px] disabled:opacity-50"
                >
                  <span className="text-sm font-black text-temple-500">{t('surfaces.events.abstainOption')}</span>
                  <span className="text-[9px] font-black text-temple-400 uppercase tracking-widest">{t('surfaces.events.abstainStandAside')}</span>
                </button>
              )}
              <button
                onClick={() => void castPoints()}
                disabled={pointsRemaining !== 0 || casting}
                className="w-full bg-temple-900 hover:bg-black disabled:opacity-40 text-white font-black py-3.5 rounded-xl text-[11px] uppercase tracking-widest min-h-[44px]"
              >
                {t('surfaces.events.pointsCast')}
              </button>
              <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest">{t('surfaces.events.countedByCommittee')}</p>
            </div>
          ) : (
            <>
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => void castChoice(opt.id)}
                disabled={casting}
                className="w-full text-left p-4 rounded-xl border-2 border-temple-100 hover:border-saffron-500 hover:bg-saffron-50/50 transition-all flex justify-between items-center min-h-[44px] disabled:opacity-50"
              >
                <span>
                  <span className="text-sm font-black text-temple-700">{opt.text}</span>
                  {kind === 'time' && typeof opt.slotAt === 'number' && (
                    <span className="block text-[11px] font-bold text-temple-500 mt-0.5">
                      {new Date(opt.slotAt).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </span>
                <span className="w-5 h-5 rounded-full border-2 border-temple-300"></span>
              </button>
            ))}
            {poll.allowAbstain === true && (
              <button
                onClick={() => void castAbstain()}
                disabled={casting}
                className="w-full text-left p-4 rounded-xl border-2 border-dashed border-temple-200 hover:border-temple-400 transition-all flex justify-between items-center min-h-[44px] disabled:opacity-50"
              >
                <span className="text-sm font-black text-temple-500">{t('surfaces.events.abstainOption')}</span>
                <span className="text-[9px] font-black text-temple-400 uppercase tracking-widest">{t('surfaces.events.abstainStandAside')}</span>
              </button>
            )}
            </>
          )
        ) : showResults ? (
          <>
          {pollCountedKind(poll) ? (
            /* P3 — counted kinds read their recorded outcome;
               the option counters never moved. */
            !storedOutcome ? (
              <div className="bg-temple-50 border border-temple-100 rounded-xl p-4">
                <p className="text-xs font-bold text-temple-500 leading-relaxed">
                  {poll.status === 'CONCLUDED' ? t('surfaces.events.awaitingCount') : t('surfaces.events.countedByCommittee')}
                </p>
                {myBallot?.ranking && myBallot.ranking.length > 0 && (
                  <p className="text-xs font-bold text-temple-600 mt-2">
                    {t('surfaces.events.rankYourOrder')}: {myBallot.ranking.map((id) => options.find((o) => o.id === id)?.text || id).join(' → ')}
                  </p>
                )}
                {myBallot?.allocations && myBallot.allocations.length > 0 && (
                  <p className="text-xs font-bold text-temple-600 mt-2">
                    {myBallot.allocations.map((a) => `${options.find((o) => o.id === a.optionId)?.text || a.optionId}: ${a.points}`).join(' · ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {kind === 'ranked' && (
                  <p className="text-[10px] font-black text-temple-500 uppercase tracking-widest">{t('surfaces.events.firstPreferences')}</p>
                )}
                {options.filter((o) => o.id !== ABSTAIN_OPTION_ID).map((opt) => {
                  const tally = storedOutcome.tallies[opt.id] || 0;
                  const maxTally = Math.max(1, ...options.filter((o) => o.id !== ABSTAIN_OPTION_ID).map((o) => storedOutcome.tallies[o.id] || 0));
                  const isWinner = winnerIds.includes(opt.id);
                  const isMine = kind === 'ranked'
                    ? myBallot?.ranking?.[0] === opt.id
                    : (myBallot?.allocations || []).some((a) => a.optionId === opt.id && a.points > 0);
                  return (
                    <div key={opt.id} className="relative w-full bg-temple-50 border border-temple-100 rounded-xl overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full transition-all duration-700 ${isWinner ? 'bg-green-200' : isMine ? 'bg-saffron-200' : 'bg-temple-200'}`}
                        style={{ width: `${Math.round((tally / maxTally) * 100)}%` }}
                      ></div>
                      <div className="relative z-10 p-3.5 flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-black text-temple-800">{opt.text}</span>
                          {isMine && (
                            <span className="bg-saffron-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                              {t('surfaces.events.memberPollsYourVote')}
                            </span>
                          )}
                          {isWinner && (
                            <span className="bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                              <Award size={11} /> {t('surfaces.events.memberPollsWinner')}
                            </span>
                          )}
                        </span>
                        <span className="text-sm font-black text-temple-700">{tally}</span>
                      </div>
                    </div>
                  );
                })}
                {kind === 'points' ? (
                  <>
                    <p className="text-xs font-bold text-temple-600">
                      {t('surfaces.events.pointsTotalLabel').replace('{n}', String(storedOutcome.pointsTotal ?? 0))}
                    </p>
                    <p className="text-[11px] font-bold text-temple-500 leading-relaxed">{t('surfaces.events.pointsResultNote')}</p>
                  </>
                ) : storedOutcome.rounds && storedOutcome.rounds.length > 1 ? (
                  <p className="text-[11px] font-bold text-temple-500">
                    {t('surfaces.events.countRounds')}: {storedOutcome.rounds.length}
                  </p>
                ) : null}
                <p className="text-[10px] font-bold text-temple-500 uppercase tracking-widest">{t('surfaces.events.countedFromBallots')}</p>
                {myBallot?.ranking && myBallot.ranking.length > 0 && (
                  <p className="text-xs font-bold text-temple-600">
                    {t('surfaces.events.rankYourOrder')}: {myBallot.ranking.map((id) => options.find((o) => o.id === id)?.text || id).join(' → ')}
                  </p>
                )}
                {myBallot?.allocations && myBallot.allocations.length > 0 && (
                  <p className="text-xs font-bold text-temple-600">
                    {t('surfaces.events.memberPollsYourVote')}: {myBallot.allocations.map((a) => `${options.find((o) => o.id === a.optionId)?.text || a.optionId}: ${a.points}`).join(' · ')}
                  </p>
                )}
              </div>
            )
          ) : (
          <>
          {options.map((opt) => {
            const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            const isMyChoice = kind === 'multi' ? (myBallot?.optionIds || []).includes(opt.id) : myBallot?.optionId === opt.id;
            const isWinner = winnerIds.includes(opt.id);
            return (
              <div key={opt.id} className="relative w-full bg-temple-50 border border-temple-100 rounded-xl overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-700 ${isWinner ? 'bg-green-200' : isMyChoice ? 'bg-saffron-200' : 'bg-temple-200'}`}
                  style={{ width: `${percentage}%` }}
                ></div>
                <div className="relative z-10 p-3.5 flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-black text-temple-800">{opt.text}</span>
                    {isMyChoice && (
                      <span className="bg-saffron-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                        {t('surfaces.events.memberPollsYourVote')}
                      </span>
                    )}
                    {isWinner && (
                      <span className="bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                        <Award size={11} /> {t('surfaces.events.memberPollsWinner')}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-black text-temple-700">{percentage}%</span>
                </div>
              </div>
            );
          })}
          </>
          )}
          {/* P2b: the abstention row — in the turnout, never in
              the race. Legacy polls render theirs as an option
              row above, from the map. */}
          {poll.allowAbstain === true && abstainCount > 0 && (
            <div className="w-full bg-temple-50 border border-dashed border-temple-200 rounded-xl p-3.5 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="text-sm font-black text-temple-600">{t('surfaces.events.abstainOption')}</span>
                {myAbstain && (
                  <span className="bg-saffron-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                    {t('surfaces.events.memberPollsYourVote')}
                  </span>
                )}
              </span>
              <span className="text-sm font-black text-temple-600">{totalVotes > 0 ? Math.round((abstainCount / totalVotes) * 100) : 0}%</span>
            </div>
          )}
          </>
        ) : (
          <div className="bg-temple-50 border border-temple-100 rounded-xl p-4 text-center">
            <Lock size={16} className="mx-auto text-temple-500 mb-1.5" />
            <p className="text-xs font-bold text-temple-500">
              {visRule === 'committee'
                ? t('surfaces.events.resultsHiddenCommittee')
                : visRule === 'afterClose'
                  ? t('surfaces.events.resultsHiddenClose')
                  : t('surfaces.events.resultsHiddenVote')}
            </p>
            {hasVoted && (
              <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mt-1.5 flex items-center justify-center gap-1">
                <CheckCircle2 size={12} /> {myAbstain ? t('surfaces.events.memberPollsAbstained') : t('surfaces.events.memberPollsVoted')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* The recorded verdict of a concluded Decision poll (P1):
          read from the stored outcome, never re-derived. */}
      {poll.status === 'CONCLUDED' && cls === 'decision' && storedOutcome?.verdict && showResults && (
        <div className="mt-4 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
          <Award size={18} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">
              {storedOutcome.verdict === 'carried'
                ? t('surfaces.events.outcomeCarried')
                : storedOutcome.verdict === 'quorum-not-met'
                  ? t('surfaces.events.outcomeQuorumNotMet')
                  : t('surfaces.events.outcomeNotCarried')}
            </p>
            {typeof poll.eligibleCount === 'number' && poll.eligibleCount > 0 && (
              <p className="text-xs font-bold text-amber-900 leading-relaxed">
                {t('surfaces.events.turnoutLine')
                  .replace('{voted}', String(storedOutcome.totalVotes))
                  .replace('{eligible}', String(poll.eligibleCount))}
                {storedOutcome.quorumMet !== undefined
                  ? ` · ${storedOutcome.quorumMet ? t('surfaces.events.quorumMet') : t('surfaces.events.quorumNotMet')}`
                  : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {poll.status === 'CONCLUDED' && poll.adminNote && (
        <div className="mt-4 bg-blue-50 border border-blue-100 p-4 rounded-2xl">
          <p className="text-xs font-bold text-blue-900 leading-relaxed">{poll.adminNote}</p>
        </div>
      )}

      <p className="mt-4 pt-3.5 border-t border-temple-100 text-[10px] font-black text-temple-500 uppercase tracking-widest flex items-center gap-1.5">
        <CheckCircle2 size={13} className="text-green-500" />
        {t('surfaces.events.memberPollsVotes').replace('{count}', String(totalVotes))}
        {hasVoted && (
          <span className="text-green-600 normal-case tracking-normal text-[11px]">
            · {myAbstain ? t('surfaces.events.memberPollsAbstained') : t('surfaces.events.memberPollsVoted')}
          </span>
        )}
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* The entry band + the full sheet                                     */
/* ------------------------------------------------------------------ */

export const MemberPollsSection: React.FC = () => {
  const { t } = useLanguage();
  const { entries, uid } = useMemberPolls();
  const [sheetOpen, setSheetOpen] = useState(false);

  const awaiting = memberPollsAwaitingCount(entries);
  const openCount = entries.filter((e) => e.open).length;
  const openEntries = entries.filter((e) => e.open);
  // P2b: scheduled polls get their own shelf — announced, opening
  // ahead — instead of posing as concluded.
  const scheduledEntries = entries.filter((e) => e.scheduled);
  const concludedEntries = entries.filter((e) => !e.open && !e.scheduled);

  if (entries.length === 0) return null;

  const groupByOrg = (list: MemberPollEntry[]) => {
    const groups = new Map<string, { name: string; items: MemberPollEntry[] }>();
    for (const e of list) {
      const g = groups.get(e.workspaceId) || { name: e.workspaceName, items: [] };
      g.items.push(e);
      groups.set(e.workspaceId, g);
    }
    return [...groups.entries()];
  };

  return (
    <>
      <div className="px-4 pt-3 shrink-0">
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full flex items-center gap-3 bg-white border border-saffron-200 rounded-2xl px-4 py-3 shadow-sm hover:border-saffron-400 transition-all text-left min-h-[44px]"
        >
          <span className="w-10 h-10 rounded-xl bg-saffron-50 border border-saffron-200 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-saffron-600" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-black text-temple-900 truncate">
              {t('surfaces.events.memberPollsTitle')}
            </span>
            <span className="block text-[11px] font-bold text-temple-500 truncate">
              {awaiting > 0
                ? t('surfaces.events.memberPollsAwaiting').replace('{count}', String(awaiting))
                : t('surfaces.events.memberPollsOpenCount').replace('{count}', String(openCount))}
            </span>
          </span>
          {awaiting > 0 && (
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-saffron-500 text-white shrink-0">
              {awaiting}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-temple-400 shrink-0" />
        </button>
      </div>

      {sheetOpen && createPortal(
        <div className="fixed inset-0 z-[9000] bg-temple-50 flex flex-col">
          <header className="bg-white border-b border-temple-200 px-4 py-3 flex items-center justify-between shrink-0">
            <h2 className="text-base font-black text-temple-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-saffron-500" />
              {t('surfaces.events.memberPollsTitle')}
            </h2>
            <button
              onClick={() => setSheetOpen(false)}
              aria-label={t('actions.cancel') || 'Close'}
              className="w-11 h-11 rounded-full bg-temple-50 border border-temple-200 flex items-center justify-center text-temple-600"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8 max-w-2xl w-full mx-auto">
            {entries.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-temple-300">
                <BarChart3 size={40} className="mx-auto mb-3 opacity-30 text-saffron-500" />
                <p className="text-sm font-bold text-temple-500 leading-relaxed">
                  {t('surfaces.events.memberPollsEmpty')}
                </p>
              </div>
            ) : (
              <>
                {openEntries.length > 0 && (
                  <section>
                    <h3 className="text-[11px] font-black text-temple-400 uppercase tracking-widest mb-3">
                      {t('surfaces.events.memberPollsOpen')}
                    </h3>
                    <div className="space-y-6">
                      {groupByOrg(openEntries).map(([wsId, group]) => (
                        <div key={wsId} className="space-y-3">
                          <p className="text-xs font-black text-temple-700">
                            {group.name || t('surfaces.events.memberPollsOrgFallback')}
                          </p>
                          {group.items.map((e) => <PollVoteCard key={e.poll.id} entry={e} uid={uid} />)}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {scheduledEntries.length > 0 && (
                  <section>
                    <h3 className="text-[11px] font-black text-temple-400 uppercase tracking-widest mb-3">
                      {t('surfaces.events.memberPollsScheduledSection')}
                    </h3>
                    <div className="space-y-6">
                      {groupByOrg(scheduledEntries).map(([wsId, group]) => (
                        <div key={wsId} className="space-y-3">
                          <p className="text-xs font-black text-temple-700">
                            {group.name || t('surfaces.events.memberPollsOrgFallback')}
                          </p>
                          {group.items.map((e) => <PollVoteCard key={e.poll.id} entry={e} uid={uid} />)}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {concludedEntries.length > 0 && (
                  <section>
                    <h3 className="text-[11px] font-black text-temple-400 uppercase tracking-widest mb-3">
                      {t('surfaces.events.memberPollsConcluded')}
                    </h3>
                    <div className="space-y-6">
                      {groupByOrg(concludedEntries).map(([wsId, group]) => (
                        <div key={wsId} className="space-y-3">
                          <p className="text-xs font-black text-temple-700">
                            {group.name || t('surfaces.events.memberPollsOrgFallback')}
                          </p>
                          {group.items.map((e) => <PollVoteCard key={e.poll.id} entry={e} uid={uid} />)}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
