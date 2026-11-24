import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, Timestamp, arrayUnion, deleteField } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  pollTotalVotes, pollIsOpen, pollKind, pollResultsVisible, pollResultVisibility, pollIsEditable,
  ABSTAIN_OPTION_ID, validateMultiChoice, validateTextResponse, ballotCast,
  pollClass, pollIsBinding, pollBallotMode, pollElectorateCount, computePollOutcome, pollStoredOutcome,
  pollPhase, pollHasAbstain, pollAbstainVotes,
  POLL_DEFAULT_QUORUM_PCT, POLL_DEFAULT_PASS_PCT, POLL_MAX_OPTIONS,
  type MyBallot,
} from '../../lib/pollLogic';
import { publishBroadcast } from '../../org/broadcastService';
import { castChoiceBallot, castMultiBallot, castTextBallot, castAbstainVote } from '../../lib/pollVoting';
import {
  readPollTemplates, templateFromPoll, templateToShape, newPollTemplateId,
  nextRunWindow, pollRecurrence,
  type PollTemplate, type PollRecurrence,
} from '../../lib/pollTemplates';
import {
  pollReminderBroadcastBody, pollReminderBroadcastTitle,
} from '../../lib/memberPolls';
import { buildPollReminderMessage, whatsAppUrl } from '../../lib/outreachPacks';
import { 
  BarChart2, BarChart3, PieChart, Plus, Trash2, CheckCircle2, 
  X, Loader2, Users, ShieldCheck, Clock, AlertTriangle, 
  WifiOff, HelpCircle, Lightbulb, Lock, BrainCircuit, Heart, Flag,
  CalendarDays, Timer, BellRing, FileText, MessageSquare, Award,
  ListChecks, CalendarClock, Save, Play, Repeat
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { pushToDataLayer } from '../../utils/gtm';
import { usePlanGate } from '../../hooks/usePlanGate';
import { friendlyError } from '../../lib/friendlyError';

let generatePollReportPdf: any = null;
import('../../utils/pdfGenerator').then(mod => { generatePollReportPdf = (mod as any).generatePollReportPdf }).catch(() => {});

export const CommunityPollsTab: React.FC = () => {
  const { activeWorkspace, currentUser, currentRole, firebaseUser } = useAuthWorkspace();
  const { t } = useLanguage();
  const { devotees, noteAudit } = useData();
  const { checkGate } = usePlanGate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ACTIVE'); 
  const [showGuide, setShowGuide] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [mainPolls, setMainPolls] = useState<any[]>([]);
  // POLLS NEXT-LEVEL P2b — drafts arrive through their OWN listener:
  // they are committee-only at the rules layer, so they must never
  // ride the workspace-wide read every member's desk view makes.
  const [draftPolls, setDraftPolls] = useState<any[]>([]);
  const polls = useMemo(
    () => [...mainPolls, ...draftPolls].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [mainPolls, draftPolls]
  );
  // POLLS NEXT-LEVEL P2b — poll templates live on the workspace doc
  // (lib/pollTemplates). The raw array is kept beside the parsed
  // list so a delete can write back exactly what was stored.
  const [templates, setTemplates] = useState<PollTemplate[]>([]);
  const [templatesRaw, setTemplatesRaw] = useState<unknown[]>([]);
  // EVENTS + POLLS P0 — the ballot box: MY ballot per poll, read from
  // polls/{id}/votes/{myUid} (the only place a vote choice now lives;
  // the poll doc carries counts only). Legacy polls still show my old
  // vote from their frozen votedUsers map (see myVoteFor below).
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  // EVENTS P1 — my full ballot per poll (the choice optionId above is
  // one shape of it; multi carries optionIds, text carries my words).
  const [myBallots, setMyBallots] = useState<Record<string, MyBallot>>({});
  // EVENTS P1 — in-progress multi picks + text drafts, per poll.
  const [multiPick, setMultiPick] = useState<Record<string, string[]>>({});
  const [textDraft, setTextDraft] = useState<Record<string, string>>({});
  // Named ballots for the committee audit of a named poll — loaded
  // only while the audit view is open, and the opening is logged.
  // POLLS P1: keyed to the voter's chosen option ids (a multi ballot
  // names several) — committee (MANAGERS) polls and Decision polls
  // whose creator chose a named ballot.
  const [auditBallots, setAuditBallots] = useState<Record<string, string[]>>({});
  // EVENTS P1 — free-text responses for the committee audit of a text
  // poll (an announced suggestion box; opening is logged the same way).
  const [auditTexts, setAuditTexts] = useState<{ uid: string; text: string }[]>([]);

  // UI Modals & Actions
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConcludeModal, setShowConcludeModal] = useState(false);
  const [concludeData, setConcludeData] = useState({ id: null as string | null, title: '', note: '' });
  const [auditPoll, setAuditPoll] = useState<any>(null); 
  const [toast, setToast] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  // Create Poll Form State
  const [pollForm, setPollForm] = useState({
    title: '', description: '', targetAudience: 'ALL_MEMBERS',
    endDate: '', endTime: '', options: ['', ''],
    // POLLS NEXT-LEVEL P2b — the scheduled opening (optional): the
    // poll opens for voting when this moment passes, judged from
    // the stored clock on every read (no server cron exists).
    opensDate: '', opensTime: '',
    // EVENTS P1 — the shape + the launch-time result rule.
    kind: 'choice' as 'choice' | 'multi' | 'text',
    abstain: false,
    resultVisibility: 'afterVote' as 'live' | 'afterVote' | 'afterClose' | 'committee',
    // POLLS NEXT-LEVEL P1 — the class, and for Decision polls the
    // standing (binding), the secrecy choice, and the two marks.
    // All frozen at launch, like the shape and the result rule.
    pollClass: 'pulse' as 'pulse' | 'decision',
    binding: false,
    ballot: 'secret' as 'secret' | 'named',
    quorumPct: POLL_DEFAULT_QUORUM_PCT,
    passPct: POLL_DEFAULT_PASS_PCT,
    // POLLS NEXT-LEVEL P2b — the recurrence mark: a poll may be
    // marked recurring; the mark rides the poll (and its template)
    // so the desk can offer the one-step re-run next round.
    recurrence: 'none' as PollRecurrence
  });
  // POLLS NEXT-LEVEL P2b — set when the form was filled from a
  // template (or a re-run): the launched poll carries the
  // provenance.
  const [pendingTemplate, setPendingTemplate] = useState<{ templateId: string } | null>(null);
  // POLLS NEXT-LEVEL P2b — the save-as-template dialog (from a poll
  // card of any phase): a name + the recurrence mark.
  const [templateSavePoll, setTemplateSavePoll] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', recurrence: 'none' as PollRecurrence });

  // EVENTS P1 — edit-before-first-vote (committee; locked forever
  // once the first ballot lands — pollEditOk in firestore.rules).
  const [editPoll, setEditPoll] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', endDate: '', endTime: '',
    // P2b: the scheduled opening + the abstain choice are editable
    // under the same zero-ballot discipline. The options list holds
    // REAL options only — abstain is the toggle, never a row.
    opensDate: '', opensTime: '', abstain: false,
    options: [] as { id: string; text: string }[],
    resultVisibility: 'afterVote' as 'live' | 'afterVote' | 'afterClose' | 'committee'
  });

  const isManagerOrAdmin = ['MANAGER', 'SUPER_ADMIN', 'MANAGER'].includes(currentRole || '');
  const isOnline = navigator.onLine;

  const showToastMsg = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    pushToDataLayer('view_polls', { workspace_type: activeWorkspace?.type || 'Temple' });

    if (!activeWorkspace?.id) return;
    // P2b: the member-safe read — drafts are excluded by the status
    // filter (a non-committee reader's query must never return one;
    // the rules would fail the whole read).
    const q = query(
      collection(db, 'polls'),
      where('workspaceId', '==', activeWorkspace.id),
      where('status', 'in', ['ACTIVE', 'CONCLUDED'])
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const pollArray = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      pollArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setMainPolls(pollArray);
      setLoading(false);
    }, (error) => {
      console.warn("Firebase CommunityPollsTab sync:", error.message);
      setLoading(false);
    });
    return () => unsub();
  }, [activeWorkspace?.id]);

  // POLLS NEXT-LEVEL P2b — the committee's drafts listener. Only a
  // manager's desk subscribes; the rules deny the read to everyone
  // else, and no other surface ever asks for drafts.
  useEffect(() => {
    if (!activeWorkspace?.id || !isManagerOrAdmin) { setDraftPolls([]); return; }
    const q = query(
      collection(db, 'polls'),
      where('workspaceId', '==', activeWorkspace.id),
      where('status', '==', 'DRAFT')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const arr = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setDraftPolls(arr);
    }, () => setDraftPolls([]));
    return () => unsub();
  }, [activeWorkspace?.id, isManagerOrAdmin]);

  // POLLS NEXT-LEVEL P2b — the workspace doc carries the templates.
  useEffect(() => {
    if (!activeWorkspace?.id) { setTemplates([]); setTemplatesRaw([]); return; }
    const unsub = onSnapshot(doc(db, 'workspaces', activeWorkspace.id), (snap) => {
      const raw = snap.exists() ? (snap.data() as any)?.pollTemplates : undefined;
      setTemplates(readPollTemplates(raw));
      setTemplatesRaw(Array.isArray(raw) ? raw : []);
    }, () => { setTemplates([]); setTemplatesRaw([]); });
    return () => unsub();
  }, [activeWorkspace?.id]);

  // Deadline truth no longer waits for a manager's visit: ANY signed-in
  // member's client may land the conclusion once the deadline has
  // passed — firestore.rules verify the stored deadline timestamp
  // before allowing the flip, so this is safe to attempt for everyone.
  useEffect(() => {
    if (!firebaseUser || polls.length === 0) return;
    const now = Date.now();
    const expiredPolls = polls.filter(p => p.status === 'ACTIVE' && p.expiresAt && p.expiresAt < now);

    if (expiredPolls.length > 0) {
      expiredPolls.forEach(p => {
        updateDoc(doc(db, 'polls', p.id), { status: 'CONCLUDED' }).catch(() => { /* rules will land it for an eligible writer */ });
      });
    }
  }, [polls, firebaseUser]);

  // POLLS NEXT-LEVEL P1 — the recorded outcome. A poll concluded in
  // the committee modal carries its outcome in that write; a poll
  // that auto-concluded at its deadline gets its outcome stamped
  // here, by the first committee client that finds it concluded
  // without one (the auto-conclude path is status-only in the rules
  // — any member may flip it, so no outcome may ride it). The
  // computation is deterministic from the frozen counts, and the
  // rules make the stamp write-once: a second stamper is refused
  // and quietly ignored.
  const outcomeStampTried = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isManagerOrAdmin || polls.length === 0) return;
    polls.forEach(p => {
      if (p.status !== 'CONCLUDED' || pollStoredOutcome(p) || outcomeStampTried.current.has(p.id)) return;
      outcomeStampTried.current.add(p.id);
      const outcome = computePollOutcome(p, Date.now());
      updateDoc(doc(db, 'polls', p.id), { outcome }).catch(() => { /* already stamped, or not ours to stamp */ });
    });
  }, [polls, isManagerOrAdmin]);

  // My ballots: one tiny listener per poll on my OWN vote doc.
  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid || polls.length === 0) return;
    const unsubs = polls.map(p =>
      onSnapshot(doc(db, 'polls', p.id, 'votes', uid), (snap) => {
        const data = snap.exists() ? (snap.data() as any) : null;
        setMyVotes(prev => {
          const next = { ...prev };
          if (data?.optionId) next[p.id] = data.optionId;
          else delete next[p.id];
          return next;
        });
        setMyBallots(prev => {
          const next = { ...prev };
          if (data) {
            next[p.id] = {
              ...(data.optionId ? { optionId: data.optionId } : {}),
              ...(Array.isArray(data.optionIds) ? { optionIds: data.optionIds } : {}),
              ...(typeof data.text === 'string' ? { text: data.text } : {}),
              ...(data.abstain === true ? { abstain: true } : {}),
            };
          } else delete next[p.id];
          return next;
        });
      }, () => { /* ballot unreadable (not a member view) — counts still show */ })
    );
    return () => unsubs.forEach(u => u());
  }, [polls, firebaseUser]);

  // Committee audit ballots: subscribe only while a NAMED poll's
  // audit view is open (rules allow the committee to read these —
  // named voting is the design for committee polls, and for Decision
  // polls whose creator chose a named ballot; secret ballots are
  // never readable by anyone but the voter).
  useEffect(() => {
    if (!auditPoll || pollBallotMode(auditPoll) !== 'named' || pollKind(auditPoll) === 'text') { setAuditBallots({}); return; }
    const unsub = onSnapshot(collection(db, 'polls', auditPoll.id, 'votes'), (snap) => {
      const map: Record<string, string[]> = {};
      snap.docs.forEach(d => {
        const data = d.data() as any;
        // P2b: an abstention ballot names the reserved id, so the
        // audit groups it with the abstentions (named polls only —
        // this listener never runs for a secret ballot).
        map[d.id] = data.abstain === true
          ? [ABSTAIN_OPTION_ID]
          : Array.isArray(data.optionIds) ? data.optionIds : data.optionId ? [data.optionId] : [];
      });
      setAuditBallots(map);
    }, () => setAuditBallots({}));
    return () => unsub();
  }, [auditPoll]);

  // EVENTS P1 — free-text responses, committee audit only. The rules
  // allow the poll's own committee to read text ballots (announced
  // suggestion box); for every other poll kind this stays empty.
  useEffect(() => {
    if (!auditPoll || pollKind(auditPoll) !== 'text' || !isManagerOrAdmin) { setAuditTexts([]); return; }
    const unsub = onSnapshot(collection(db, 'polls', auditPoll.id, 'votes'), (snap) => {
      const rows: { uid: string; text: string }[] = [];
      snap.docs.forEach(d => {
        const data = d.data() as any;
        if (typeof data.text === 'string' && data.text.trim()) rows.push({ uid: d.id, text: data.text });
      });
      setAuditTexts(rows);
    }, () => setAuditTexts([]));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditPoll]);

  /** My vote on a poll: the ballot box first, the legacy map second. */
  const myVoteFor = (poll: any): string | null =>
    myVotes[poll.id] ?? (poll.votedUsers && currentUser?.id ? poll.votedUsers[currentUser.id] : null) ?? null;

  /** EVENTS P1 — my full ballot under any shape (legacy map = choice). */
  const myBallotFor = (poll: any): MyBallot | null => {
    if (myBallots[poll.id]) return myBallots[poll.id];
    const legacy = poll.votedUsers && currentUser?.id ? poll.votedUsers[currentUser.id] : null;
    return legacy ? { optionId: legacy } : null;
  };

  // POLLS NEXT-LEVEL P2b — one create path, two births: 'launch'
  // (ACTIVE at once, or scheduled when an opening time is set) and
  // 'draft' (status DRAFT — the committee's working paper: the
  // rules make it invisible to voters, no ballot can land on it,
  // and nothing announces it). A draft may even wait without a
  // deadline; the deadline is required only to open.
  const handleCreatePoll = async (e: React.FormEvent | undefined, mode: 'launch' | 'draft' = 'launch') => {
    if (e) e.preventDefault();
    if (!checkGate('events', polls.length)) return;

    const isText = pollForm.kind === 'text';
    const validOptions = pollForm.options.filter(opt => opt.trim() !== '');
    // POLLS NEXT-LEVEL P2b: the ceiling counts REAL options — 8 of
    // them (POLL_MAX_OPTIONS). Abstain is a field on the poll now,
    // never one of the slots.
    if (!isText && validOptions.length < 2) return showToastMsg("A poll requires at least 2 valid options.", "error");
    if (!isText && validOptions.length > POLL_MAX_OPTIONS) return showToastMsg(`At most ${POLL_MAX_OPTIONS} options.`, "error");
    if (!pollForm.title.trim()) return showToastMsg("Title is required.", "error");
    if (mode === 'launch' && !pollForm.endDate) return showToastMsg("Title and End Date are required.", "error");

    setSubmitting(true);
    try {
      const now = Date.now();
      // The deadline twins (P1 law): the UI reads the ms number,
      // the rules read the Timestamp — built from the same value
      // and verified to agree before the write. A draft without a
      // date carries neither twin yet.
      let expirationMs: number | null = null;
      let expiresTs: Timestamp | null = null;
      if (pollForm.endDate) {
        const dateTimeString = pollForm.endTime ? `${pollForm.endDate}T${pollForm.endTime}` : `${pollForm.endDate}T23:59:59`;
        expirationMs = new Date(dateTimeString).getTime();
        if (expirationMs <= now) throw new Error("The deadline must be in the future.");
        expiresTs = Timestamp.fromMillis(expirationMs);
        if (expiresTs.toMillis() !== expirationMs) throw new Error("The deadline could not be recorded consistently.");
      }
      // The opening twins, same law (P2b). The opening must precede
      // the deadline; an opening in the past simply means the poll
      // is open from birth, so it is dropped rather than stored.
      let opensMs: number | null = null;
      let opensTs: Timestamp | null = null;
      if (pollForm.opensDate) {
        const opensString = pollForm.opensTime ? `${pollForm.opensDate}T${pollForm.opensTime}` : `${pollForm.opensDate}T00:00:00`;
        const candidate = new Date(opensString).getTime();
        if (expirationMs !== null && candidate >= expirationMs) throw new Error("The opening time must be before the deadline.");
        if (candidate > now) {
          opensMs = candidate;
          opensTs = Timestamp.fromMillis(candidate);
          if (opensTs.toMillis() !== candidate) throw new Error("The opening time could not be recorded consistently.");
        }
      }

      const optionsMap: any = {};
      if (!isText) {
        validOptions.forEach((opt, idx) => {
          optionsMap[`opt_${idx}`] = { text: opt.trim(), votes: 0 };
        });
      }

      const isDecision = pollForm.pollClass === 'decision';
      const newPoll: Record<string, unknown> = {
        workspaceId: activeWorkspace.id,
        title: pollForm.title.trim(),
        description: pollForm.description.trim(),
        targetAudience: pollForm.targetAudience,
        status: mode === 'draft' ? 'DRAFT' : 'ACTIVE',
        createdAt: Date.now(),
        // POLLS P1 — attribution: the display name is derived from
        // the signed-in profile, and the creator's uid is stamped
        // beside it (the rules check it against the caller).
        createdBy: currentUser?.name || 'Admin',
        createdByUid: firebaseUser?.uid || '',
        ...(expirationMs !== null && expiresTs
          ? { expiresAt: expirationMs, expiresAtTs: expiresTs }
          : {}),
        ...(opensMs !== null && opensTs
          ? { opensAt: opensMs, opensAtTs: opensTs }
          : {}),
        options: optionsMap,
        // Ballot-box model: the doc carries ONLY this count; each
        // ballot lives in polls/{id}/votes/{uid}. No votedUsers map.
        totalVotes: 0,
        // POLLS NEXT-LEVEL P2b — abstention: the creator's choice as
        // a field, and its own counter, born at zero (the rules pin
        // both; the counter may move only with an abstain ballot).
        ...(isText ? {} : { allowAbstain: pollForm.abstain, abstainVotes: 0 }),
        // EVENTS P1 — chosen at launch and frozen by the rules: the
        // question's shape and when members may see the results.
        kind: pollForm.kind,
        resultVisibility: pollForm.resultVisibility,
        // POLLS NEXT-LEVEL P1 — the class, labelled before any vote.
        pollClass: pollForm.pollClass,
        // POLLS NEXT-LEVEL P2b — template provenance, when the form
        // was filled from a template or a re-run, and the
        // recurrence mark when this poll itself recurs.
        ...(pendingTemplate ? { templateId: pendingTemplate.templateId } : {}),
        ...(pollForm.recurrence !== 'none' ? { recurrence: pollForm.recurrence } : {}),
        ...(isDecision
          ? {
              binding: pollForm.binding,
              // The secrecy choice the rules can honour: committee
              // polls and written responses are named by design;
              // a community Decision poll takes the creator's choice.
              ballot:
                pollForm.targetAudience === 'MANAGERS' || isText ? 'named' : pollForm.ballot,
              // The frozen electorate: the member register, counted
              // now (pollElectorateCount) — later joins do not move it.
              // (For a draft this stamp is refreshed at opening, in
              // the same write that opens it — see handleOpenPoll.)
              eligibleCount: pollElectorateCount(devotees, pollForm.targetAudience),
              quorumPct: Math.min(100, Math.max(0, Math.round(pollForm.quorumPct) || 0)),
              passPct: Math.min(100, Math.max(0, Math.round(pollForm.passPct) || 0))
            }
          : {})
      };

      const pollRef = doc(collection(db, 'polls'));
      await setDoc(pollRef, newPoll);
      showToastMsg(mode === 'draft' ? t('surfaces.events.draftSaved') : "Panchayat Poll successfully launched!", 'success');

      pushToDataLayer('generate_lead', { poll_target: newPoll.targetAudience, options_count: validOptions.length });

      setShowCreateModal(false);
      setPollForm({ title: '', description: '', targetAudience: 'ALL_MEMBERS', endDate: '', endTime: '', opensDate: '', opensTime: '', options: ['', ''], kind: 'choice', abstain: false, resultVisibility: 'afterVote', pollClass: 'pulse', binding: false, ballot: 'secret', quorumPct: POLL_DEFAULT_QUORUM_PCT, passPct: POLL_DEFAULT_PASS_PCT, recurrence: 'none' });
      setPendingTemplate(null);
      setActiveTab(mode === 'draft' ? 'DRAFTS' : 'ACTIVE');
    } catch (err: any) {
      console.error(err);
      showToastMsg(friendlyError(err, t, 'save'), "error");
    } finally {
      setSubmitting(false);
    }
  };

  // POLLS NEXT-LEVEL P2b — opening a draft: ONE write flips the
  // status, and for a Decision poll the same write re-stamps the
  // frozen electorate from the register as it stands NOW (the
  // rules allow eligibleCount to move only on this transition).
  const handleOpenPoll = async (poll: any) => {
    if (!poll.expiresAt || poll.expiresAt <= Date.now()) {
      showToastMsg(t('surfaces.events.draftNeedsDate'), "error");
      openEditPoll(poll);
      return;
    }
    setSubmitting(true);
    try {
      const updates: Record<string, unknown> = { status: 'ACTIVE' };
      if (pollClass(poll) === 'decision') {
        updates.eligibleCount = pollElectorateCount(devotees, poll.targetAudience || 'ALL_MEMBERS');
      }
      await updateDoc(doc(db, 'polls', poll.id), updates);
      showToastMsg(t('surfaces.events.pollOpened'), 'success');
      setActiveTab('ACTIVE');
    } catch (err: any) {
      console.error(err);
      showToastMsg(friendlyError(err, t, 'save'), "error");
    } finally {
      setSubmitting(false);
    }
  };

  // POLLS NEXT-LEVEL P2b — templates: save a poll's shape, reuse
  // it in one step, delete it. Templates live on the workspace doc
  // (lib/pollTemplates); the rules pin the committee's writes to
  // that one field.
  const handleSaveTemplate = async () => {
    if (!templateSavePoll || !activeWorkspace?.id) return;
    setSubmitting(true);
    try {
      const tpl = templateFromPoll(templateSavePoll, {
        id: newPollTemplateId(Date.now()),
        name: templateForm.name.trim() || templateSavePoll.title || '',
        recurrence: templateForm.recurrence,
        now: Date.now(),
        uid: firebaseUser?.uid || '',
      });
      await updateDoc(doc(db, 'workspaces', activeWorkspace.id), { pollTemplates: arrayUnion(tpl) });
      showToastMsg(t('surfaces.events.templateSaved'), 'success');
      setTemplateSavePoll(null);
    } catch (err: any) {
      console.error(err);
      showToastMsg(friendlyError(err, t, 'save'), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = (tpl: PollTemplate) => {
    setConfirmDialog({
      title: t('surfaces.events.templatesTitle'),
      message: `Delete the template "${tpl.name}"? Polls already launched from it are untouched.`,
      confirmText: t('actions.deleteRecord') || "DELETE",
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const nextRaw = templatesRaw.filter(
            (r: any) => !(r && typeof r === 'object' && r.id === tpl.id)
          );
          await updateDoc(doc(db, 'workspaces', activeWorkspace.id), { pollTemplates: nextRaw });
          showToastMsg(t('surfaces.events.templateDeleted'), 'success');
        } catch (e: any) { console.error(e); showToastMsg(friendlyError(e, t, 'save'), "error"); }
      }
    });
  };

  const dateInputOf = (ms: number) => {
    const d = new Date(ms); const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const timeInputOf = (ms: number) => {
    const d = new Date(ms); const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Fill the create form from a shape (+ optionally a suggested
  // window) and open the modal. Recurrence's "run again" is this —
  // a pre-filled form a person checks and opens themselves.
  const fillFormFromShape = (
    shape: ReturnType<typeof templateToShape>,
    meta: { templateId: string | null; recurrence: PollRecurrence },
    window: { opensAt: number | null; expiresAt: number } | null
  ) => {
    setPollForm({
      title: shape.title,
      description: shape.description,
      targetAudience: shape.targetAudience,
      endDate: window ? dateInputOf(window.expiresAt) : '',
      endTime: window ? timeInputOf(window.expiresAt) : '',
      opensDate: window?.opensAt ? dateInputOf(window.opensAt) : '',
      opensTime: window?.opensAt ? timeInputOf(window.opensAt) : '',
      options: shape.kind === 'text' ? ['', ''] : [...shape.options],
      kind: shape.kind,
      abstain: shape.abstain,
      resultVisibility: (['live', 'afterVote', 'afterClose', 'committee'].includes(shape.resultVisibility) ? shape.resultVisibility : 'afterVote') as typeof pollForm.resultVisibility,
      pollClass: shape.pollClass,
      binding: shape.binding,
      ballot: shape.ballot,
      quorumPct: shape.quorumPct,
      passPct: shape.passPct,
      recurrence: meta.recurrence,
    });
    setPendingTemplate(meta.templateId ? { templateId: meta.templateId } : null);
    setShowCreateModal(true);
  };

  const handleUseTemplate = (tpl: PollTemplate, rerun: boolean) => {
    let window: { opensAt: number | null; expiresAt: number } | null = null;
    if (rerun && tpl.recurrence !== 'none') {
      const last = polls
        .filter(p => p.templateId === tpl.id && typeof p.expiresAt === 'number')
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      if (last) {
        window = nextRunWindow(tpl.recurrence, typeof last.opensAt === 'number' ? last.opensAt : null, last.expiresAt, Date.now());
      }
    }
    fillFormFromShape(templateToShape(tpl), { templateId: tpl.id, recurrence: tpl.recurrence }, window);
  };

  // Re-run a recurring poll itself: the next round pre-filled from
  // this round, dates advanced by its own recurrence mark.
  const handleRerunPoll = (poll: any) => {
    const recurrence = pollRecurrence(poll.recurrence);
    const shape = templateToShape(templateFromPoll(poll, {
      id: '', name: '', recurrence, now: Date.now(), uid: firebaseUser?.uid || '',
    }));
    const window = typeof poll.expiresAt === 'number'
      ? nextRunWindow(recurrence, typeof poll.opensAt === 'number' ? poll.opensAt : null, poll.expiresAt, Date.now())
      : null;
    fillFormFromShape(shape, { templateId: poll.templateId || null, recurrence }, window);
  };

  // POLLS NEXT-LEVEL P2b — cast an abstention through the shared
  // write path (lib/pollVoting): the same write from this desk as
  // from the member's Polls home, for either generation of poll.
  const handleAbstain = async (poll: any) => {
    const uid = firebaseUser?.uid;
    if (!uid) return showToastMsg("Please log in to vote.", "error");
    if (!pollIsOpen(poll, Date.now())) return showToastMsg("This poll has been concluded.", "error");
    if (ballotCast(myBallotFor(poll))) return showToastMsg("You have already voted.", "error");
    try {
      await castAbstainVote(db, poll.id, uid, poll);
      showToastMsg(t('surfaces.events.memberPollsAbstained'), 'success');
    } catch (e: any) {
      console.error(e);
      showToastMsg(friendlyError(e, t, 'save'), "error");
    }
  };

  const getCountdown = (dateString: string) => {
    const d = new Date(dateString).getTime() - new Date().getTime();
    if (d <= 0) return "Ended";
    const h = Math.floor(d / 3600000);
    const m = Math.floor((d % 3600000) / 60000);
    return `${h}h ${m}m left`;
  };

  const handleVote = async (pollId: string, optionId: string) => {
    const uid = firebaseUser?.uid;
    if (!uid) return showToastMsg("Please log in to vote.", "error");
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    if (!pollIsOpen(poll, Date.now())) {
      return showToastMsg("This poll has been concluded.", "error");
    }
    if (myVoteFor(poll)) return showToastMsg("You have already voted.", "error");

    try {
      // ONE batch: my private ballot doc + the poll's counts, together
      // — the shared ballot write path (lib/pollVoting, POLLS P2a):
      // the desk and the member's Polls home cast through the very
      // same function, so a vote is the same write from either door.
      // The rules anchor the +1 to the NEW ballot doc under my own
      // uid — a second vote from any device is impossible (the ballot
      // doc already exists, so the anchor fails), and the poll doc
      // itself never learns who chose what.
      await castChoiceBallot(db, pollId, uid, optionId);
      showToastMsg("Your vote has been recorded.", 'success');
      pushToDataLayer('select_content', { content_type: 'Poll_Vote', item_id: pollId });
    } catch (e: any) {
      console.error(e);
      showToastMsg(friendlyError(e, t, 'save'), "error");
    }
  };

  // EVENTS P1 — multi-select ballot: ONE ballot doc, several option
  // counters +1, turnout +1 (pollMultiVoteAnchorOk). One voice still.
  const handleVoteMulti = async (pollId: string) => {
    const uid = firebaseUser?.uid;
    if (!uid) return showToastMsg("Please log in to vote.", "error");
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    if (!pollIsOpen(poll, Date.now())) return showToastMsg("This poll has been concluded.", "error");
    if (ballotCast(myBallotFor(poll))) return showToastMsg("You have already voted.", "error");
    const picks = multiPick[pollId] || [];
    const problem = validateMultiChoice(poll, picks);
    if (problem) {
      return showToastMsg(
        problem === 'abstain-exclusive'
          ? "Abstaining means choosing only Abstain."
          : "Please choose at least one option (up to 5).",
        "error"
      );
    }
    try {
      // The shared ballot write path (lib/pollVoting, POLLS P2a).
      await castMultiBallot(db, pollId, uid, picks);
      showToastMsg("Your vote has been recorded.", 'success');
    } catch (e: any) {
      console.error(e);
      showToastMsg(friendlyError(e, t, 'save'), "error");
    }
  };

  // EVENTS P1 — free-text ballot: the turnout counter moves, the
  // options map never does (pollTextVoteAnchorOk). An announced
  // suggestion box — the committee reads the responses.
  const handleVoteText = async (pollId: string) => {
    const uid = firebaseUser?.uid;
    if (!uid) return showToastMsg("Please log in to respond.", "error");
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    if (!pollIsOpen(poll, Date.now())) return showToastMsg("This poll has been concluded.", "error");
    if (ballotCast(myBallotFor(poll))) return showToastMsg("You have already responded.", "error");
    const text = (textDraft[pollId] || '').trim();
    const problem = validateTextResponse(text);
    if (problem) {
      return showToastMsg(problem === 'too-long' ? "Please keep your response within 280 characters." : "Please write a response first.", "error");
    }
    try {
      // The shared ballot write path (lib/pollVoting, POLLS P2a).
      await castTextBallot(db, pollId, uid, text);
      showToastMsg("Your response has been recorded.", 'success');
    } catch (e: any) {
      console.error(e);
      showToastMsg(friendlyError(e, t, 'save'), "error");
    }
  };

  const toggleMultiPick = (pollId: string, optionId: string) => {
    setMultiPick(prev => {
      const cur = prev[pollId] || [];
      let next: string[];
      if (optionId === ABSTAIN_OPTION_ID) {
        // Abstain is exclusive: picking it clears every other pick.
        next = cur.includes(optionId) ? [] : [optionId];
      } else {
        const withoutAbstain = cur.filter(id => id !== ABSTAIN_OPTION_ID);
        next = withoutAbstain.includes(optionId)
          ? withoutAbstain.filter(id => id !== optionId)
          : [...withoutAbstain, optionId];
      }
      return { ...prev, [pollId]: next.slice(0, 5) };
    });
  };

  // EVENTS P1 — edit-before-first-vote. The rules (pollEditOk) verify
  // zero ballots; this form simply never appears once voting begins.
  const openEditPoll = (poll: any) => {
    const exp = poll.expiresAt ? new Date(poll.expiresAt) : null;
    const opn = poll.opensAt ? new Date(poll.opensAt) : null;
    const pad = (n: number) => String(n).padStart(2, '0');
    setEditForm({
      title: poll.title || '',
      description: poll.description || '',
      endDate: exp ? `${exp.getFullYear()}-${pad(exp.getMonth() + 1)}-${pad(exp.getDate())}` : '',
      endTime: exp ? `${pad(exp.getHours())}:${pad(exp.getMinutes())}` : '',
      opensDate: opn ? `${opn.getFullYear()}-${pad(opn.getMonth() + 1)}-${pad(opn.getDate())}` : '',
      opensTime: opn ? `${pad(opn.getHours())}:${pad(opn.getMinutes())}` : '',
      // P2b: the abstain entry (legacy polls carry it in the map)
      // is the toggle now — never an editable option row.
      abstain: pollHasAbstain(poll),
      options: Object.keys(poll.options || {})
        .filter(id => id !== ABSTAIN_OPTION_ID)
        .map(id => ({ id, text: poll.options[id].text || '' })),
      resultVisibility: (['live', 'afterVote', 'afterClose', 'committee'].includes(poll.resultVisibility) ? poll.resultVisibility : 'afterVote')
    });
    setEditPoll(poll);
  };

  const handleEditPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPoll) return;
    if (!pollIsEditable(editPoll, Date.now())) {
      setEditPoll(null);
      return showToastMsg(t('surfaces.events.editLockedNote'), "error");
    }
    // P2b: a live poll needs its deadline; a DRAFT may still wait
    // without one (it cannot open until a future deadline is set).
    const isDraftEdit = editPoll.status === 'DRAFT';
    if (!editForm.title.trim() || (!isDraftEdit && !editForm.endDate)) return showToastMsg("Title and End Date are required.", "error");
    setSubmitting(true);
    try {
      let expirationMs: number | null = null;
      const updates: Record<string, unknown> = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        resultVisibility: editForm.resultVisibility
      };
      if (editForm.endDate) {
        const dateTimeString = editForm.endTime ? `${editForm.endDate}T${editForm.endTime}` : `${editForm.endDate}T23:59:59`;
        expirationMs = new Date(dateTimeString).getTime();
        if (expirationMs <= Date.now()) throw new Error("The deadline must be in the future.");
        // POLLS P1 — the deadline twins must agree (see handleCreatePoll).
        const expiresTs = Timestamp.fromMillis(expirationMs);
        if (expiresTs.toMillis() !== expirationMs) throw new Error("The deadline could not be recorded consistently.");
        updates.expiresAt = expirationMs;
        updates.expiresAtTs = expiresTs;
      } else if (editPoll.expiresAt) {
        updates.expiresAt = deleteField();
        updates.expiresAtTs = deleteField();
      }
      // P2b — the opening twins, same agreement law as the
      // deadline's. Clearing the opening removes both twins
      // (deleteField — the key still counts in the rules diff).
      if (editForm.opensDate) {
        const opensString = editForm.opensTime ? `${editForm.opensDate}T${editForm.opensTime}` : `${editForm.opensDate}T00:00:00`;
        const opensMs = new Date(opensString).getTime();
        if (expirationMs !== null && opensMs >= expirationMs) throw new Error("The opening time must be before the deadline.");
        const opensTs = Timestamp.fromMillis(opensMs);
        if (opensTs.toMillis() !== opensMs) throw new Error("The opening time could not be recorded consistently.");
        updates.opensAt = opensMs;
        updates.opensAtTs = opensTs;
      } else if (editPoll.opensAt) {
        updates.opensAt = deleteField();
        updates.opensAtTs = deleteField();
      }
      if (pollKind(editPoll) !== 'text') {
        // P2b: the options map carries REAL options only — a
        // legacy poll's in-map abstain entry is retired by this
        // edit, and the choice lives on as the allowAbstain field.
        const optionsMap: Record<string, { text: string; votes: number }> = {};
        for (const o of editForm.options) {
          if (!o.text.trim()) throw new Error("Every option needs its text.");
          optionsMap[o.id] = { text: o.text.trim(), votes: 0 };
        }
        updates.options = optionsMap;
        updates.allowAbstain = editForm.abstain;
        // (No abstainVotes key here: the edit diff pin does not
        // carry it. A retired legacy entry had zero votes by the
        // edit law, and the counter starts itself at the first
        // abstention — the anchor reads it with a 0 default.)
      }
      await updateDoc(doc(db, 'polls', editPoll.id), updates);
      showToastMsg("Poll updated.", 'success');
      setEditPoll(null);
    } catch (err: any) {
      console.error(err);
      showToastMsg(friendlyError(err, t, 'save'), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConcludePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concludeData.id) return;
    setSubmitting(true);
    try {
      const updates: any = { status: 'CONCLUDED' };
      if (concludeData.note.trim()) {
        updates.adminNote = concludeData.note.trim();
      }
      // POLLS NEXT-LEVEL P1 — the outcome is computed ONCE, here,
      // from the poll's frozen counts, and stored on the record in
      // the same write that concludes it (the rules allow the
      // outcome key only on this path, and never a rewrite).
      const poll = polls.find(p => p.id === concludeData.id);
      if (poll && !pollStoredOutcome(poll)) {
        updates.outcome = computePollOutcome(poll, Date.now());
      }
      await updateDoc(doc(db, 'polls', concludeData.id), updates);
      showToastMsg("Poll concluded and decision published.", 'success');
      setShowConcludeModal(false);
      setConcludeData({ id: null, title: '', note: '' });
    } catch (err: any) {
      console.error(err);
      showToastMsg(friendlyError(err, t, 'save'), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePoll = (poll: any) => {
    // Archive-only law: a poll with ballots is the community's decided
    // history and can never be erased (the rules enforce this too).
    // Only a poll nobody has voted on may be deleted.
    if (pollTotalVotes(poll) > 0) {
      return showToastMsg("This poll has votes and is part of the record — it cannot be deleted. Concluded polls stay archived.", "error");
    }
    setConfirmDialog({
      title: "Delete Poll",
      message: `Delete "${poll.title}"? No votes have been cast on it, so nothing will be lost.`,
      confirmText: t('actions.deleteRecord') || "DELETE POLL",
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteDoc(doc(db, 'polls', poll.id));
          showToastMsg("Poll deleted.", 'success');
        } catch (e: any) { console.error(e); showToastMsg(friendlyError(e, t, 'save'), "error"); }
      }
    });
  };

  // POLLS NEXT-LEVEL P2a — the secrecy-safe reminder. The committee
  // publishes ONE announcement addressed to the whole community (the
  // title carries the poll's title after the stable prefix — the
  // parse contract in lib/memberPolls). It CANNOT target non-voters:
  // the committee neither knows nor learns who has voted. Instead,
  // each member's own device resolves the reminder against the
  // member's OWN ballot (org/pollReminderFanout): members who have
  // already voted never see it; members who have not get a personal
  // Suchana item. The sender learns nothing either way.
  const handleSendReminder = (poll: any) => {
    setConfirmDialog({
      title: "Publish a Reminder",
      message: `This publishes a community announcement for "${poll.title}" through the org's announcement feed. Ballots stay private: the announcement is addressed to everyone, but each member's own app quietly checks their own ballot — members who have already voted will not be reminded, and nobody can learn who has or has not voted.`,
      confirmText: "PUBLISH REMINDER",
      isDanger: false,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const uid = firebaseUser?.uid;
          if (!uid) throw new Error('Please sign in again to publish a reminder.');
          const closesSentence = poll.expiresAt
            ? t('surfaces.events.pollReminderCloses').replace(
                '{date}',
                new Date(poll.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              )
            : '';
          await publishBroadcast({
            orgId: activeWorkspace.id,
            orgName: activeWorkspace.name || '',
            title: pollReminderBroadcastTitle(poll.title),
            body: pollReminderBroadcastBody(t('surfaces.events.pollReminderBody'), closesSentence),
            createdBy: uid,
            createdByName: currentUser?.name || '',
          });
          showToastMsg("Reminder published to the community.", "success");
        } catch (e: any) {
          console.error(e);
          showToastMsg(friendlyError(e, t, 'save'), "error");
        }
      }
    });
  };

  // POLLS NEXT-LEVEL P2a — the WhatsApp reminder pack (E8 pattern):
  // a ready message composed from the poll's real data, sent by the
  // organiser from their OWN WhatsApp to people they choose there.
  const [waPollId, setWaPollId] = useState<string | null>(null);
  const [waCopied, setWaCopied] = useState(false);

  const pollWaMessage = (poll: any): string => {
    const cls = pollClass(poll);
    const standingLine =
      cls === 'decision'
        ? pollIsBinding(poll)
          ? t('surfaces.events.pollStandingBinding')
          : t('surfaces.events.pollStandingAdvisory')
        : t('surfaces.events.pollStandingPulse');
    return buildPollReminderMessage(
      {
        pollTitle: poll.title || '',
        orgName: activeWorkspace?.name || '',
        closesLine: poll.expiresAt
          ? new Date(poll.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : '',
        standingLine,
      },
      { pollReminder: t('surfaces.events.shareMsgPollReminder') }
    );
  };

  const copyWaMessage = async (poll: any) => {
    const message = pollWaMessage(poll);
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2000);
  };
  
  const openAudit = (poll: any) => {
    // Committee polls are named votes by design; opening the named
    // ballot list is itself recorded in the workspace history
    // (Blueprint A audit chain), so the reveal is never silent.
    // EVENTS P1: reading a text poll's named responses is a reveal
    // of exactly the same kind and is logged the same way.
    // POLLS P1: a Decision poll whose creator chose a named ballot
    // joins the same posture — the reveal is logged identically.
    if (poll.targetAudience === 'MANAGERS' || pollKind(poll) === 'text' || pollBallotMode(poll) === 'named') {
      noteAudit({
        action: 'poll.ballotsRevealed',
        entityType: 'poll',
        entityId: poll.id,
        entityLabel: poll.title,
        summaryKey: 'org.audit.history.pollBallotsRevealed',
        summaryParams: { poll: poll.title || '' },
      });
    }
    setAuditPoll(poll);
  };

  const handleDownloadPDF = (poll: any) => {
    pushToDataLayer('export_data', { export_type: 'PDF', data_category: 'POLL_REPORT', community_id: activeWorkspace?.id });
    if(generatePollReportPdf) {
      generatePollReportPdf(activeWorkspace?.name, poll, devotees);
    } else {
      showToastMsg("PDF engine loading...", "error");
    }
  };

  const handleAddOption = () => setPollForm(prev => ({...prev, options: [...prev.options, '']}));
  const handleRemoveOption = (index: number) => {
    setPollForm(prev => { const newOpts = [...prev.options]; newOpts.splice(index, 1); return { ...prev, options: newOpts }; });
  };
  const handleOptionChange = (index: number, value: string) => {
    setPollForm(prev => { const newOpts = [...prev.options]; newOpts[index] = value; return { ...prev, options: newOpts }; });
  };

  const visiblePolls = useMemo(() => {
    return polls.filter(poll => {
      if (isManagerOrAdmin) return true; 
      return poll.targetAudience === 'ALL_MEMBERS'; 
    });
  }, [polls, isManagerOrAdmin]);

  const activePolls = visiblePolls.filter(p => p.status === 'ACTIVE');
  const concludedPolls = visiblePolls.filter(p => p.status === 'CONCLUDED');
  // P2b: drafts are a first-class desk section of their own — not
  // a hidden flag on the active list.
  const draftList = visiblePolls.filter(p => p.status === 'DRAFT');
  const displayPolls = activeTab === 'ACTIVE' ? activePolls : activeTab === 'DRAFTS' ? draftList : concludedPolls;

  const renderTimerProgress = (poll: any) => {
    if (!poll.expiresAt) return null;
    const now = Date.now();
    const createdTime = poll.createdAt || (poll.expiresAt - 7 * 24 * 60 * 60 * 1000);
    const totalTime = poll.expiresAt - createdTime;
    const timeLeft = poll.expiresAt - now;
    
    if (timeLeft <= 0) return (
      <div className="mt-4 w-full">
         <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">Voting Closed</span>
      </div>
    );

    const percentLeft = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
    const isUrgent = timeLeft < 24 * 60 * 60 * 1000;
    
    const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
    const minsLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));
    
    const timeText = isUrgent ? `${hoursLeft}h ${minsLeft}m left` : `${daysLeft} days left`;

    return (
      <div className="mt-4 mb-2 w-full flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Timer size={12} className={isUrgent ? 'text-saffron-500 animate-pulse' : 'text-blue-500'} />
            Poll Deadline
          </span>
          <span className={`text-[10px] font-black tracking-wide ${isUrgent ? 'text-saffron-500' : 'text-stone-700'}`}>
            {timeText}
          </span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden shadow-inner border border-stone-200/50">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-saffron-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-blue-500'}`}
            style={{ width: `${percentLeft}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // PANCHAYAT AI (DECISION ASSISTANT)
  const panchayatInsights = useMemo(() => {
    if (!isManagerOrAdmin || polls.length === 0 || devotees.length === 0) return null;

    let totalEligibleActive = 0;
    let totalVotedActive = 0;

    activePolls.forEach(p => {
      const eligibleCount = p.targetAudience === 'MANAGERS' 
        ? devotees.filter(m => ['MANAGER', 'MANAGER', 'SUPER_ADMIN'].includes(m.role)).length 
        : devotees.length;
      const votesCast = pollTotalVotes(p);
      totalEligibleActive += eligibleCount;
      totalVotedActive += votesCast;
    });

    const activeTurnoutRate = totalEligibleActive > 0 ? Math.round((totalVotedActive / totalEligibleActive) * 100) : 0;

    let marginMessage = "No recent concluded polls to analyze.";
    if (concludedPolls.length > 0) {
      const lastPoll = concludedPolls[0];
      // P2b: abstentions are not a candidate — never let the
      // abstain entry (legacy in-map shape) pose as the winner.
      const opts = Object.entries(lastPoll.options || {})
        .filter(([id]) => id !== ABSTAIN_OPTION_ID)
        .map(([, v]) => v)
        .sort((a: any, b: any) => b.votes - a.votes) as any[];
      const total = pollTotalVotes(lastPoll);

      if (total > 0 && opts.length >= 2) {
        const first = opts[0].votes;
        const second = opts[1].votes;
        const marginPerc = Math.round(((first - second) / total) * 100);

        if (marginPerc > 30) {
          marginMessage = `Last decision ("${lastPoll.title}") was won by a decisive ${marginPerc}% margin, indicating strong community consensus.`;
        } else if (marginPerc < 10) {
          marginMessage = `Last decision ("${lastPoll.title}") was highly contested (won by just ${marginPerc}%). Consider community discussion to align members.`;
        } else {
          marginMessage = `Last decision ("${lastPoll.title}") had a clear ${marginPerc}% victory margin.`;
        }
      }
    }

    return { activeTurnoutRate, marginMessage };
  }, [polls, activePolls, concludedPolls, devotees, isManagerOrAdmin]);


  if (loading) return <div className="flex justify-center p-20 text-saffron-500"><Loader2 size={40} className="animate-spin" /></div>;

  return (
    <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-sm border border-stone-100 flex flex-col h-full w-full relative space-y-6 sm:space-y-8 animate-in fade-in ring-1 ring-black/5 min-h-[90vh]">
      {!isOnline && (
        <div className="bg-red-600 text-white p-3 rounded-2xl flex items-center justify-center gap-3 shadow-lg animate-pulse">
          <WifiOff size={18} />
          <span className="text-xs font-black uppercase tracking-widest">Offline Mode: Votes will sync when connection is restored.</span>
        </div>
      )}

      {/* GLOBAL CUSTOM TOAST ENGINE */}
      {toast && createPortal(
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 ${toast.type === 'error' ? 'bg-red-900' : 'bg-stone-900'} text-white`}>
           <div className={`p-2 rounded-full shrink-0 ${toast.type === 'offline' ? 'bg-saffron-500/20 text-saffron-500' : toast.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
             {toast.type === 'offline' ? <WifiOff size={20}/> : toast.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
           </div>
           <div>
             <p className={`text-xs font-black uppercase tracking-widest mb-0.5 ${toast.type === 'offline' ? 'text-saffron-400' : toast.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
               {toast.type === 'offline' ? 'Offline Cache' : toast.type === 'error' ? 'Error' : 'Success'}
             </p>
             <p className="text-sm font-bold">{toast.message}</p>
           </div>
        </div>,
        document.body
      )}

      {/* CONFIRMATION DIALOG PORTAL */}
      {confirmDialog && createPortal(
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 sm:p-8 animate-in zoom-in-95 ring-1 ring-white/20 text-center border-t-4 border-saffron-500">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner ${confirmDialog.isDanger ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
              {confirmDialog.isDanger ? <AlertTriangle size={32}/> : <CheckCircle2 size={32}/>}
            </div>
            <h3 className="text-xl font-black text-stone-900 mb-2 tracking-tight">{confirmDialog.title}</h3>
            <p className="text-sm font-bold text-stone-500 mb-8 leading-relaxed whitespace-pre-wrap">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-sm">{t('actions.cancel') || 'Cancel'}</button>
              <button onClick={confirmDialog.onConfirm} className={`flex-1 font-black py-3.5 rounded-xl text-xs uppercase tracking-widest text-white shadow-md transition-all hover:-translate-y-0.5 ${confirmDialog.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* HEADER CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-stone-100 pb-6">
        <div>
          <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2 tracking-tight">
            <BarChart3 className="text-saffron-500" size={26} /> {t('nav.polls') || 'Community Voting'}
          </h2>
          <p className="text-xs text-stone-500 font-bold mt-1 uppercase tracking-widest">
            One member, one vote — every ballot recorded, results counted openly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {isManagerOrAdmin && (
             <button 
                onClick={() => { setShowGuide(!showGuide); if(!showGuide) pushToDataLayer('open_quick_guide', { module: 'PanchayatPolls' }); }} 
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 whitespace-nowrap shadow-sm"
             >
                <HelpCircle size={14}/> Quick Guide
             </button>
          )}

          <div className="flex w-full sm:w-auto bg-stone-100 p-1.5 rounded-2xl shadow-inner border border-stone-200">
            <button 
              onClick={() => setActiveTab('ACTIVE')} 
              className={`flex-1 sm:w-auto px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'ACTIVE' ? 'bg-white text-saffron-500 shadow-sm border border-stone-100' : 'text-stone-500 hover:text-stone-800'}`}
            >
              <PieChart size={14}/> Active ({activePolls.length})
            </button>
            <button 
              onClick={() => setActiveTab('CONCLUDED')} 
              className={`flex-1 sm:w-auto px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'CONCLUDED' ? 'bg-white text-stone-900 shadow-sm border border-stone-100' : 'text-stone-500 hover:text-stone-800'}`}
            >
              <Flag size={14}/> Concluded ({concludedPolls.length})
            </button>
            {isManagerOrAdmin && (
              <button
                onClick={() => setActiveTab('DRAFTS')}
                className={`flex-1 sm:w-auto px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'DRAFTS' ? 'bg-white text-stone-900 shadow-sm border border-stone-100' : 'text-stone-500 hover:text-stone-800'}`}
              >
                <FileText size={14}/> {t('surfaces.events.tabDrafts')} ({draftList.length})
              </button>
            )}
          </div>

          {isManagerOrAdmin && (
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="w-full sm:w-auto bg-stone-900 hover:bg-black text-white px-5 py-3.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 shrink-0"
            >
              <Plus size={16}/> Launch Poll
            </button>
          )}
        </div>
      </div>
      
      {/* PANCHAYAT AI (DECISION INSIGHTS FOR ADMINS) */}
      {isManagerOrAdmin && panchayatInsights && activeTab === 'ACTIVE' && activePolls.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 p-4 sm:p-5 rounded-2xl shadow-inner flex flex-col sm:flex-row sm:items-center gap-4 animate-in slide-in-from-top-2">
          <div className="bg-purple-100 text-purple-600 p-3 rounded-xl shrink-0 self-start sm:self-auto">
            <BrainCircuit size={24} />
          </div>
          <div>
            <h3 className="text-xs font-black text-purple-900 uppercase tracking-widest mb-1">Panchayat AI Insight</h3>
            <p className="text-sm font-bold text-stone-700 leading-snug">
              Active polls currently have a <strong>{panchayatInsights.activeTurnoutRate}% voter turnout</strong> rate. 
              {panchayatInsights.activeTurnoutRate < 50 ? " Consider sending a Broadcast reminder to increase engagement." : " Excellent community participation!"}
            </p>
          </div>
        </div>
      )}

      {isManagerOrAdmin && panchayatInsights && activeTab === 'CONCLUDED' && concludedPolls.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 sm:p-5 rounded-2xl shadow-inner flex flex-col sm:flex-row sm:items-center gap-4 animate-in slide-in-from-top-2">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-xl shrink-0 self-start sm:self-auto">
            <BarChart2 size={24} />
          </div>
          <div>
            <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">Consensus Analytics</h3>
            <p className="text-sm font-bold text-stone-700 leading-snug">
              {panchayatInsights.marginMessage}
            </p>
          </div>
        </div>
      )}
      
      {/* UX: QUICK GUIDE BANNER */}
      {showGuide && isManagerOrAdmin && (
        <div className="bg-blue-50 border border-blue-200 p-5 sm:p-6 rounded-2xl shadow-inner animate-in slide-in-from-top-2 relative">
          <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-blue-400 hover:text-blue-700 transition-colors"><X size={18}/></button>
          <h3 className="text-sm font-black text-blue-900 flex items-center gap-2 mb-4 uppercase tracking-widest"><Lightbulb size={18} className="text-blue-500"/> Voting System Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shrink-0"><Lock size={16}/></div>
              <div>
                <p className="text-xs font-black text-stone-900 mb-1">1. One Vote Each & Privacy</p>
                <p className="text-[10px] font-bold text-stone-600 leading-relaxed">Each ballot is stored as a private vote under the voter's own account; the poll itself keeps only counts, so community ballots stay secret. Committee polls are named votes — committee members can open the ballot audit, and every opening is recorded in the workspace history.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shrink-0"><BellRing size={16}/></div>
              <div>
                <p className="text-xs font-black text-stone-900 mb-1">2. Final Reminders</p>
                <p className="text-[10px] font-bold text-stone-600 leading-relaxed">Before a poll ends, click 'Remind' to publish a community announcement. The announcement is addressed to everyone, but each member's own app quietly checks their own ballot: members who already voted never see the reminder, and nobody — including you — can learn who has or has not voted. A WhatsApp version sits beside it, sent from your own WhatsApp.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shrink-0"><FileText size={16}/></div>
              <div>
                <p className="text-xs font-black text-stone-900 mb-1">3. Conclude & Report</p>
                <p className="text-[10px] font-bold text-stone-600 leading-relaxed">Add official 'Admin Notes' upon conclusion explaining the decision. Members can download the official PDF report.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POLL CARDS GRID */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-12 scrollbar-hide">
        {displayPolls.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {displayPolls.map(poll => {
              const myVote = myVoteFor(poll);
              const myBallot = myBallotFor(poll);
              const iVoted = ballotCast(myBallot);
              const kind = pollKind(poll);
              const totalVotes = pollTotalVotes(poll);
              const options = Object.keys(poll.options || {}).map(k => ({ id: k, ...poll.options[k] }));
              // EVENTS P1 — the launch-time result rule decides what
              // this viewer may see; the committee always sees counts.
              const showResults = pollResultsVisible(poll, { hasVoted: iVoted, isCommittee: isManagerOrAdmin }, Date.now());
              const visRule = pollResultVisibility(poll);

              // POLLS P1 — a concluded poll's stored outcome names
              // its winners (ALL of them: a tie badges every tied
              // option); a poll without one keeps the derived read.
              const storedOutcome = poll.status === 'CONCLUDED' ? pollStoredOutcome(poll) : null;
              let winnerIds: string[] = [];
              if (poll.status === 'CONCLUDED' && totalVotes > 0 && showResults && kind !== 'text') {
                 if (storedOutcome) winnerIds = storedOutcome.winnerOptionIds;
                 else {
                   // P2b: the derived fallback also excludes the
                   // abstain entry — an abstention never "wins".
                   const candidates = options.filter(o => o.id !== ABSTAIN_OPTION_ID);
                   if (candidates.length > 0) winnerIds = [candidates.reduce((max, obj) => obj.votes > max.votes ? obj : max, candidates[0]).id];
                 }
              }
              const cls = pollClass(poll);
              const ballotMode = pollBallotMode(poll);
              // P2b: the phase (draft / scheduled / open / closed),
              // judged from the record's own clocks.
              const phase = pollPhase(poll, Date.now());
              const abstainCount = pollAbstainVotes(poll);
              const myAbstain = myBallot?.abstain === true || myVote === ABSTAIN_OPTION_ID;

              // POLLS NEXT-LEVEL P2b — the DRAFT card: the
              // committee's working paper, honest about its state.
              // No voting surface, no results — just the shape, its
              // schedule, and the road out (edit, open, template,
              // delete). Drafts never reach a member's screen.
              if (poll.status === 'DRAFT') {
                return (
                  <div key={poll.id} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-dashed border-stone-300 ring-1 ring-black/5 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border bg-stone-100 text-stone-600 border-stone-300 flex items-center gap-1.5 shadow-sm">
                          <FileText size={12}/> {t('surfaces.events.draftBadge')}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border flex items-center gap-1.5 shadow-sm ${cls === 'decision' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
                          {cls === 'decision' ? t('surfaces.events.badgeDecision') : t('surfaces.events.badgePulse')}
                        </span>
                        {poll.targetAudience === 'MANAGERS' && (
                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border bg-blue-50 text-blue-600 border-blue-200 flex items-center gap-1.5 shadow-sm">
                            <ShieldCheck size={12}/> Committee Only
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-stone-900 mb-3 leading-tight tracking-tight">{poll.title}</h3>
                      {poll.description && (
                        <p className="text-xs font-bold text-stone-500 mb-6 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-100 shadow-inner">{poll.description}</p>
                      )}
                      {kind !== 'text' && (
                        <div className="space-y-2 mb-4">
                          {options.filter(o => o.id !== ABSTAIN_OPTION_ID).map(opt => (
                            <div key={opt.id} className="w-full p-3.5 rounded-xl border border-stone-100 bg-stone-50/60 flex justify-between items-center">
                              <span className="text-sm font-black text-stone-600">{opt.text}</span>
                            </div>
                          ))}
                          {pollHasAbstain(poll) && (
                            <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest pt-1">+ {t('surfaces.events.abstainOption')}</p>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] font-bold text-stone-500 leading-relaxed">
                        {t('surfaces.events.draftNote')}
                      </p>
                      {(poll.opensAt || poll.expiresAt) && (
                        <p className="text-[11px] font-bold text-stone-500 mt-2 flex items-center gap-1.5">
                          <CalendarClock size={13} className="text-saffron-500"/>
                          {poll.opensAt ? `${t('surfaces.events.opensOnLine').replace('{date}', new Date(poll.opensAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))} · ` : ''}
                          {poll.expiresAt ? t('surfaces.events.memberPollsCloses').replace('{date}', new Date(poll.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })) : t('surfaces.events.draftNeedsDate')}
                        </p>
                      )}
                    </div>
                    <div className="mt-6 pt-5 border-t border-stone-100 flex flex-wrap items-center gap-2">
                      <button onClick={() => handleOpenPoll(poll)} disabled={submitting} className="flex-1 sm:flex-none bg-stone-900 hover:bg-black disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm min-h-[44px]">
                        <Play size={14}/> {t('surfaces.events.openPollBtn')}
                      </button>
                      <button onClick={() => openEditPoll(poll)} className="flex-1 sm:flex-none bg-white hover:bg-stone-800 hover:text-white text-stone-700 border border-stone-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm min-h-[44px]">
                        <FileText size={14}/> {t('surfaces.events.editPoll')}
                      </button>
                      <button onClick={() => { setTemplateSavePoll(poll); setTemplateForm({ name: poll.title || '', recurrence: pollRecurrence(poll.recurrence) }); }} className="flex-1 sm:flex-none bg-white hover:bg-stone-800 hover:text-white text-stone-700 border border-stone-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm min-h-[44px]">
                        <Save size={14}/> {t('surfaces.events.saveAsTemplateBtn')}
                      </button>
                      <button onClick={() => handleDeletePoll(poll)} className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 p-2.5 rounded-xl transition-all flex justify-center items-center shadow-sm min-h-[44px]" title="Delete (no votes cast yet)">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={poll.id} className={`bg-white rounded-3xl p-6 sm:p-8 shadow-sm border transition-all duration-300 ring-1 ring-black/5 flex flex-col justify-between group ${poll.status === 'ACTIVE' ? 'border-saffron-200 hover:shadow-md hover:border-saffron-300' : 'border-stone-200 opacity-90'}`}>

                   <div>
                     <div className="flex justify-between items-start mb-4">
                       <div className="flex flex-wrap items-center gap-2">
                         <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border flex items-center gap-1.5 shadow-sm ${poll.targetAudience === 'MANAGERS' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-stone-50 text-stone-600 border-stone-200'}`}>
                           {poll.targetAudience === 'MANAGERS' ? <ShieldCheck size={12}/> : <Users size={12}/>} 
                           {poll.targetAudience === 'MANAGERS' ? 'Committee Only' : 'Public Poll'}
                         </span>
                         {phase === 'scheduled' ? (
                           <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border bg-blue-50 text-blue-600 border-blue-200 flex items-center gap-1.5 shadow-sm">
                             <CalendarClock size={12}/> {t('surfaces.events.opensOnLine').replace('{date}', new Date(poll.opensAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))}
                           </span>
                         ) : poll.status === 'ACTIVE' ? (
                           <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border bg-saffron-50 text-saffron-600 border-saffron-200 flex items-center gap-1.5 shadow-sm">
                             <Timer size={12}/> {getCountdown(poll.expiresAt)}
                           </span>
                         ) : (
                           <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border bg-stone-800 text-white border-stone-900 flex items-center gap-1.5 shadow-sm">
                             <Lock size={12}/> Concluded
                           </span>
                         )}
                         {/* POLLS P1 — the class + standing + secrecy,
                             labelled BEFORE any voting surface. */}
                         <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border flex items-center gap-1.5 shadow-sm ${cls === 'decision' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
                           {cls === 'decision' ? t('surfaces.events.badgeDecision') : t('surfaces.events.badgePulse')}
                         </span>
                         {cls === 'decision' && (
                           <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5 shadow-sm">
                             {pollIsBinding(poll) ? t('surfaces.events.badgeBinding') : t('surfaces.events.badgeAdvisory')}
                           </span>
                         )}
                         {cls === 'decision' && (
                           <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border bg-stone-50 text-stone-600 border-stone-200 flex items-center gap-1.5 shadow-sm">
                             {ballotMode === 'named' ? t('surfaces.events.badgeNamed') : t('surfaces.events.badgeSecret')}
                           </span>
                         )}
                       </div>
                     </div>

                     {poll.status === 'ACTIVE' && renderTimerProgress(poll)}
                     <h3 className="text-xl sm:text-2xl font-black text-stone-900 mb-3 leading-tight tracking-tight">{poll.title}</h3>
                     {poll.description && (
                       <p className="text-xs font-bold text-stone-500 mb-6 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-100 shadow-inner">
                         {poll.description}
                       </p>
                     )}
                   </div>

                   {/* VOTING SECTION — EVENTS P1 shapes */}
                   <div className="space-y-3 mt-auto">
                     {phase === 'scheduled' ? (
                       <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-center shadow-inner">
                         <CalendarClock size={16} className="mx-auto text-blue-500 mb-1.5" />
                         <p className="text-xs font-bold text-blue-900">
                           {t('surfaces.events.opensOnLine').replace('{date}', new Date(poll.opensAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))}
                         </p>
                         <p className="text-[10px] font-bold text-stone-500 mt-1.5 leading-relaxed">
                           {t('surfaces.events.scheduleNote')}
                         </p>
                       </div>
                     ) : kind === 'text' ? (
                       poll.status === 'ACTIVE' && !iVoted ? (
                         <div className="space-y-3">
                           <p className="text-[11px] font-bold text-stone-500 leading-relaxed flex items-start gap-1.5">
                             <MessageSquare size={13} className="shrink-0 mt-0.5 text-saffron-500" />
                             {t('surfaces.events.textNote')}
                           </p>
                           <textarea
                             rows={3}
                             maxLength={280}
                             value={textDraft[poll.id] || ''}
                             onChange={(e) => setTextDraft(prev => ({ ...prev, [poll.id]: e.target.value }))}
                             placeholder={t('surfaces.events.textPlaceholder')}
                             className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all resize-none shadow-sm"
                           />
                           <button
                             onClick={() => handleVoteText(poll.id)}
                             disabled={!(textDraft[poll.id] || '').trim()}
                             className="w-full bg-stone-900 hover:bg-black disabled:opacity-40 text-white font-black py-3.5 rounded-xl text-[11px] uppercase tracking-widest transition-all shadow-md"
                           >
                             {t('surfaces.events.castVote')}
                           </button>
                         </div>
                       ) : (
                         <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 shadow-inner">
                           <p className="text-sm font-black text-stone-800">
                             {totalVotes} {totalVotes === 1 ? 'response' : 'responses'} recorded
                           </p>
                           {myBallot?.text && (
                             <p className="text-xs font-bold text-stone-500 mt-1.5">
                               {t('surfaces.events.responsesTitle')}: “{myBallot.text}”
                             </p>
                           )}
                           <p className="text-[10px] font-bold text-stone-600 mt-1.5 uppercase tracking-widest">
                             {t('surfaces.events.textNote')}
                           </p>
                         </div>
                       )
                     ) : poll.status === 'ACTIVE' && !iVoted ? (
                       kind === 'multi' ? (
                         <div className="space-y-3">
                           <p className="text-[11px] font-bold text-stone-500">{t('surfaces.events.multiHint')}</p>
                           {options.map((opt) => {
                             const picked = (multiPick[poll.id] || []).includes(opt.id);
                             return (
                               <button
                                 key={opt.id}
                                 onClick={() => toggleMultiPick(poll.id, opt.id)}
                                 aria-pressed={picked}
                                 className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center ${picked ? 'border-saffron-500 bg-saffron-50/60' : 'border-stone-100 hover:border-saffron-300'}`}
                               >
                                 <span className="text-sm font-black text-stone-700">{opt.text}</span>
                                 <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${picked ? 'bg-saffron-500 border-saffron-500 text-white' : 'border-stone-300'}`}>
                                   {picked && <CheckCircle2 size={13} />}
                                 </span>
                               </button>
                             );
                           })}
                           {poll.allowAbstain === true && (
                             <button
                               onClick={() => handleAbstain(poll)}
                               className="w-full text-left p-4 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-400 transition-all flex justify-between items-center min-h-[44px]"
                             >
                               <span className="text-sm font-black text-stone-500">{t('surfaces.events.abstainOption')}</span>
                               <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{t('surfaces.events.abstainStandAside')}</span>
                             </button>
                           )}
                           <button
                             onClick={() => handleVoteMulti(poll.id)}
                             disabled={(multiPick[poll.id] || []).length === 0}
                             className="w-full bg-stone-900 hover:bg-black disabled:opacity-40 text-white font-black py-3.5 rounded-xl text-[11px] uppercase tracking-widest transition-all shadow-md"
                           >
                             {t('surfaces.events.castVote')}
                           </button>
                         </div>
                       ) : (
                         <>
                         {options.map((opt) => (
                           <button
                             key={opt.id}
                             onClick={() => handleVote(poll.id, opt.id)}
                             className="w-full text-left p-4 rounded-xl border-2 border-stone-100 hover:border-saffron-500 hover:bg-saffron-50/50 hover:shadow-sm transition-all flex justify-between items-center group/btn"
                           >
                             <span className="text-sm font-black text-stone-700 group-hover/btn:text-saffron-500 transition-colors">{opt.text}</span>
                             <div className="w-5 h-5 rounded-full border-2 border-stone-300 group-hover/btn:border-saffron-500 transition-colors"></div>
                           </button>
                         ))}
                         {poll.allowAbstain === true && (
                           <button
                             onClick={() => handleAbstain(poll)}
                             className="w-full text-left p-4 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-400 hover:bg-stone-50/50 transition-all flex justify-between items-center min-h-[44px]"
                           >
                             <span className="text-sm font-black text-stone-500">{t('surfaces.events.abstainOption')}</span>
                             <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{t('surfaces.events.abstainStandAside')}</span>
                           </button>
                         )}
                         </>
                       )
                     ) : showResults ? (
                       <>
                       {options.map((opt) => {
                         const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                         const isMyChoice = kind === 'multi' ? (myBallot?.optionIds || []).includes(opt.id) : myVote === opt.id;
                         const isWinner = winnerIds.includes(opt.id);
                         return (
                           <div key={opt.id} className="relative w-full bg-stone-50 border border-stone-100 rounded-xl overflow-hidden shadow-sm">
                             <div
                               className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out opacity-80 ${isWinner ? 'bg-green-200 border-r-4 border-green-500' : isMyChoice ? 'bg-saffron-200 border-r-4 border-saffron-500' : 'bg-stone-200 border-r-4 border-stone-300'}`}
                               style={{ width: `${percentage}%` }}
                             ></div>
                             <div className="relative z-10 p-4 flex justify-between items-center">
                               <div className="flex items-center gap-2">
                                 <span className={`text-sm font-black ${isWinner ? 'text-green-900' : isMyChoice ? 'text-saffron-900' : 'text-stone-800'}`}>
                                   {opt.text}
                                 </span>
                                 {isMyChoice && (
                                   <span className="bg-saffron-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm">Your Vote</span>
                                 )}
                                 {isWinner && (
                                   <span className="bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm flex items-center gap-1"><Award size={12}/> Winner</span>
                                 )}
                               </div>
                               <div className="text-right">
                                 <span className={`text-sm font-black ${isWinner ? 'text-green-800' : isMyChoice ? 'text-saffron-800' : 'text-stone-700'}`}>{percentage}%</span>
                                 <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mt-0.5">{opt.votes} Votes</p>
                               </div>
                             </div>
                           </div>
                         );
                       })}
                       {/* P2b: the abstention row — counted in
                           turnout, never a candidate: no bar race,
                           just the count, on its own line. (Legacy
                           polls render theirs as an option row
                           above, from the map.) */}
                       {poll.allowAbstain === true && abstainCount > 0 && (
                         <div className="w-full bg-stone-50 border border-dashed border-stone-200 rounded-xl p-4 flex justify-between items-center">
                           <span className="flex items-center gap-2">
                             <span className="text-sm font-black text-stone-600">{t('surfaces.events.abstainOption')}</span>
                             {myAbstain && (
                               <span className="bg-saffron-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm">Your Vote</span>
                             )}
                           </span>
                           <span className="text-right">
                             <span className="text-sm font-black text-stone-600">{totalVotes > 0 ? Math.round((abstainCount / totalVotes) * 100) : 0}%</span>
                             <span className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest mt-0.5">{abstainCount} Votes</span>
                           </span>
                         </div>
                       )}
                       </>
                     ) : (
                       <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 text-center shadow-inner">
                         <Lock size={16} className="mx-auto text-stone-600 mb-1.5" />
                         <p className="text-xs font-bold text-stone-500">
                           {visRule === 'committee'
                             ? t('surfaces.events.resultsHiddenCommittee')
                             : visRule === 'afterClose'
                               ? t('surfaces.events.resultsHiddenClose')
                               : t('surfaces.events.resultsHiddenVote')}
                         </p>
                         {iVoted && (
                           <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mt-1.5 flex items-center justify-center gap-1">
                             <CheckCircle2 size={12}/> Your vote is recorded
                           </p>
                         )}
                       </div>
                     )}
                   </div>


                   {/* POLLS P1 — the recorded verdict of a Decision
                       poll: what the house decided, and the turnout
                       it was decided on. Read from the stored
                       outcome — never re-derived at render. */}
                   {poll.status === 'CONCLUDED' && cls === 'decision' && storedOutcome?.verdict && showResults && (
                     <div className="mt-5 bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                       <Award size={20} className="text-amber-600 shrink-0"/>
                       <div>
                         <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1.5">
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
                     <div className="mt-5 bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                       <MessageSquare size={20} className="text-blue-500 shrink-0"/>
                       <div>
                         <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1.5">Official Committee Decision</p>
                         <p className="text-xs font-bold text-blue-900 leading-relaxed">{poll.adminNote}</p>
                       </div>
                     </div>
                   )}

                   <div className="mt-6 pt-5 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                     <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1.5 w-full sm:w-auto bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-100">
                       <CheckCircle2 size={14} className="text-green-500"/> {totalVotes} Total Votes
                     </p>

                     <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
                       {poll.status === 'CONCLUDED' && (
                         <button onClick={() => handleDownloadPDF(poll)} className="flex-1 sm:flex-none bg-white hover:bg-red-50 hover:text-red-600 border border-stone-200 hover:border-red-200 text-stone-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm hover:shadow-md">
                           <FileText size={14}/> {t('surfaces.events.certificateBtn')}
                         </button>
                       )}

                       {isManagerOrAdmin && (
                         <>
                           <button onClick={() => openAudit(poll)} className="flex-1 sm:flex-none bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm hover:shadow-md" title="View the ballot audit">
                             <ListChecks size={14}/> Audit
                           </button>

                           {poll.status === 'ACTIVE' && pollIsEditable(poll, Date.now()) && (
                             <button onClick={() => openEditPoll(poll)} className="flex-1 sm:flex-none bg-white hover:bg-stone-800 hover:text-white text-stone-700 border border-stone-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm hover:shadow-md" title="Edit — allowed only before the first vote">
                               <FileText size={14}/> {t('surfaces.events.editPoll')}
                             </button>
                           )}
                           {poll.status === 'ACTIVE' && (
                             <>
                               {phase === 'open' && (
                                 <>
                                   <button onClick={() => handleSendReminder(poll)} className="flex-1 sm:flex-none bg-saffron-50 hover:bg-saffron-600 hover:text-white text-saffron-600 border border-saffron-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm hover:shadow-md" title="Remind members who have not voted — their own app checks their ballot privately">
                                     <BellRing size={14}/> Remind
                                   </button>
                                   <button onClick={() => setWaPollId(waPollId === poll.id ? null : poll.id)} aria-expanded={waPollId === poll.id} className="flex-1 sm:flex-none bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm hover:shadow-md" title={t('surfaces.events.pollWaTitle')}>
                                     <MessageSquare size={14}/> {t('surfaces.events.pollWaBtn')}
                                   </button>
                                 </>
                               )}
                               <button onClick={() => { setConcludeData({ id: poll.id, title: poll.title, note: '' }); setShowConcludeModal(true); }} className="flex-1 sm:flex-none bg-stone-100 hover:bg-stone-800 hover:text-white text-stone-600 border border-stone-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm hover:shadow-md">
                                 <Lock size={14}/> Conclude
                               </button>
                             </>
                           )}
                           {/* P2b: save this poll's shape as a template,
                               and re-run it when it carries a
                               recurrence mark. */}
                           <button onClick={() => { setTemplateSavePoll(poll); setTemplateForm({ name: poll.title || '', recurrence: pollRecurrence(poll.recurrence) }); }} className="flex-1 sm:flex-none bg-white hover:bg-stone-800 hover:text-white text-stone-700 border border-stone-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm hover:shadow-md" title={t('surfaces.events.saveAsTemplateBtn')}>
                             <Save size={14}/> {t('surfaces.events.saveAsTemplateBtn')}
                           </button>
                           {pollRecurrence(poll.recurrence) !== 'none' && (
                             <button onClick={() => handleRerunPoll(poll)} className="flex-1 sm:flex-none bg-white hover:bg-stone-800 hover:text-white text-stone-700 border border-stone-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm hover:shadow-md" title={t('surfaces.events.rerunNote')}>
                               <Repeat size={14}/> {t('surfaces.events.rerunBtn')}
                             </button>
                           )}
                           {pollTotalVotes(poll) === 0 && (
                             <button onClick={() => handleDeletePoll(poll)} className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 p-2.5 rounded-xl transition-all flex justify-center items-center shadow-sm hover:shadow-md" title="Delete (no votes cast yet)">
                               <Trash2 size={16}/>
                             </button>
                           )}
                           {poll.status === 'ACTIVE' && pollTotalVotes(poll) > 0 && (
                             <span className="w-full text-center text-[9px] font-bold text-stone-600 uppercase tracking-widest pt-1">
                               {t('surfaces.events.editLockedNote')}
                             </span>
                           )}
                         </>
                       )}
                     </div>
                   </div>

                   {/* POLLS P2a — the WhatsApp reminder pack for this
                       poll: composed from the poll's real data, sent
                       from the organiser's own WhatsApp. */}
                   {isManagerOrAdmin && poll.status === 'ACTIVE' && waPollId === poll.id && (
                     <div className="mt-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 sm:p-5">
                       <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1.5">
                         {t('surfaces.events.pollWaTitle')}
                       </p>
                       <p className="text-[11px] font-bold text-stone-500 leading-relaxed mb-2">
                         {t('surfaces.events.pollWaNote')}
                       </p>
                       <div className="rounded-xl bg-white border border-emerald-200 px-3 py-2 mb-3">
                         <span className="text-xs font-bold text-emerald-800">
                           {t('surfaces.events.shareOwnWhatsApp')}
                         </span>
                       </div>
                       <p className="text-sm font-bold text-stone-700 leading-relaxed bg-white border border-stone-100 rounded-xl p-4 whitespace-pre-wrap shadow-inner">
                         {pollWaMessage(poll)}
                       </p>
                       <div className="flex flex-wrap gap-2 mt-3">
                         <button
                           onClick={() => window.open(whatsAppUrl(pollWaMessage(poll)), '_blank', 'noopener')}
                           className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm min-h-[44px]"
                         >
                           <MessageSquare size={14}/> WhatsApp
                         </button>
                         <button
                           onClick={() => void copyWaMessage(poll)}
                           className="flex-1 sm:flex-none bg-white hover:bg-stone-800 hover:text-white text-stone-700 border border-stone-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-1.5 shadow-sm min-h-[44px]"
                         >
                           <FileText size={14}/> {waCopied ? '✓' : 'Copy'}
                         </button>
                       </div>
                     </div>
                   )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-16 text-stone-600 font-bold bg-white rounded-3xl border border-dashed border-stone-300 shadow-sm flex flex-col items-center justify-center h-64">
            <BarChart2 size={48} className="mx-auto mb-4 opacity-30 text-saffron-500" />
            <p className="text-lg sm:text-xl font-black text-stone-900 mb-2">No {activeTab.toLowerCase()} polls available.</p>
            <p className="text-[10px] sm:text-xs uppercase tracking-widest text-stone-500">
              {isManagerOrAdmin ? "Click 'Launch Poll' to start a community vote." : "Wait for the committee to announce a new vote."}
            </p>
          </div>
        )}
      </div>
      
      {/* FOOTER CREDIT */}
      <div className="pt-8 pb-4 flex flex-col items-center justify-center text-center opacity-70 border-t border-stone-200 mt-auto shrink-0">
         <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 mb-1">
           Made with <Heart size={12} className="text-red-500 fill-current"/> for <span className="font-black text-saffron-500">Dharmic institutions</span>
         </div>
         <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">© {new Date().getFullYear()} Sanatani Bandhan. Enterprise Edition.</p>
      </div>

      {showCreateModal && createPortal(
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 pt-safe pb-safe">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 fade-in border-t-4 border-saffron-500 ring-1 ring-white/20 max-h-[90vh] flex flex-col">
             <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-4 shrink-0">
               <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                 <BarChart2 className="text-saffron-500" size={24}/> Launch New Poll
               </h3>
               <button onClick={() => setShowCreateModal(false)} className="bg-stone-100 hover:bg-stone-200 p-2.5 rounded-full text-stone-500 transition-colors shadow-sm"><X size={16}/></button>
             </div>

             <div className="overflow-y-auto pr-2 scrollbar-hide pb-4">
               <form onSubmit={(e) => handleCreatePoll(e, 'launch')} className="space-y-6">
                 {/* POLLS NEXT-LEVEL P2b — the workspace's templates:
                     one tap fills this form from a saved shape. A
                     recurring template also offers the re-run, with
                     the next window suggested from its last round. */}
                 {templates.length > 0 && (
                   <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 shadow-inner">
                     <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                       <Save size={12}/> {t('surfaces.events.templatesTitle')}
                     </p>
                     <div className="space-y-2">
                       {templates.map(tpl => (
                         <div key={tpl.id} className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2.5 shadow-sm">
                           <span className="flex-1 min-w-0">
                             <span className="block text-xs font-black text-stone-800 truncate">{tpl.name}</span>
                             <span className="block text-[10px] font-bold text-stone-500 truncate">{tpl.title}</span>
                           </span>
                           {tpl.recurrence !== 'none' && (
                             <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1 shrink-0">
                               <Repeat size={10}/> {tpl.recurrence === 'monthly' ? t('surfaces.events.recurrenceMonthlyOpt') : tpl.recurrence === 'quarterly' ? t('surfaces.events.recurrenceQuarterlyOpt') : t('surfaces.events.recurrenceYearlyOpt')}
                             </span>
                           )}
                           <button type="button" onClick={() => handleUseTemplate(tpl, false)} className="shrink-0 bg-stone-900 hover:bg-black text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest min-h-[36px]">
                             {t('surfaces.events.templateUseBtn')}
                           </button>
                           {tpl.recurrence !== 'none' && (
                             <button type="button" onClick={() => handleUseTemplate(tpl, true)} className="shrink-0 bg-white hover:bg-stone-800 hover:text-white text-stone-700 border border-stone-300 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest min-h-[36px]" title={t('surfaces.events.rerunNote')}>
                               {t('surfaces.events.rerunBtn')}
                             </button>
                           )}
                           <button type="button" onClick={() => handleDeleteTemplate(tpl)} className="shrink-0 p-2 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100 min-h-[36px]" title={t('surfaces.events.templateDeleteBtn')}>
                             <Trash2 size={13}/>
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 <div>
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">Poll Question / Title *</label>
                   <input 
                     type="text" required value={pollForm.title} onChange={e=>setPollForm({...pollForm, title: e.target.value})} 
                     className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm" 
                     placeholder="e.g. What color should we paint the new Mandir gates?" 
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">Description / Context (Optional)</label>
                   <textarea 
                     rows={2} value={pollForm.description} onChange={e=>setPollForm({...pollForm, description: e.target.value})} 
                     className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 focus:ring-4 focus:ring-saffron-50 outline-none transition-all resize-none shadow-sm" 
                     placeholder="Provide extra details to help voters decide..."
                   ></textarea>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><CalendarDays size={12}/> End Date *</label>
                     <input type="date" required value={pollForm.endDate} onChange={e=>setPollForm({...pollForm, endDate: e.target.value})} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm text-stone-700 cursor-pointer" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock size={12}/> Time (Optional)</label>
                     <input type="time" value={pollForm.endTime} onChange={e=>setPollForm({...pollForm, endTime: e.target.value})} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm text-stone-700 cursor-pointer" />
                   </div>
                 </div>
                 {/* POLLS NEXT-LEVEL P2b — the scheduled opening.
                     Honest by construction: the note says plainly
                     that the app applies the times when it opens —
                     there is no server clock behind this. */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><CalendarClock size={12}/> {t('surfaces.events.scheduleOpensLabel')}</label>
                     <input type="date" value={pollForm.opensDate} onChange={e=>setPollForm({...pollForm, opensDate: e.target.value})} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm text-stone-700 cursor-pointer" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock size={12}/> Time (Optional)</label>
                     <input type="time" value={pollForm.opensTime} onChange={e=>setPollForm({...pollForm, opensTime: e.target.value})} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm text-stone-700 cursor-pointer" />
                   </div>
                 </div>
                 <p className="text-[11px] font-bold text-stone-600 leading-relaxed -mt-2">{t('surfaces.events.scheduleNote')}</p>
                 <div>
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><ShieldCheck size={12}/> Voting Audience</label>
                   <select
                     value={pollForm.targetAudience} onChange={e=>setPollForm({...pollForm, targetAudience: e.target.value})}
                     className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                   >
                     <option value="ALL_MEMBERS">Public (All Devotees & Members)</option>
                     <option value="MANAGERS">Internal (Only Admins & Managers)</option>
                   </select>
                 </div>

                 {/* POLLS NEXT-LEVEL P1 — the class, and for Decision
                     polls the standing, the secrecy choice and the
                     two marks. All of it is labelled BEFORE the first
                     vote and frozen at launch, like the shape. */}
                 <div>
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Award size={12}/> {t('surfaces.events.classLabel')}</label>
                   <select
                     value={pollForm.pollClass} onChange={e=>setPollForm({...pollForm, pollClass: e.target.value as typeof pollForm.pollClass})}
                     className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                   >
                     <option value="pulse">{t('surfaces.events.classPulse')}</option>
                     <option value="decision">{t('surfaces.events.classDecision')}</option>
                   </select>
                   {pollForm.pollClass === 'pulse' && (
                     <p className="text-[11px] font-bold text-stone-600 mt-2 leading-relaxed">{t('surfaces.events.classPulseNote')}</p>
                   )}
                 </div>

                 {pollForm.pollClass === 'decision' && (
                   <>
                     <div>
                       <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><ShieldCheck size={12}/> {t('surfaces.events.bindingLabel')}</label>
                       <select
                         value={pollForm.binding ? 'binding' : 'advisory'} onChange={e=>setPollForm({...pollForm, binding: e.target.value === 'binding'})}
                         className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                       >
                         <option value="advisory">{t('surfaces.events.bindingAdvisory')}</option>
                         <option value="binding">{t('surfaces.events.bindingBinding')}</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Lock size={12}/> {t('surfaces.events.ballotLabel')}</label>
                       {pollForm.targetAudience === 'MANAGERS' || pollForm.kind === 'text' ? (
                         <p className="text-[11px] font-bold text-stone-600 leading-relaxed bg-stone-50 border border-stone-200 rounded-xl p-4">
                           {pollForm.targetAudience === 'MANAGERS' ? t('surfaces.events.ballotNamedFixed') : t('surfaces.events.textNote')}
                         </p>
                       ) : (
                         <select
                           value={pollForm.ballot} onChange={e=>setPollForm({...pollForm, ballot: e.target.value as typeof pollForm.ballot})}
                           className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                         >
                           <option value="secret">{t('surfaces.events.ballotSecret')}</option>
                           <option value="named">{t('surfaces.events.ballotNamed')}</option>
                         </select>
                       )}
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{t('surfaces.events.quorumLabel')}</label>
                         <input
                           type="number" min={0} max={100} step={1}
                           value={pollForm.quorumPct}
                           onChange={e=>setPollForm({...pollForm, quorumPct: Number(e.target.value)})}
                           className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm"
                         />
                       </div>
                       <div>
                         <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{t('surfaces.events.passLabel')}</label>
                         <input
                           type="number" min={0} max={100} step={1}
                           value={pollForm.passPct}
                           onChange={e=>setPollForm({...pollForm, passPct: Number(e.target.value)})}
                           className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm"
                         />
                       </div>
                     </div>
                     <p className="text-[11px] font-bold text-stone-600 leading-relaxed">
                       {t('surfaces.events.electorateNote').replace('{count}', String(pollElectorateCount(devotees, pollForm.targetAudience)))}
                     </p>
                   </>
                 )}

                 {/* EVENTS P1 — the shape, chosen at launch and frozen after. */}
                 <div>
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><ListChecks size={12}/> {t('surfaces.events.kindLabel')}</label>
                   <select
                     value={pollForm.kind} onChange={e=>setPollForm({...pollForm, kind: e.target.value as typeof pollForm.kind})}
                     className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                   >
                     <option value="choice">{t('surfaces.events.kindChoice')}</option>
                     <option value="multi">{t('surfaces.events.kindMulti')}</option>
                     <option value="text">{t('surfaces.events.kindText')}</option>
                   </select>
                   {pollForm.kind === 'text' && (
                     <p className="text-[11px] font-bold text-stone-600 mt-2 leading-relaxed">{t('surfaces.events.textNote')}</p>
                   )}
                 </div>

                 {pollForm.kind !== 'text' && (
                   <label className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl p-4 cursor-pointer shadow-sm">
                     <input
                       type="checkbox"
                       checked={pollForm.abstain}
                       onChange={e=>setPollForm({...pollForm, abstain: e.target.checked})}
                       className="w-4 h-4 accent-orange-500"
                     />
                     <span className="text-sm font-bold text-stone-700">{t('surfaces.events.abstainToggle')}</span>
                   </label>
                 )}

                 {/* EVENTS P1 — the result rule, chosen at launch; the
                     rules freeze it once voting begins. */}
                 <div>
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><BarChart2 size={12}/> {t('surfaces.events.visibilityLabel')}</label>
                   <select
                     value={pollForm.resultVisibility} onChange={e=>setPollForm({...pollForm, resultVisibility: e.target.value as typeof pollForm.resultVisibility})}
                     className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                   >
                     <option value="live">{t('surfaces.events.visLive')}</option>
                     <option value="afterVote">{t('surfaces.events.visAfterVote')}</option>
                     <option value="afterClose">{t('surfaces.events.visAfterClose')}</option>
                     <option value="committee">{t('surfaces.events.visCommittee')}</option>
                   </select>
                 </div>

                 {/* POLLS NEXT-LEVEL P2b — the recurrence mark. It
                     promises a one-step re-run, never an automatic
                     opening (the note says so, in plain words). */}
                 <div>
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Repeat size={12}/> {t('surfaces.events.recurrenceLabel')}</label>
                   <select
                     value={pollForm.recurrence} onChange={e=>setPollForm({...pollForm, recurrence: e.target.value as PollRecurrence})}
                     className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                   >
                     <option value="none">{t('surfaces.events.recurrenceNoneOpt')}</option>
                     <option value="monthly">{t('surfaces.events.recurrenceMonthlyOpt')}</option>
                     <option value="quarterly">{t('surfaces.events.recurrenceQuarterlyOpt')}</option>
                     <option value="yearly">{t('surfaces.events.recurrenceYearlyOpt')}</option>
                   </select>
                   {pollForm.recurrence !== 'none' && (
                     <p className="text-[11px] font-bold text-stone-600 mt-2 leading-relaxed">{t('surfaces.events.rerunNote')}</p>
                   )}
                 </div>

                 {pollForm.kind !== 'text' && (
                 <div className="border-t border-stone-100 pt-5 mt-2">
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3">Voting Options *</label>
                   <div className="space-y-3">
                     {pollForm.options.map((opt, index) => (
                       <div key={index} className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-saffron-50 text-saffron-500 flex items-center justify-center text-[11px] font-black shrink-0 shadow-inner border border-saffron-100">{index + 1}</div>
                         <input 
                           type="text" required={index < 2} 
                           value={opt} onChange={(e) => handleOptionChange(index, e.target.value)}
                           className="w-full p-3.5 bg-white border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none shadow-sm transition-colors" 
                           placeholder={`Option ${index + 1}`}
                         />
                         {index >= 2 && (
                           <button type="button" onClick={() => handleRemoveOption(index)} className="p-3.5 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors shrink-0 shadow-sm border border-red-100">
                             <Trash2 size={16}/>
                           </button>
                         )}
                       </div>
                     ))}
                   </div>
                   {pollForm.options.length < POLL_MAX_OPTIONS && (
                     <button type="button" onClick={handleAddOption} className="mt-4 text-[10px] font-black text-saffron-500 uppercase tracking-widest flex items-center justify-center w-full gap-1 hover:text-saffron-700 transition-colors bg-saffron-50 hover:bg-saffron-100 p-3.5 rounded-xl border border-saffron-200 shadow-sm">
                       <Plus size={14}/> Add Another Option
                     </button>
                   )}
                 </div>
                 )}

                 <div className="pt-4 mt-2 border-t border-stone-100 space-y-3">
                   <button type="submit" disabled={submitting} className="w-full bg-stone-900 hover:bg-black text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                     {submitting ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18}/> LAUNCH POLL OFFICIALLY</>}
                   </button>
                   {/* P2b: the draft road — the same form, saved as
                       the committee's working paper instead. */}
                   <button type="button" onClick={() => handleCreatePoll(undefined, 'draft')} disabled={submitting} className="w-full bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-black py-4 rounded-2xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-sm transition-all disabled:opacity-50 min-h-[44px]">
                     <Save size={16}/> {t('surfaces.events.draftSaveBtn')}
                   </button>
                   <p className="text-[11px] font-bold text-stone-600 leading-relaxed text-center">{t('surfaces.events.draftNote')}</p>
                 </div>
               </form>
             </div>
          </div>
        </div>,
        document.body
      )}

      {editPoll && createPortal(
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 pt-safe pb-safe">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 fade-in border-t-4 border-saffron-500 ring-1 ring-white/20 max-h-[90vh] flex flex-col">
             <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-4 shrink-0">
               <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                 <FileText className="text-saffron-500" size={24}/> {t('surfaces.events.editPoll')}
               </h3>
               <button onClick={() => setEditPoll(null)} className="bg-stone-100 hover:bg-stone-200 p-2.5 rounded-full text-stone-500 transition-colors shadow-sm"><X size={16}/></button>
             </div>
             <div className="overflow-y-auto pr-2 scrollbar-hide pb-4">
               <form onSubmit={handleEditPoll} className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">Poll Question / Title *</label>
                   <input
                     type="text" required value={editForm.title} onChange={e=>setEditForm({...editForm, title: e.target.value})}
                     className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 focus:ring-4 focus:ring-saffron-50 outline-none transition-all shadow-sm"
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">Description / Context (Optional)</label>
                   <textarea
                     rows={2} value={editForm.description} onChange={e=>setEditForm({...editForm, description: e.target.value})}
                     className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 focus:ring-4 focus:ring-saffron-50 outline-none transition-all resize-none shadow-sm"
                   ></textarea>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><CalendarDays size={12}/> End Date *</label>
                     <input type="date" required={editPoll.status !== 'DRAFT'} value={editForm.endDate} onChange={e=>setEditForm({...editForm, endDate: e.target.value})} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm text-stone-700 cursor-pointer" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock size={12}/> Time (Optional)</label>
                     <input type="time" value={editForm.endTime} onChange={e=>setEditForm({...editForm, endTime: e.target.value})} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm text-stone-700 cursor-pointer" />
                   </div>
                 </div>
                 {/* P2b: the scheduled opening is editable under the
                     same zero-ballot law — clear the date to open
                     the poll as soon as it launches. */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><CalendarClock size={12}/> {t('surfaces.events.scheduleOpensLabel')}</label>
                     <input type="date" value={editForm.opensDate} onChange={e=>setEditForm({...editForm, opensDate: e.target.value})} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm text-stone-700 cursor-pointer" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock size={12}/> Time (Optional)</label>
                     <input type="time" value={editForm.opensTime} onChange={e=>setEditForm({...editForm, opensTime: e.target.value})} className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm text-stone-700 cursor-pointer" />
                   </div>
                 </div>
                 {pollKind(editPoll) !== 'text' && (
                   <label className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl p-4 cursor-pointer shadow-sm">
                     <input
                       type="checkbox"
                       checked={editForm.abstain}
                       onChange={e=>setEditForm({...editForm, abstain: e.target.checked})}
                       className="w-4 h-4 accent-orange-500"
                     />
                     <span className="text-sm font-bold text-stone-700">{t('surfaces.events.abstainToggle')}</span>
                   </label>
                 )}
                 {pollKind(editPoll) !== 'text' && (
                   <div>
                     <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3">Voting Options *</label>
                     <div className="space-y-3">
                       {editForm.options.map((opt, index) => (
                         <div key={opt.id} className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-saffron-50 text-saffron-500 flex items-center justify-center text-[11px] font-black shrink-0 shadow-inner border border-saffron-100">{index + 1}</div>
                           <input
                             type="text" required
                             value={opt.text}
                             onChange={(e) => setEditForm(prev => ({ ...prev, options: prev.options.map((o, i) => i === index ? { ...o, text: e.target.value } : o) }))}
                             className="w-full p-3.5 bg-white border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none shadow-sm transition-colors"
                           />
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 <div>
                   <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><BarChart2 size={12}/> {t('surfaces.events.visibilityLabel')}</label>
                   <select
                     value={editForm.resultVisibility} onChange={e=>setEditForm({...editForm, resultVisibility: e.target.value as typeof editForm.resultVisibility})}
                     className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                   >
                     <option value="live">{t('surfaces.events.visLive')}</option>
                     <option value="afterVote">{t('surfaces.events.visAfterVote')}</option>
                     <option value="afterClose">{t('surfaces.events.visAfterClose')}</option>
                     <option value="committee">{t('surfaces.events.visCommittee')}</option>
                   </select>
                 </div>
                 <div className="pt-4 mt-2 border-t border-stone-100">
                   <button type="submit" disabled={submitting} className="w-full bg-stone-900 hover:bg-black text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                     {submitting ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18}/> SAVE CHANGES</>}
                   </button>
                 </div>
               </form>
             </div>
          </div>
        </div>,
        document.body
      )}

      {showConcludeModal && createPortal(
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in zoom-in-95 ring-1 ring-white/20 border-t-4 border-stone-800 text-center sm:text-left">
            <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-4">
              <h3 className="text-xl font-black text-stone-900 flex items-center gap-2 tracking-tight">
                 <Lock className="text-stone-700" size={24}/> Conclude Poll
              </h3>
              <button onClick={() => setShowConcludeModal(false)} className="bg-stone-100 hover:bg-stone-200 p-2.5 rounded-full text-stone-500 transition-colors shadow-sm"><X size={16}/></button>
            </div>
            <form onSubmit={handleConcludePoll}>
               <p className="text-xs font-bold text-stone-500 mb-5 leading-relaxed">
                 You are concluding <strong className="text-stone-800">"{concludeData.title}"</strong>. This will permanently lock voting.
               </p>
               <p className="text-[11px] font-bold text-stone-500 mb-5 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                 {t('surfaces.events.concludeOutcomeNote')}
               </p>
               <div className="mb-8 text-left">
                 <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MessageSquare size={14}/> Official Committee Decision (Optional)</label>
                 <textarea rows={4} value={concludeData.note} onChange={e => setConcludeData({...concludeData, note: e.target.value})} className="w-full p-4 bg-blue-50/50 border border-blue-200 rounded-xl text-sm font-bold text-blue-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all resize-none shadow-sm" placeholder="e.g. Based on the majority vote, the committee will release the funds on Monday."></textarea>
               </div>
               <div className="flex gap-3">
                 <button type="button" onClick={() => setShowConcludeModal(false)} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-sm">{t('actions.cancel') || 'Cancel'}</button>
                 <button type="submit" disabled={submitting} className="flex-[2] font-black py-4 rounded-xl text-xs uppercase tracking-widest text-white shadow-md transition-all hover:-translate-y-0.5 bg-stone-900 hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2">
                   {submitting ? <Loader2 size={16} className="animate-spin"/> : <><Lock size={16}/> CONCLUDE & PUBLISH</>}
                 </button>
               </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* POLLS NEXT-LEVEL P2b — save-as-template: the shape only.
          No votes, no results, no outcome ever ride into a
          template — the dialog says what a template is. */}
      {templateSavePoll && createPortal(
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in zoom-in-95 ring-1 ring-white/20 border-t-4 border-saffron-500">
            <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-4">
              <h3 className="text-xl font-black text-stone-900 flex items-center gap-2 tracking-tight">
                 <Save className="text-saffron-500" size={24}/> {t('surfaces.events.saveAsTemplateBtn')}
              </h3>
              <button onClick={() => setTemplateSavePoll(null)} className="bg-stone-100 hover:bg-stone-200 p-2.5 rounded-full text-stone-500 transition-colors shadow-sm"><X size={16}/></button>
            </div>
            <div className="space-y-5">
              <p className="text-xs font-bold text-stone-500 leading-relaxed">
                {t('surfaces.events.templateShapeNote')}
              </p>
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{t('surfaces.events.templateNameLabel')}</label>
                <input
                  type="text" value={templateForm.name} onChange={e=>setTemplateForm({...templateForm, name: e.target.value})}
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Repeat size={12}/> {t('surfaces.events.recurrenceLabel')}</label>
                <select
                  value={templateForm.recurrence} onChange={e=>setTemplateForm({...templateForm, recurrence: e.target.value as PollRecurrence})}
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:bg-white focus:border-saffron-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="none">{t('surfaces.events.recurrenceNoneOpt')}</option>
                  <option value="monthly">{t('surfaces.events.recurrenceMonthlyOpt')}</option>
                  <option value="quarterly">{t('surfaces.events.recurrenceQuarterlyOpt')}</option>
                  <option value="yearly">{t('surfaces.events.recurrenceYearlyOpt')}</option>
                </select>
                {templateForm.recurrence !== 'none' && (
                  <p className="text-[11px] font-bold text-stone-600 mt-2 leading-relaxed">{t('surfaces.events.rerunNote')}</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setTemplateSavePoll(null)} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-sm min-h-[44px]">{t('actions.cancel') || 'Cancel'}</button>
                <button type="button" onClick={handleSaveTemplate} disabled={submitting} className="flex-[2] font-black py-4 rounded-xl text-xs uppercase tracking-widest text-white shadow-md transition-all hover:-translate-y-0.5 bg-stone-900 hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]">
                  {submitting ? <Loader2 size={16} className="animate-spin"/> : <><Save size={16}/> {t('surfaces.events.saveAsTemplateBtn')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {auditPoll && createPortal(
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 pt-safe pb-safe">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-t-4 border-blue-500 ring-1 ring-white/20 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/80 shrink-0">
              <div>
                <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                  <ListChecks className="text-blue-600" size={24}/> Ballot Audit
                </h3>
                <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mt-1">
                  {pollBallotMode(auditPoll) === 'named'
                    ? 'Named ballots — this opening was recorded'
                    : 'Secret ballot — ballots are private; counts only'}
                </p>
              </div>
              <button onClick={() => setAuditPoll(null)} className="p-2.5 rounded-full hover:bg-stone-200 text-stone-600 hover:text-stone-700 transition-colors shadow-sm"><X size={16}/></button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-6 scrollbar-hide pb-12">
               <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Audit for Poll:</p>
                 <p className="text-sm font-black text-blue-900">{auditPoll.title}</p>
                 <p className="text-[10px] font-bold text-blue-700 mt-1">{pollTotalVotes(auditPoll)} total votes counted</p>
               </div>
               {pollBallotMode(auditPoll) !== 'named' && pollKind(auditPoll) !== 'text' && (
                 <p className="text-xs font-bold text-stone-500 leading-relaxed bg-stone-50 border border-stone-100 rounded-2xl p-4">
                   This is a secret ballot — each vote is stored under the voter's own account, and not even the committee can see who chose what. Only the counts below are visible.
                 </p>
               )}
               {pollKind(auditPoll) === 'text' && (
                 <div className="space-y-3">
                   <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                     {t('surfaces.events.responsesTitle')} ({auditTexts.length})
                   </p>
                   <p className="text-[11px] font-bold text-stone-600 leading-relaxed">
                     {t('surfaces.events.textNote')}
                   </p>
                   {auditTexts.length === 0 ? (
                     <p className="text-xs font-bold text-stone-600 italic">No responses yet.</p>
                   ) : (
                     auditTexts.map(row => {
                       const member = devotees.find(m => m.id === row.uid || (m as any).userId === row.uid);
                       const displayName = member ? ((member as any).name || (member as any).fullName || 'Member') : 'Member';
                       return (
                         <div key={row.uid} className="border border-stone-200 rounded-2xl p-4 bg-white shadow-sm">
                           <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">{displayName}</p>
                           <p className="text-sm font-bold text-stone-800 leading-relaxed">“{row.text}”</p>
                         </div>
                       );
                     })
                   )}
                 </div>
               )}
               {Object.keys(auditPoll.options || {}).map(optId => {
                  const opt = auditPoll.options[optId];
                  // Named ballots exist only where the poll is a
                  // named vote (committee polls by design; Decision
                  // polls by the creator's choice): the ballot box
                  // (keyed by firebase uid) plus any legacy
                  // pre-ballot-box votes (keyed by member id). Names
                  // only — phone numbers are never shown here.
                  const namedBallots = pollBallotMode(auditPoll) === 'named' && pollKind(auditPoll) !== 'text';
                  const ballotUids = namedBallots
                    ? Object.keys(auditBallots).filter(uid => (auditBallots[uid] || []).includes(optId))
                    : [];
                  const legacyUids = namedBallots
                    ? Object.keys(auditPoll.votedUsers || {}).filter(uid => auditPoll.votedUsers[uid] === optId && !ballotUids.includes(uid))
                    : [];
                  const voterKeys = [...ballotUids, ...legacyUids];
                  return (
                    <div key={optId} className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-stone-50 p-4 border-b border-stone-200 flex justify-between items-center">
                        <span className="text-sm font-black text-stone-800">{opt.text}</span>
                        <span className="text-[10px] font-black bg-white px-2.5 py-1 rounded-md border border-stone-200 text-stone-500 uppercase tracking-widest shadow-sm">{opt.votes} Votes</span>
                      </div>
                      {namedBallots && (
                        <div className="p-2 bg-white">
                          {voterKeys.length > 0 ? (
                            <div className="divide-y divide-stone-50">
                               {voterKeys.map(uid => {
                                 const member = devotees.find(m => m.id === uid || (m as any).userId === uid);
                                 const displayName = member ? ((member as any).name || (member as any).fullName || 'Member') : 'Member';
                                 return (
                                   <div key={uid} className="p-3 flex items-center justify-between hover:bg-stone-50 rounded-xl transition-colors group">
                                     <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                         {displayName.charAt(0).toUpperCase()}
                                       </div>
                                       <span className="text-sm font-bold text-stone-900">{displayName}</span>
                                     </div>
                                     <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Ballot recorded</span>
                                   </div>
                                 );
                               })}
                            </div>
                          ) : (
                            <p className="text-[10px] font-bold text-stone-600 p-4 text-center italic uppercase tracking-widest">No votes cast for this option yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
               })}
               {/* P2b: the abstentions of a NEW-model poll — their
                   own group, since abstain is no longer an option
                   row. (Legacy polls show theirs as the abstain
                   option row above.) Named polls name them here
                   like any ballot; secret polls show the count. */}
               {auditPoll.allowAbstain === true && (
                 <div className="border border-dashed border-stone-300 rounded-2xl overflow-hidden shadow-sm">
                   <div className="bg-stone-50 p-4 border-b border-stone-200 flex justify-between items-center">
                     <span className="text-sm font-black text-stone-600">{t('surfaces.events.abstainOption')}</span>
                     <span className="text-[10px] font-black bg-white px-2.5 py-1 rounded-md border border-stone-200 text-stone-500 uppercase tracking-widest shadow-sm">{pollAbstainVotes(auditPoll)} Votes</span>
                   </div>
                   {pollBallotMode(auditPoll) === 'named' && pollKind(auditPoll) !== 'text' && (
                     <div className="p-2 bg-white">
                       {Object.keys(auditBallots).filter(uid => (auditBallots[uid] || []).includes(ABSTAIN_OPTION_ID)).length > 0 ? (
                         <div className="divide-y divide-stone-50">
                           {Object.keys(auditBallots).filter(uid => (auditBallots[uid] || []).includes(ABSTAIN_OPTION_ID)).map(uid => {
                             const member = devotees.find(m => m.id === uid || (m as any).userId === uid);
                             const displayName = member ? ((member as any).name || (member as any).fullName || 'Member') : 'Member';
                             return (
                               <div key={uid} className="p-3 flex items-center justify-between hover:bg-stone-50 rounded-xl transition-colors">
                                 <span className="text-sm font-bold text-stone-900">{displayName}</span>
                                 <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Ballot recorded</span>
                               </div>
                             );
                           })}
                         </div>
                       ) : (
                         <p className="text-[10px] font-bold text-stone-600 p-4 text-center italic uppercase tracking-widest">No abstentions yet.</p>
                       )}
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
