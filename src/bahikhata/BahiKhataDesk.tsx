import React, { useMemo, useState } from 'react';
import { BookOpen, Camera, Mic, FileSpreadsheet, PenLine } from 'lucide-react';
import type { Nandi } from '../goshala/types';
import type { BahiTarget, BatchActor, BatchCommitSummary, ImportBatch } from './types';
import { TARGET_EMOJI, canApproveAnyBahi, canApproveBahi, canEnterBahi } from './types';
import { bk, bkLangOf, type BkLang } from './copy';
import { applyTransition, createBatch, useBahiKhata } from './bahikhataStore';
import { executeCommit } from './commit';
import { RegisterMode } from './RegisterMode';
import { CsvImport } from './CsvImport';
import { BatchReview } from './BatchReview';
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
}

type View =
  | { kind: 'home' }
  | { kind: 'register'; batchId: string }
  | { kind: 'csv' }
  | { kind: 'review'; batchId: string };

const TARGET_LABEL_KEY: Record<BahiTarget, 'targetHerd' | 'targetMembers' | 'targetDonors'> = {
  herd: 'targetHerd',
  members: 'targetMembers',
  donors: 'targetDonors',
};

const STATE_KEY: Record<ImportBatch['state'], 'stateDraft' | 'statePending' | 'stateApproved' | 'stateRejected' | 'stateCommitted'> = {
  draft: 'stateDraft',
  pending: 'statePending',
  approved: 'stateApproved',
  rejected: 'stateRejected',
  committed: 'stateCommitted',
};

export const BahiKhataDesk: React.FC<Props> = ({ targets, existingHerd, herdCommitter }) => {
  const offered = targets && targets.length ? targets : (['herd', 'members', 'donors'] as BahiTarget[]);
  const { activeWorkspace, currentUser, firebaseUser, effectiveRole } = useAuthWorkspace();
  const { devotees, addDevotee, updateDevotee, addTreasuryTransaction } = useData();
  const { currentLang } = useLanguage();
  const { showToast } = useToast();
  const lang: BkLang = bkLangOf(currentLang);
  const ws = activeWorkspace.id;
  const store = useBahiKhata(ws);

  const [selectedTarget, setSelectedTarget] = useState<BahiTarget>(offered[0]);
  const [view, setView] = useState<View>({ kind: 'home' });

  const role = String(effectiveRole || currentUser?.role || '');
  const actor: BatchActor = useMemo(
    () => ({
      uid: firebaseUser?.uid || currentUser?.id || 'local-user',
      name: currentUser?.name || currentUser?.fullName || 'Staff',
      role,
    }),
    [firebaseUser?.uid, currentUser?.id, currentUser?.name, currentUser?.fullName, role]
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

  const activeBatch =
    (view.kind === 'register' || view.kind === 'review')
      ? store.batches.find((b) => b.id === view.batchId)
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
    store.addBatch(batch);
    setView({ kind: 'register', batchId: batch.id });
  };

  const handleSubmit = (batch: ImportBatch) => {
    store.updateBatch(applyTransition(batch, 'submit', actor));
    showToast(bk(lang, 'submittedToast'), 'success');
    setView({ kind: 'home' });
  };

  const handleCommit = (batch: ImportBatch): BatchCommitSummary => {
    const approved = applyTransition(batch, 'approve', actor);
    const summary = executeCommit(approved, {
      workspaceId: ws,
      existingDevotees: devotees,
      addDevotee,
      updateDevotee,
      addTreasuryTransaction,
      addNandi: herdCommitter ? (n) => herdCommitter([n]) : undefined,
    });
    const committed = {
      ...applyTransition(approved, 'commit', actor),
      commitSummary: summary,
    };
    store.updateBatch(committed);
    return summary;
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
        onUpdate={store.updateBatch}
        onSubmit={handleSubmit}
        onBack={() => setView({ kind: 'home' })}
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
        onUpdate={store.updateBatch}
        onCommit={handleCommit}
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
            <div className={`${modeCard} bg-stone-50 border-stone-200 text-stone-400`} aria-disabled="true">
              <Camera className="w-6 h-6 shrink-0" /> {bk(lang, 'modePhotoSoon')}
            </div>
            <div className={`${modeCard} bg-stone-50 border-stone-200 text-stone-400`} aria-disabled="true">
              <Mic className="w-6 h-6 shrink-0" /> {bk(lang, 'modeVoiceSoon')}
            </div>
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
