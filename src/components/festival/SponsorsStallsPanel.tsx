/**
 * SponsorsStallsPanel — the sponsors & stalls register (EVENTS E6).
 * =====================================================================
 * Lives in the War Room under the pass ledger. The register itself
 * lives on the samiti's Utsav festival record (inside the existing
 * utsav_stores doc — no new collection, no rules change), linked
 * the DebriefCard way: matchLocalFestival, date overlap only.
 *
 * Money law, same as the pass ledger: a row claims treasury
 * posting only with the REAL transaction id stamped back.
 * "Mark received" posts the outstanding amount through the
 * existing addTreasuryTransaction under the matching budget-head
 * family ('Sponsorships' / 'Stall fees' — the BudgetTab purpose
 * idiom) and stamps linkedTxId onto the row.
 *
 * The budget stays the single source of truth: beside each head
 * the panel shows the head's planned / actual READ-ONLY. The
 * register never writes a budget line — the treasury posting is
 * what moves actuals.
 *
 * Public gratitude is consent-shaped: the only thing that may
 * leave this panel for the public page is publicAckNames() —
 * the names of sponsors who ticked "May we thank them
 * publicly?", stamped onto the festival's own festival_events
 * doc through the E4/E5 merge publish path. Amounts, contacts
 * and stall holders can never ride along — the stamped shape is
 * a list of name strings.
 */
import React, { useMemo, useState } from 'react';
import { deleteField, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useUtsav, uid } from '../../utsav/utsavStore';
import { Card, Btn, Field, Empty, inputCls, fmtDate } from '../../utsav/ui';
import { db } from '../../lib/firebase';
import { useInr } from '../../hooks/useWorkspaceInr';
import type { FestivalEventDoc, WarFestival, WarRoomPlan } from '../../lib/festival';
import { matchLocalFestival } from '../../lib/festivalDebrief';
import {
  budgetHeadTotals, buildSponsorReceipt, outstandingOf, publicAckNames, sponsorTotals, stallTotals,
  type SponsorReceipt,
} from '../../lib/festivalSponsors';
import { createStallLot } from '../../lib/auctionStallBridge';
import type {
  Festival, FestivalSponsor, FestivalStall, SponsorKind, StallKind,
} from '../../utsav/types';

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
  event: FestivalEventDoc | null;
}

const SPONSOR_KINDS: SponsorKind[] = ['cash', 'kind', 'seva'];
const STALL_KINDS: StallKind[] = ['prasad', 'food', 'books', 'flowers', 'other'];

type SponsorForm = {
  name: string; contact: string; kind: SponsorKind;
  pledged: string; received: string; publicAck: boolean; note: string;
};
type StallForm = {
  holder: string; kind: StallKind; fee: string; received: string; zone: string; note: string;
};

const blankSponsor: SponsorForm = {
  name: '', contact: '', kind: 'cash', pledged: '', received: '', publicAck: false, note: '',
};
const blankStall: StallForm = { holder: '', kind: 'prasad', fee: '', received: '', zone: '', note: '' };

export const SponsorsStallsPanel: React.FC<Props> = ({ wf, plan, event }) => {
  const { t } = useLanguage();
  const inr = useInr();
  const { activeWorkspace, currentUser, firebaseUser } = useAuthWorkspace();
  const { addTreasuryTransaction, treasury } = useData();
  const { state, update } = useUtsav();
  /* REAL-WORLD PACK — the sponsor receipt being printed, if any. */
  const [receipt, setReceipt] = useState<SponsorReceipt | null>(null);
  const [printingReceipt, setPrintingReceipt] = useState(false);

  const linked: Festival | null = useMemo(
    () => matchLocalFestival(wf.dateISO, wf.endDateISO, state.festivals),
    [wf.dateISO, wf.endDateISO, state.festivals]
  );

  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState('');
  const [spEditing, setSpEditing] = useState<string | null>(null); // null closed · 'new' · sponsor id
  const [spForm, setSpForm] = useState<SponsorForm>(blankSponsor);
  const [stEditing, setStEditing] = useState<string | null>(null);
  const [stForm, setStForm] = useState<StallForm>(blankStall);
  const [confirmThanks, setConfirmThanks] = useState(false);
  const [thanksBusy, setThanksBusy] = useState(false);

  const sponsors = useMemo(() => linked?.sponsors ?? [], [linked]);
  const stalls = useMemo(() => linked?.stalls ?? [], [linked]);
  const spTotals = useMemo(() => sponsorTotals(sponsors), [sponsors]);
  const stTotals = useMemo(() => stallTotals(stalls), [stalls]);
  const spHead = useMemo(
    () => (linked ? budgetHeadTotals(state.budget, linked.id, 'Sponsorships') : { planned: 0, actual: 0 }),
    [linked, state.budget]
  );
  const stHead = useMemo(
    () => (linked ? budgetHeadTotals(state.budget, linked.id, 'Stall fees') : { planned: 0, actual: 0 }),
    [linked, state.budget]
  );
  const hasSpHead = useMemo(
    () => !!linked && state.budget.some((b) => b.festivalId === linked.id && b.kind === 'income' && b.head === 'Sponsorships'),
    [linked, state.budget]
  );
  const hasStHead = useMemo(
    () => !!linked && state.budget.some((b) => b.festivalId === linked.id && b.kind === 'income' && b.head === 'Stall fees'),
    [linked, state.budget]
  );
  const thanksNames = useMemo(() => publicAckNames(sponsors), [sponsors]);
  const thanksPublished = (event?.sponsorThanks?.length ?? 0) > 0;

  if (!linked) {
    return (
      <Card>
        <h3 className="font-extrabold text-stone-800 mb-1">🤝 {t('surfaces.events.regTitle')}</h3>
        <Empty text={t('surfaces.events.regNoFestival')} />
      </Card>
    );
  }

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(''), 3500);
  };

  const saveSponsors = (next: FestivalSponsor[]) => update('festivals', linked.id, { sponsors: next });
  const saveStalls = (next: FestivalStall[]) => update('festivals', linked.id, { stalls: next });

  /* The BudgetTab posting idiom: capture the REAL treasury id via
   * the synchronous onId callback; stamp it only on success. */
  const postIncome = (head: 'Sponsorships' | 'Stall fees', amount: number, partyName: string): string => {
    let postedTxId = '';
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString().slice(0, 10),
      type: 'Income',
      category: 'Festival Income',
      subcategory: `Utsav One — ${linked.name}`,
      amount,
      handledBy: currentUser?.name || 'Utsav Samiti',
      paymentMode: 'UPI',
      purpose: `Festival income — ${head} (${linked.name}) — ${partyName}`,
      is80GEligible: false,
      taxReceiptIssued: false,
      devoteeName: partyName,
    }, (id) => { postedTxId = id; });
    return ok ? postedTxId : '';
  };

  const markSponsorReceived = (s: FestivalSponsor) => {
    const due = outstandingOf(s.pledged, s.received);
    if (due <= 0 || s.linkedTxId) return;
    setBusyId(s.id);
    try {
      const txId = postIncome('Sponsorships', due, s.name);
      if (txId) {
        saveSponsors(sponsors.map((x) => (x.id === s.id ? { ...x, received: x.pledged, linkedTxId: txId } : x)));
        flash(t('surfaces.events.sponsorPosted'));
      } else {
        flash(t('surfaces.events.sponsorPostFailed'));
      }
    } finally {
      setBusyId('');
    }
  };

  const markStallReceived = (s: FestivalStall) => {
    const due = outstandingOf(s.fee, s.received);
    if (due <= 0 || s.linkedTxId) return;
    setBusyId(s.id);
    try {
      const txId = postIncome('Stall fees', due, s.holder);
      if (txId) {
        saveStalls(stalls.map((x) => (x.id === s.id ? { ...x, received: x.fee, linkedTxId: txId } : x)));
        flash(t('surfaces.events.sponsorPosted'));
      } else {
        flash(t('surfaces.events.sponsorPostFailed'));
      }
    } finally {
      setBusyId('');
    }
  };

  /* AUCTION A3 — the stall bridge: "Allot by auction" creates a
   * Nilam lot linked to this stall (reserve = the stall's fee).
   * The lot then lives the ordinary desk life — notice,
   * registration with EMD, maker–checker outcome, treasury
   * settlement — and when it settles, the desk stamps this
   * register with the winner (allottedVia). No money moves here:
   * the fee is real only through the lot's own settlement. */
  const allotByAuction = async (s: FestivalStall) => {
    setBusyId(`auction-${s.id}`);
    try {
      await createStallLot({
        workspaceId: activeWorkspace.id,
        festivalId: linked.id,
        festivalName: linked.name,
        stall: s,
        actor: { uid: firebaseUser?.uid || '', name: currentUser?.name || '' },
        now: Date.now(),
      });
      flash(t('surfaces.nilam.stallLotCreated'));
    } catch {
      flash(t('surfaces.events.sponsorPostFailed'));
    } finally {
      setBusyId('');
    }
  };

  /* REAL-WORLD PACK — print a sponsor's receipt. Only a cash row
   * whose money truly reached the treasury (linkedTxId) can have
   * one; buildSponsorReceipt enforces that and returns the exact
   * content the sheet may say. The date is the treasury
   * transaction's own date, looked up by its id. Print follows
   * the DebriefCard idiom (mark, paint, print, unmark). */
  const printReceipt = (s: FestivalSponsor) => {
    const tx = treasury.find((x) => x.id === s.linkedTxId);
    const r = buildSponsorReceipt({
      orgName: activeWorkspace.name || '',
      festivalName: linked.name,
      sponsor: s,
      ...(tx?.date ? { treasuryDateISO: tx.date } : {}),
    });
    if (!r) return;
    setReceipt(r);
    setPrintingReceipt(true);
    setTimeout(() => {
      window.print();
      setPrintingReceipt(false);
    }, 150);
  };

  const openSponsor = (s?: FestivalSponsor) => {
    if (s) {
      setSpForm({
        name: s.name, contact: s.contact || '', kind: s.kind,
        pledged: String(s.pledged || ''), received: String(s.received || ''),
        publicAck: s.publicAck, note: s.note || '',
      });
      setSpEditing(s.id);
    } else {
      setSpForm(blankSponsor);
      setSpEditing('new');
    }
  };

  const saveSponsor = () => {
    const name = spForm.name.trim();
    if (!name) return;
    const row: FestivalSponsor = {
      id: spEditing === 'new' ? uid('sp') : (spEditing as string),
      name,
      ...(spForm.contact.trim() ? { contact: spForm.contact.trim() } : {}),
      kind: spForm.kind,
      pledged: spForm.kind === 'cash' ? Math.max(0, Math.round(Number(spForm.pledged) || 0)) : 0,
      received: spForm.kind === 'cash' ? Math.max(0, Math.round(Number(spForm.received) || 0)) : 0,
      ...(spEditing !== 'new' ? { linkedTxId: sponsors.find((x) => x.id === spEditing)?.linkedTxId } : {}),
      publicAck: spForm.publicAck,
      ...(spForm.note.trim() ? { note: spForm.note.trim() } : {}),
    };
    // Drop an undefined linkedTxId key entirely (the row above only
    // carries it when a posting already stamped one).
    if (!row.linkedTxId) delete row.linkedTxId;
    saveSponsors(spEditing === 'new' ? [...sponsors, row] : sponsors.map((x) => (x.id === row.id ? row : x)));
    setSpEditing(null);
  };

  const openStall = (s?: FestivalStall) => {
    if (s) {
      setStForm({
        holder: s.holder, kind: s.kind, fee: String(s.fee || ''),
        received: String(s.received || ''), zone: s.zone || '', note: s.note || '',
      });
      setStEditing(s.id);
    } else {
      setStForm(blankStall);
      setStEditing('new');
    }
  };

  const saveStall = () => {
    const holder = stForm.holder.trim();
    if (!holder) return;
    const existing = stEditing !== 'new' ? stalls.find((x) => x.id === stEditing) : undefined;
    const row: FestivalStall = {
      id: stEditing === 'new' ? uid('st') : (stEditing as string),
      holder,
      kind: stForm.kind,
      fee: Math.max(0, Math.round(Number(stForm.fee) || 0)),
      received: Math.max(0, Math.round(Number(stForm.received) || 0)),
      ...(existing?.linkedTxId ? { linkedTxId: existing.linkedTxId } : {}),
      ...(stForm.zone.trim() ? { zone: stForm.zone.trim() } : {}),
      ...(stForm.note.trim() ? { note: stForm.note.trim() } : {}),
    };
    saveStalls(stEditing === 'new' ? [...stalls, row] : stalls.map((x) => (x.id === row.id ? row : x)));
    setStEditing(null);
  };

  const publishThanks = async () => {
    if (thanksNames.length === 0) return;
    setThanksBusy(true);
    try {
      await setDoc(doc(db, 'festival_events', plan.id), { sponsorThanks: thanksNames }, { merge: true });
      setConfirmThanks(false);
    } finally {
      setThanksBusy(false);
    }
  };

  const unpublishThanks = async () => {
    setThanksBusy(true);
    try {
      await updateDoc(doc(db, 'festival_events', plan.id), { sponsorThanks: deleteField() });
    } finally {
      setThanksBusy(false);
    }
  };

  const kindLabel = (k: SponsorKind) =>
    k === 'cash'
      ? t('surfaces.events.sponsorKindCash')
      : k === 'kind'
        ? t('surfaces.events.sponsorKindKind')
        : t('surfaces.events.sponsorKindSeva');
  const stallKindLabel = (k: StallKind) =>
    t(`surfaces.events.stallKind${k.charAt(0).toUpperCase()}${k.slice(1)}`);

  const totalsBand = (tot: { pledged: number; received: number; pending: number }) => (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm mb-3">
      <span className="text-stone-500">{t('surfaces.events.regTotalPledged')} <span className="font-black text-stone-800 tnum">{inr(tot.pledged)}</span></span>
      <span className="text-stone-500">{t('surfaces.events.regTotalReceived')} <span className="font-black text-emerald-700 tnum">{inr(tot.received)}</span></span>
      <span className="text-stone-500">{t('surfaces.events.regTotalPending')} <span className="font-black text-amber-700 tnum">{inr(tot.pending)}</span></span>
    </div>
  );

  const headHint = (tot: { planned: number; actual: number }) => (
    <p className="text-[11px] text-stone-400 mb-3">
      {t('surfaces.events.regBudgetHint')
        .replace('{planned}', inr(tot.planned))
        .replace('{actual}', inr(tot.actual))}
    </p>
  );

  return (
    <Card>
      <h3 className="font-extrabold text-stone-800 mb-1">🤝 {t('surfaces.events.regTitle')}</h3>
      <p className="text-xs text-stone-500 mb-4">{t('surfaces.events.regIntro')}</p>
      {note && <div className="text-xs font-bold text-emerald-700 mb-2">{note}</div>}

      {/* ── Sponsors ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-black text-stone-700">{t('surfaces.events.sponsorsTitle')}</h4>
        <Btn variant="ghost" className="!px-3" onClick={() => openSponsor()}>
          + {t('surfaces.events.sponsorAdd')}
        </Btn>
      </div>
      {sponsors.length > 0 && totalsBand(spTotals)}
      {hasSpHead && headHint(spHead)}

      {spEditing !== null && (
        <div className="rounded-xl bg-orange-50/60 border border-orange-100 p-3 mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('surfaces.events.sponsorName')}>
              <input className={inputCls} value={spForm.name} onChange={(e) => setSpForm({ ...spForm, name: e.target.value })} />
            </Field>
            <Field label={t('surfaces.events.sponsorContact')}>
              <input className={inputCls} value={spForm.contact} onChange={(e) => setSpForm({ ...spForm, contact: e.target.value })} />
            </Field>
            <Field label={t('surfaces.events.sponsorKind')}>
              <select className={inputCls} value={spForm.kind} onChange={(e) => setSpForm({ ...spForm, kind: e.target.value as SponsorKind })}>
                {SPONSOR_KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
              </select>
            </Field>
            {spForm.kind === 'cash' && (
              <>
                <Field label={t('surfaces.events.sponsorPledged')}>
                  <input type="number" min={0} inputMode="numeric" className={inputCls} value={spForm.pledged} onChange={(e) => setSpForm({ ...spForm, pledged: e.target.value })} />
                </Field>
                <Field label={t('surfaces.events.sponsorReceived')}>
                  <input type="number" min={0} inputMode="numeric" className={inputCls} value={spForm.received} onChange={(e) => setSpForm({ ...spForm, received: e.target.value })} />
                </Field>
              </>
            )}
            <Field label={t('surfaces.events.sponsorNote')}>
              <input className={inputCls} value={spForm.note} onChange={(e) => setSpForm({ ...spForm, note: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-start gap-2.5 rounded-xl bg-white border border-stone-200 px-3 py-2.5 cursor-pointer min-h-[44px]">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-orange-600"
              checked={spForm.publicAck}
              onChange={(e) => setSpForm({ ...spForm, publicAck: e.target.checked })} />
            <span>
              <span className="block text-sm font-bold text-stone-700">{t('surfaces.events.sponsorPublicAck')}</span>
              <span className="block text-[11px] text-stone-500">{t('surfaces.events.sponsorPublicAckNote')}</span>
            </span>
          </label>
          <div className="flex gap-2">
            <Btn disabled={!spForm.name.trim()} onClick={saveSponsor}>{t('surfaces.events.sponsorSave')}</Btn>
            <Btn variant="ghost" onClick={() => setSpEditing(null)}>{t('surfaces.events.sponsorCancel')}</Btn>
          </div>
        </div>
      )}

      {sponsors.length === 0 ? (
        spEditing === null && <Empty text={t('surfaces.events.sponsorsEmpty')} />
      ) : (
        <ul className="space-y-1.5 mb-5">
          {sponsors.map((s) => {
            const due = s.kind === 'cash' ? outstandingOf(s.pledged, s.received) : 0;
            return (
              <li key={s.id} className="rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-stone-800 truncate">
                      {s.name}
                      {s.publicAck && <span className="ml-2 text-[10px] font-black uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">🙏</span>}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {kindLabel(s.kind)}
                      {s.contact ? ` · ${s.contact}` : ''}
                      {s.note ? ` · ${s.note}` : ''}
                    </div>
                    {s.kind === 'cash' && (
                      <div className="text-[11px] text-stone-500 tnum">
                        {inr(s.received)} / {inr(s.pledged)}
                        {due > 0 ? ` · ${inr(due)} ${t('surfaces.events.sponsorPending')}` : ''}
                        {s.linkedTxId ? ` · ${t('surfaces.events.sponsorInTreasury')}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {s.kind === 'cash' && s.linkedTxId && (
                      <Btn variant="ghost" className="!px-2.5" onClick={() => printReceipt(s)}>
                        🧾 {t('surfaces.events.sponsorReceiptBtn')}
                      </Btn>
                    )}
                    <Btn variant="ghost" className="!px-2.5" onClick={() => openSponsor(s)}>{t('surfaces.events.sponsorEdit')}</Btn>
                    <Btn variant="ghost" className="!px-2.5" onClick={() => saveSponsors(sponsors.filter((x) => x.id !== s.id))}>
                      {t('surfaces.events.sponsorRemove')}
                    </Btn>
                  </div>
                </div>
                {s.kind === 'cash' && due > 0 && !s.linkedTxId && (
                  <div className="mt-2">
                    <Btn className="!px-3" disabled={busyId === s.id} onClick={() => markSponsorReceived(s)}>
                      {t('surfaces.events.sponsorMarkReceived')} · {inr(due)}
                    </Btn>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Public gratitude ─────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 mb-5">
        <div className="font-black text-stone-700 text-sm mb-1">🙏 {t('surfaces.events.gratitudeTitle')}</div>
        {thanksNames.length === 0 ? (
          <p className="text-xs text-stone-500">{t('surfaces.events.gratitudeNone')}</p>
        ) : (
          <>
            <p className="text-sm text-stone-700 font-semibold">{thanksNames.join(' · ')}</p>
            <p className="text-[11px] text-stone-500 mt-1">{t('surfaces.events.gratitudeConfirm')}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {thanksPublished && !confirmThanks && (
                <span className="text-xs font-bold text-emerald-700">{t('surfaces.events.gratitudePublished')}</span>
              )}
              {confirmThanks ? (
                <>
                  <Btn disabled={thanksBusy} onClick={publishThanks}>{t('surfaces.events.gratitudePublish')}</Btn>
                  <Btn variant="ghost" onClick={() => setConfirmThanks(false)}>{t('surfaces.events.sponsorCancel')}</Btn>
                </>
              ) : (
                <Btn variant="ghost" className="!px-3" disabled={thanksBusy} onClick={() => setConfirmThanks(true)}>
                  {t('surfaces.events.gratitudePublish')}
                </Btn>
              )}
              {thanksPublished && (
                <Btn variant="ghost" className="!px-3" disabled={thanksBusy} onClick={unpublishThanks}>
                  {t('surfaces.events.gratitudeUnpublish')}
                </Btn>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Stalls ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-black text-stone-700">{t('surfaces.events.stallsTitle')}</h4>
        <Btn variant="ghost" className="!px-3" onClick={() => openStall()}>
          + {t('surfaces.events.stallAdd')}
        </Btn>
      </div>
      {stalls.length > 0 && totalsBand(stTotals)}
      {hasStHead && headHint(stHead)}

      {stEditing !== null && (
        <div className="rounded-xl bg-orange-50/60 border border-orange-100 p-3 mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('surfaces.events.stallHolder')}>
              <input className={inputCls} value={stForm.holder} onChange={(e) => setStForm({ ...stForm, holder: e.target.value })} />
            </Field>
            <Field label={t('surfaces.events.stallKind')}>
              <select className={inputCls} value={stForm.kind} onChange={(e) => setStForm({ ...stForm, kind: e.target.value as StallKind })}>
                {STALL_KINDS.map((k) => <option key={k} value={k}>{stallKindLabel(k)}</option>)}
              </select>
            </Field>
            <Field label={t('surfaces.events.stallFee')}>
              <input type="number" min={0} inputMode="numeric" className={inputCls} value={stForm.fee} onChange={(e) => setStForm({ ...stForm, fee: e.target.value })} />
            </Field>
            <Field label={t('surfaces.events.sponsorReceived')}>
              <input type="number" min={0} inputMode="numeric" className={inputCls} value={stForm.received} onChange={(e) => setStForm({ ...stForm, received: e.target.value })} />
            </Field>
            <Field label={t('surfaces.events.stallZone')}>
              <input className={inputCls} value={stForm.zone} onChange={(e) => setStForm({ ...stForm, zone: e.target.value })} />
            </Field>
            <Field label={t('surfaces.events.sponsorNote')}>
              <input className={inputCls} value={stForm.note} onChange={(e) => setStForm({ ...stForm, note: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Btn disabled={!stForm.holder.trim()} onClick={saveStall}>{t('surfaces.events.stallSave')}</Btn>
            <Btn variant="ghost" onClick={() => setStEditing(null)}>{t('surfaces.events.sponsorCancel')}</Btn>
          </div>
        </div>
      )}

      {stalls.length === 0 ? (
        stEditing === null && <Empty text={t('surfaces.events.stallsEmpty')} />
      ) : (
        <ul className="space-y-1.5">
          {stalls.map((s) => {
            const due = outstandingOf(s.fee, s.received);
            return (
              <li key={s.id} className="rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-stone-800 truncate">{s.holder}</div>
                    <div className="text-[11px] text-stone-500">
                      {stallKindLabel(s.kind)}
                      {s.zone ? ` · ${s.zone}` : ''}
                      {s.note ? ` · ${s.note}` : ''}
                    </div>
                    <div className="text-[11px] text-stone-500 tnum">
                      {inr(s.received)} / {inr(s.fee)}
                      {due > 0 ? ` · ${inr(due)} ${t('surfaces.events.sponsorPending')}` : ''}
                      {s.linkedTxId ? ` · ${t('surfaces.events.sponsorInTreasury')}` : ''}
                    </div>
                    {s.allottedVia && (
                      <div className="text-[11px] font-bold text-emerald-700">
                        {t('surfaces.nilam.stallAllottedVia')
                          .replace('{amount}', inr(s.allottedVia.amount))
                          .replace('{lotId}', s.allottedVia.lotId)}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Btn variant="ghost" className="!px-2.5" onClick={() => openStall(s)}>{t('surfaces.events.sponsorEdit')}</Btn>
                    <Btn variant="ghost" className="!px-2.5" onClick={() => saveStalls(stalls.filter((x) => x.id !== s.id))}>
                      {t('surfaces.events.sponsorRemove')}
                    </Btn>
                  </div>
                </div>
                {due > 0 && !s.linkedTxId && (
                  <div className="mt-2">
                    <Btn className="!px-3" disabled={busyId === s.id} onClick={() => markStallReceived(s)}>
                      {t('surfaces.events.stallMarkReceived')} · {inr(due)}
                    </Btn>
                  </div>
                )}
                {!s.allottedVia && !s.linkedTxId && (
                  <div className="mt-2">
                    <Btn variant="ghost" className="!px-3" disabled={busyId === `auction-${s.id}`} onClick={() => void allotByAuction(s)}>
                      🔨 {t('surfaces.nilam.stallAllotAction')}
                    </Btn>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── REAL-WORLD PACK — the sponsor receipt sheet (paper
          only, rendered during its own print state; print.css
          isolates .print-sponsor-receipt). No receipt number is
          invented: the treasury transaction id is the reference. */}
      {printingReceipt && receipt && (
        <div className="receipt-paper print-sponsor-receipt rounded-2xl p-5">
          <div className="rp-eyebrow text-[11px] font-bold uppercase tracking-widest">
            {receipt.orgName}
          </div>
          <div className="rp-title text-2xl font-black mt-1">{t('surfaces.events.sponsorReceiptTitle')}</div>
          <div className="rp-soft text-sm mt-0.5">{receipt.festivalName}</div>
          <div className="paper-line border-t mt-3 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="rp-soft">{t('surfaces.events.sponsorName')}</span>
              <span className="rp-ink font-black">{receipt.sponsorName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="rp-soft">{t('surfaces.events.sponsorReceiptAmount')}</span>
              <span className="rp-amount font-black tnum">{inr(receipt.amountReceived)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="rp-soft">{t('surfaces.events.sponsorReceiptHead')}</span>
              <span className="rp-ink font-bold">{receipt.incomeHead}</span>
            </div>
            {receipt.receivedDateISO && (
              <div className="flex justify-between gap-3">
                <span className="rp-soft">{t('surfaces.events.sponsorReceiptDate')}</span>
                <span className="rp-ink font-bold">{fmtDate(receipt.receivedDateISO)}</span>
              </div>
            )}
          </div>
          <p className="text-sm rp-ink mt-4">{t('surfaces.events.sponsorReceiptThanks')}</p>
          <p className="text-[11px] rp-soft mt-3">
            Treasury ref: {receipt.treasuryRef} — {t('surfaces.events.sponsorReceiptRefNote')}
          </p>
        </div>
      )}
    </Card>
  );
};

export default SponsorsStallsPanel;
