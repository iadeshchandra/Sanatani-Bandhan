import React, { useMemo, useState } from 'react';
import { BookOpen, Camera, FileSpreadsheet, PenLine } from 'lucide-react';
import type { Nandi } from '../goshala/types';
import type { BahiTarget, BatchActor, BatchCommitSummary, ImportBatch } from './types';
import { TARGET_EMOJI, canApproveAnyBahi, canApproveBahi, canEnterBahi } from './types';
import { bk, bkLangOf, type BkLang } from './copy';
import {
  applyTransition, batchHasEnteredRows, createBatch, resolveActorName, useBahiKhata,
} from './bahikhataStore';
import { getCachedSanataniProfile } from '../solo/soloSession';
import { executeCommit } from './commit';
import { RegisterMode } from './RegisterMode';
import { VoiceEntryPanel } from './VoiceEntryPanel';
import { buildVoiceBatch, type ParsedVoiceDonation } from './voiceEntry';
import { CsvImport } from './CsvImport';
import { BatchReview } from './BatchReview';
import { ScanImport } from './scan/ScanImport';
import { createManifestRecorder, manifestHasWrites } from './commitManifest';
import { checkUndoGuards, executeUndo, type UndoResult } from './undo';
import { isClosedVocabField } from './scan/corrections';
import { learnPair, noteFieldOutcome } from './scan/registerProfile';
import { phoneKey } from './normalize';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva — the ONE door. Mounted from the Goshala desk       */
/* (herd), the People desk (members + donors) and the Treasury desk    */
/* (donors). First question is only "What are you entering?", then     */
/* "How?" — Register Mode or CSV in Phase 1; photo (Phase 2) and       */
/* voice (Phase 3) cards are shown honestly as coming, never faked.    */
/* ------------------------------------------------------------------ */

interface Props {
  /** Which targets this door offers (mount-scoped). */
  targets?: BahiTarget[];
  /** Existing herd for dedupe + tag sequence (Goshala mount). */
  existingHerd?: Nandi[];
  /** Herd commit sink (Goshala mount, from useGoshala). */
  herdCommitter?: (nandis: Nandi[]) => void;
  /** Herd removal sink (Goshala mount) — batch undo for herd rows.
   *  Absent = herd undo not offered in this mount. */
  herdRemover?: (ids: string[]) => void;
}

type View =
  | { kind: 'home' }
  | { kind: 'register'; batchId: string }
  | { kind: 'csv' }
  | { kind: 'scan' }
  | { kind: 'review'; batchId: string };

const TARGET_LABEL_KEY: Record<BahiTarget, 'targetHerd' | 'targetMembers' | 'targetDonors'> = {
  herd: 'targetHerd',
  members: 'targetMembers',
  donors: 'targetDonors',
};

const STATE_KEY: Record<ImportBatch['state'], 'stateDraft' | 'statePending' | 'stateApproved' | 'stateRejected' | 'stateCommitted' | 'stateUndone'> = {
  draft: 'stateDraft',
  pending: 'statePending',
  approved: 'stateApproved',
  rejected: 'stateRejected',
  committed: 'stateCommitted',
  undone: 'stateUndone',
};

export const BahiKhataDesk: React.FC<Props> = ({ targets, existingHerd, herdCommitter, herdRemover }) => {
  const offered = targets && targets.length ? targets : (['herd', 'members', 'donors'] as BahiTarget[]);
  const { activeWorkspace, currentUser, firebaseUser, effectiveRole } = useAuthWorkspace();
  const { devotees, addDevotee, updateDevotee, deleteDevotee, addTreasuryTransaction, treasury, donations } = useData();
  const { currentLang } = useLanguage();
  const { showToast } = useToast();
  const lang: BkLang = bkLangOf(currentLang);
  const ws = activeWorkspace.id;
  const store = useBahiKhata(ws);

  const [selectedTarget, setSelectedTarget] = useState<BahiTarget>(offered[0]);
  const [view, setView] = useState<View>({ kind: 'home' });

  const role = String(effectiveRole || currentUser?.role || '');
  // QUEUED #52 (audit D12): "Entered by" must be the actual signed-in
  // user. In an org session currentUser.name can be the auth layer's
  // generic placeholder ("Acharya / Trustee Administrator") — a title,
  // not a person — so resolve through the real identity chain and never
  // let a placeholder be stamped as a batch's author.
  const actor: BatchActor = useMemo(
    () => ({
      uid: firebaseUser?.uid || currentUser?.id || 'local-user',
      name: resolveActorName(
        [
          firebaseUser?.displayName,
          currentUser?.name,
          currentUser?.fullName,
          firebaseUser?.uid
            ? getCachedSanataniProfile(firebaseUser.uid)?.displayName
            : null,
        ],
        firebaseUser?.email
      ),
      role,
    }),
    [firebaseUser?.uid, firebaseUser?.displayName, firebaseUser?.email, currentUser?.id, currentUser?.name, currentUser?.fullName, role]
  );

  const canEnter = canEnterBahi(role);
  const herd = existingHerd || [];
  const picklists = useMemo(
    () => ({
      breeds: Array.from(new Set(herd.map((n) => n.breed).filter(Boolean))),
      gotras: Array.from(new Set(devotees.map((d) => d.gotra).filter(Boolean))),
    }),
    [herd, devotees]
  );

  // QUEUED #52 (audit D12): a fresh register batch lives ONLY in memory
  // until the sevadar enters the first row. Opening the form used to
  // persist a 0-row draft instantly — a volunteer who tapped "Type it",
  // looked, and left had silently created a batch in "My batches".
  // Creation is now an explicit act of entry: first row → persisted
  // (and from then on the draft autosaves exactly as before); backing
  // out with no rows discards nothing, because nothing was created.
  const [pendingBatch, setPendingBatch] = useState<ImportBatch | null>(null);

  const activeBatch =
    view.kind === 'register' || view.kind === 'review'
      ? pendingBatch && pendingBatch.id === view.batchId
        ? pendingBatch
        : store.batches.find((b) => b.id === view.batchId)
      : undefined;

  const startRegister = () => {
    const labelDefault =
      selectedTarget === 'herd' ? 'Gai khata — ' : selectedTarget === 'donors' ? 'Dan khata — ' : 'Sadasya khata — ';
    const batch = createBatch({
      workspaceId: ws,
      target: selectedTarget,
      source: 'register',
      label: labelDefault + new Date().toISOString().slice(0, 10),
      enteredBy: actor,
    });
    setPendingBatch(batch);
    setView({ kind: 'register', batchId: batch.id });
  };

  /** RegisterMode's update channel: routes a not-yet-persisted batch to
   *  memory until its first entered row makes it a real draft. */
  const handleRegisterUpdate = (b: ImportBatch) => {
    if (pendingBatch && b.id === pendingBatch.id) {
      if (batchHasEnteredRows(b)) {
        store.addBatch(b);
        setPendingBatch(null);
      } else {
        setPendingBatch(b);
      }
    } else {
      store.updateBatch(b);
    }
  };

  const handleSubmit = (batch: ImportBatch) => {
    const submitted = applyTransition(batch, 'submit', actor);
    // Submit is disabled at 0 rows, so a pending batch should never
    // arrive here — but if it does, persist it rather than lose it.
    if (pendingBatch && batch.id === pendingBatch.id) {
      store.addBatch(submitted);
      setPendingBatch(null);
    } else {
      store.updateBatch(submitted);
    }
    showToast(bk(lang, 'submittedToast'), 'success');
    setView({ kind: 'home' });
  };

  const handleCommit = (batch: ImportBatch): BatchCommitSummary => {
    const approved = applyTransition(batch, 'approve', actor);
    // Phase 2 trust system: record exactly what the commit writes,
    // so the batch can later be undone precisely (undo.ts).
    const recorder = createManifestRecorder(approved.id, actor);
    const summary = executeCommit(approved, {
      workspaceId: ws,
      existingDevotees: devotees,
      addDevotee,
      updateDevotee,
      addTreasuryTransaction,
      addNandi: herdCommitter ? (n) => herdCommitter([n]) : undefined,
      record: recorder.record,
    });
    const manifest = recorder.build();
    const committed = {
      ...applyTransition(approved, 'commit', actor),
      commitSummary: summary,
      ...(manifestHasWrites(manifest) ? { manifest } : {}),
    };
    store.updateBatch(committed);
    return summary;
  };

  /** Phase 2: precise batch undo. Guards run against LIVE records —
   *  anything that gained a life since import blocks its own
   *  reversal and is reported, never silently corrupted. The batch
   *  only becomes 'undone' when nothing blocked. */
  const handleUndo = (batch: ImportBatch): UndoResult | null => {
    if (!batch.manifest) return null;
    const resolved: string[] = [];
    for (const u of batch.manifest.createdUnresolved || []) {
      const byPhone = u.phone
        ? devotees.filter((d) => phoneKey(d.phone) === phoneKey(u.phone))
        : [];
      const pool = byPhone.length === 1
        ? byPhone
        : devotees.filter(
            (d) => (d.fullName || '').trim().toLowerCase() === u.fullName.trim().toLowerCase()
          );
      if (pool.length === 1) resolved.push(pool[0].id);
    }
    const guard = checkUndoGuards({
      manifest: batch.manifest,
      devotees: devotees.map((d) => ({ id: d.id, totalDonated: d.totalDonated })),
      herdIds: herd.map((n) => n.id),
      donationRefs: (donations || []).map((dn) => ({
        devoteeId: (dn as { devoteeId?: string }).devoteeId,
        donorId: (dn as { donorId?: string }).donorId,
      })),
      resolvedUnresolvedIds: resolved,
    });
    const result = executeUndo(batch, guard, {
      workspaceId: ws,
      removeNandi: herdRemover ? (id) => herdRemover([id]) : undefined,
      deleteDevotee,
      updateDevotee,
      addTreasuryTransaction,
      treasury: treasury || [],
    });
    if (result.blocked.length === 0) {
      store.updateBatch(applyTransition(batch, 'undo', actor));
    }
    return result;
  };

  /** The org's own word-lists per target — grown from its data, used
   *  by the scan validators, dictionary proposals and AI re-check. */
  const dictionariesFor = (target: BahiTarget): Record<string, string[]> => {
    if (target === 'herd') return { breed: picklists.breeds };
    return {
      gotra: picklists.gotras,
      address: Array.from(new Set(devotees.map((d) => d.address).filter(Boolean))) as string[],
    };
  };

  /** Persist a reviewer outcome onto the batch's register profile:
   *  field accept-rates + recurring raw→fixed pairs (closed vocabs). */
  const handleCellLearned = (batch: ImportBatch) => (
    field: string, readText: string, finalText: string, acceptedAsRead: boolean
  ) => {
    if (!batch.profileId) return;
    const prof = store.registerProfiles.find((p) => p.id === batch.profileId);
    if (!prof) return;
    let next = noteFieldOutcome(prof, field, acceptedAsRead);
    if (!acceptedAsRead && isClosedVocabField(batch.target, field)) {
      next = learnPair(next, field, readText, finalText);
    }
    if (next !== prof) store.updateProfile(next);
  };

  const openBatch = (batch: ImportBatch) => {
    if (batch.state === 'draft') setView({ kind: 'register', batchId: batch.id });
    else if (batch.state === 'rejected') {
      store.updateBatch(applyTransition(batch, 'reopen', actor));
      setView({ kind: 'register', batchId: batch.id });
    } else setView({ kind: 'review', batchId: batch.id });
  };

  /* ------------------------------ views ------------------------------ */

  if (view.kind === 'register' && activeBatch) {
    return (
      <RegisterMode
        batch={activeBatch}
        lang={lang}
        existingMembers={devotees}
        existingHerd={herd}
        picklists={picklists}
        actorUid={actor.uid}
        onUpdate={handleRegisterUpdate}
        onSubmit={handleSubmit}
        onBack={() => {
          // Leaving a never-persisted batch discards it silently — by
          // design (QUEUED #52): nothing was ever created.
          setPendingBatch(null);
          setView({ kind: 'home' });
        }}
      />
    );
  }

  if (view.kind === 'csv') {
    return (
      <CsvImport
        target={selectedTarget}
        lang={lang}
        workspaceId={ws}
        enteredBy={actor}
        existingMembers={devotees}
        existingHerd={herd}
        rememberedMap={store.data.columnMaps[selectedTarget]}
        onRememberMap={store.rememberColumnMap}
        onCreated={(b) => {
          store.addBatch(b);
          setView({ kind: 'review', batchId: b.id });
        }}
        onBack={() => setView({ kind: 'home' })}
      />
    );
  }

  if (view.kind === 'review' && activeBatch) {
    return (
      <BatchReview
        batch={activeBatch}
        lang={lang}
        actor={actor}
        canApprove={canApproveBahi(role, activeBatch.target)}
        existingMembers={devotees}
        existingHerd={herd}
        dictionaries={dictionariesFor(activeBatch.target)}
        profile={store.registerProfiles.find((p) => p.id === activeBatch.profileId) || null}
        onCellLearned={handleCellLearned(activeBatch)}
        onUndo={handleUndo}
        onUpdate={store.updateBatch}
        onCommit={handleCommit}
        onBack={() => setView({ kind: 'home' })}
      />
    );
  }

  if (view.kind === 'scan') {
    return (
      <ScanImport
        lang={lang}
        workspaceId={ws}
        actor={actor}
        target={selectedTarget}
        batches={store.batches}
        profiles={store.registerProfiles}
        existingMembers={devotees}
        existingHerd={herd}
        dictionaries={dictionariesFor(selectedTarget)}
        onAddBatch={store.addBatch}
        onUpdateBatch={store.updateBatch}
        onAddProfile={store.addProfile}
        onOpenReview={(batchId) => setView({ kind: 'review', batchId })}
        onBack={() => setView({ kind: 'home' })}
      />
    );
  }

  /* ------------------------------ home ------------------------------- */

  const myBatches = store.batches;
  const awaiting = myBatches.filter(
    (b) => b.state === 'pending' && canApproveBahi(role, b.target) && offered.includes(b.target)
  );
  const visibleBatches = myBatches.filter((b) => offered.includes(b.target));

  const modeCard =
    'flex items-center gap-3 w-full text-left min-h-[64px] px-4 py-3 rounded-2xl border-2 font-black text-base transition';

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-red-900 text-amber-50 rounded-3xl px-5 py-5 shadow-lg">
        <h2 className="text-2xl font-black flex items-center gap-2">
          <BookOpen className="w-7 h-7" /> {bk(lang, 'doorTitle')}
        </h2>
        <p className="text-sm text-amber-100/90 mt-1 max-w-2xl leading-relaxed">{bk(lang, 'doorSub')}</p>
      </div>

      {canEnter && (
        <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="font-black text-stone-900">{bk(lang, 'whatEntering')}</h3>
          {offered.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {offered.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTarget(t)}
                  className={`min-h-[52px] px-4 py-2.5 rounded-2xl border-2 font-black ${
                    selectedTarget === t
                      ? 'bg-amber-600 border-amber-700 text-white'
                      : 'bg-white border-stone-300 text-stone-700'
                  }`}
                >
                  {bk(lang, TARGET_LABEL_KEY[t])}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">{bk(lang, 'howEntering')}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <button type="button" onClick={startRegister} className={`${modeCard} bg-amber-600 border-amber-700 text-white hover:bg-amber-500`}>
              <PenLine className="w-6 h-6 shrink-0" /> {bk(lang, 'modeRegister')}
            </button>
            <button type="button" onClick={() => setView({ kind: 'csv' })} className={`${modeCard} bg-white border-stone-300 text-stone-800 hover:border-amber-400`}>
              <FileSpreadsheet className="w-6 h-6 shrink-0 text-emerald-600" /> {bk(lang, 'modeCsv')}
            </button>
            <button type="button" onClick={() => setView({ kind: 'scan' })} className={`${modeCard} bg-white border-stone-300 text-stone-800 hover:border-amber-400`}>
              <Camera className="w-6 h-6 shrink-0 text-amber-600" /> {bk(lang, 'modePhoto')}
            </button>
            {/* Blueprint D — voice entry: rendered ONLY where the
                browser offers speech recognition (the panel returns
                null otherwise — no fake affordance). A heard line
                opens the ordinary register review pre-filled; voice
                itself never commits. */}
            <VoiceEntryPanel
              lang={lang}
              cardClassName={modeCard}
              onHeard={(parsed: ParsedVoiceDonation) => {
                const batch = buildVoiceBatch({
                  workspaceId: ws,
                  enteredBy: actor,
                  label: bk(lang, 'voiceBatchLabel'),
                  parsed,
                });
                setPendingBatch(batch);
                setView({ kind: 'register', batchId: batch.id });
              }}
            />
          </div>
        </div>
      )}

      {awaiting.length > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-5 space-y-3">
          <h3 className="font-black text-emerald-900">🛎 {bk(lang, 'awaitingReview')} ({awaiting.length})</h3>
          {awaiting.map((b) => (
            <BatchListRow key={b.id} batch={b} lang={lang} onOpen={() => openBatch(b)} />
          ))}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm space-y-3">
        <h3 className="font-black text-stone-900">{bk(lang, 'myBatches')}</h3>
        {visibleBatches.length === 0 && (
          <p className="text-sm text-stone-500 leading-relaxed">{bk(lang, 'noBatches')}</p>
        )}
        {visibleBatches.map((b) => (
          <BatchListRow
            key={b.id}
            batch={b}
            lang={lang}
            onOpen={() => openBatch(b)}
            onDelete={
              b.state === 'draft' && (b.enteredBy.uid === actor.uid || canApproveAnyBahi(role))
                ? () => store.deleteBatch(b.id)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

const BatchListRow: React.FC<{
  batch: ImportBatch;
  lang: BkLang;
  onOpen: () => void;
  onDelete?: () => void;
}> = ({ batch, lang, onOpen, onDelete }) => (
  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
    <span className="text-xl">{TARGET_EMOJI[batch.target]}</span>
    <div className="flex-1 min-w-[160px]">
      <p className="font-bold text-stone-900 text-sm">{batch.label}</p>
      <p className="text-xs text-stone-500">
        {batch.rows.length} {bk(lang, 'rowsWord')} · {bk(lang, 'enteredBy')}: {batch.enteredBy.name}
        {batch.commitSummary && <> · ✓ {batch.commitSummary.added} {bk(lang, 'summaryAdded')}</>}
      </p>
    </div>
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
        batch.state === 'committed' ? 'bg-emerald-100 text-emerald-800'
        : batch.state === 'undone' ? 'bg-stone-300 text-stone-600'
        : batch.state === 'pending' ? 'bg-amber-100 text-amber-800'
        : batch.state === 'rejected' ? 'bg-rose-100 text-rose-800'
        : 'bg-stone-200 text-stone-700'
      }`}
    >
      {bk(lang, STATE_KEY[batch.state])}
    </span>
    <button type="button" onClick={onOpen} className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black">
      {batch.state === 'draft' || batch.state === 'rejected' ? bk(lang, 'continueBtn') : batch.state === 'pending' ? bk(lang, 'reviewBtn') : bk(lang, 'viewBtn')}
    </button>
    {onDelete && (
      <button type="button" onClick={onDelete} className="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-600">
        {bk(lang, 'deleteBtn')}
      </button>
    )}
  </div>
);
