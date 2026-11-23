/**
 * NilamDesk — AUCTION WAVE A1: the auction & allotment record desk.
 * =====================================================================
 * "Nilam" (নিলাম / नीलाम) — the org's auction desk. A1 is the
 * record around the hall auction: lots drafted from the asset
 * register / Bhoomi properties, a valuation behind every reserve,
 * the sanction gate for immovable sales and long leases, the
 * printable public notice with its legal clock, objections on
 * record, bidder registration with EMD receipts, a maker–checker
 * outcome, and settlement through the treasury — ending in a
 * public result on the Transparency Board.
 *
 * No live bidding lives here (A2/A3 are later waves): the auction
 * itself still happens in the hall, in the open — this desk makes
 * sure it is REMEMBERED exactly as it happened.
 *
 * Two-person steps (leaving draft; recording the outcome) ride
 * the maker–checker approvals system (kind 'auction.lot') in real
 * workspaces. DEMO_ workspaces take the approvals service's own
 * documented direct path: the decision is stamped on the lot with
 * its seal digest (lib/auctionLots.lotStepDigest).
 *
 * Write paths (verified against firestore.rules before building):
 * auction_lots create/update by the workspace's board/finance
 * roles, lifecycle transitions pinned, sanction gate + settlement
 * tx-id append-only law in the rules themselves.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  Gavel, Plus, Printer, ShieldCheck, AlertTriangle, X, CheckCircle2,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { useInr } from '../../hooks/useWorkspaceInr';
import { resolveActorName } from '../../bahikhata/bahikhataStore';
import { friendlyError } from '../../lib/friendlyError';
import type { ApprovalRequestDoc } from '../../lib/approvals';
import { firestoreApprovalsBackend } from '../../context/data/approvalsStore';
import {
  REGISTRATIONS_CAP,
  balanceDue,
  canTransitionLot,
  createLot,
  earliestAuctionAt,
  fileLotApproval,
  loadWorkspaceLots,
  lotGateIssues,
  lotStepDigest,
  openObjectionsOf,
  patchLot,
  registrationTotals,
  sanctionRequiredFor,
  transitionLot,
  type AuctionLot,
  type LotClass,
  type LotOutcome,
  type LotStatus,
} from '../../lib/auctionLots';

const inputCls =
  'w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-temple-950/80 border border-temple-800 text-temple-100 placeholder-temple-500 text-sm focus:border-saffron-500 focus:outline-none transition-colors';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-temple-400 mb-1';
const btnPrimary =
  'min-h-[44px] px-4 py-2.5 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-saffron-600/20 transition-all cursor-pointer disabled:opacity-50';
const btnGhost =
  'min-h-[44px] px-3 py-2 rounded-xl bg-temple-800 hover:bg-temple-700 text-temple-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50';
const cardCls = 'rounded-2xl bg-temple-900/70 border border-temple-800 p-4 sm:p-5 space-y-4';

const CLASSES: LotClass[] = ['rights-lease', 'movables', 'immovable-sale'];
const AFFIX_PLACES = ['temple-board', 'panchayat-board', 'municipal-board', 'newspaper', 'other'] as const;
const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI / QR', 'Cheque', 'Card'];

const todayISO = () => new Date().toISOString().slice(0, 10);
const toLocalInput = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtWhen = (ms?: number): string =>
  typeof ms === 'number' && ms > 0
    ? new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

interface DraftForm {
  title: string;
  lotClass: LotClass;
  sourceKind: 'asset' | 'property' | 'standalone';
  sourceRefId: string;
  sourceLabel: string;
  description: string;
  mediaRefs: string;
  reservePrice: string;
  leaseTermYears: string;
  valuationKind: 'independent-valuer' | 'committee-estimate';
  valuerName: string;
  valuedOn: string;
  valuationFigure: string;
  sanctionAuthority: string;
  sanctionReference: string;
  sanctionDate: string;
}

const emptyDraft = (): DraftForm => ({
  title: '', lotClass: 'rights-lease', sourceKind: 'standalone', sourceRefId: '', sourceLabel: '',
  description: '', mediaRefs: '', reservePrice: '', leaseTermYears: '',
  valuationKind: 'committee-estimate', valuerName: '', valuedOn: todayISO(), valuationFigure: '',
  sanctionAuthority: '', sanctionReference: '', sanctionDate: todayISO(),
});

const draftFromLot = (lot: AuctionLot): DraftForm => ({
  title: lot.title,
  lotClass: lot.lotClass,
  sourceKind: lot.source.kind,
  sourceRefId: lot.source.refId ?? '',
  sourceLabel: lot.source.label,
  description: lot.description,
  mediaRefs: lot.mediaRefs.join(', '),
  reservePrice: String(lot.reservePrice || ''),
  leaseTermYears: lot.leaseTermYears ? String(lot.leaseTermYears) : '',
  valuationKind: lot.valuationBasis?.kind ?? 'committee-estimate',
  valuerName: lot.valuationBasis?.valuerName ?? '',
  valuedOn: lot.valuationBasis?.valuedOn ?? todayISO(),
  valuationFigure: lot.valuationBasis ? String(lot.valuationBasis.figure) : '',
  sanctionAuthority: lot.sanction?.authority ?? '',
  sanctionReference: lot.sanction?.reference ?? '',
  sanctionDate: lot.sanction?.date ?? todayISO(),
});

export const NilamDesk: React.FC = () => {
  const { t } = useLanguage();
  const inr = useInr();
  const { activeWorkspace, firebaseUser, effectiveRole } = useAuthWorkspace();
  const { assets, bhoomiProperties, addTreasuryTransaction, updateBhoomiProperty, updateAsset } = useData();
  const { showToast } = useToast();

  const wsId = activeWorkspace?.id || '';
  const isDemo = wsId.startsWith('DEMO_');
  const actor = useMemo(
    () => ({
      uid: firebaseUser?.uid || '',
      name: resolveActorName([firebaseUser?.displayName], firebaseUser?.email || ''),
      role: (effectiveRole as string) || '',
    }),
    [firebaseUser, effectiveRole]
  );

  const [lots, setLots] = useState<AuctionLot[]>([]);
  const [requests, setRequests] = useState<ApprovalRequestDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft());
  const [busy, setBusy] = useState('');
  const [printMode, setPrintMode] = useState<'notice' | 'result' | null>(null);

  // Notice / registration / objection / outcome form state (per selected lot)
  const [noticeForm, setNoticeForm] = useState({ auctionAt: '', place: '', emd: '', inspectionFrom: '', inspectionTo: '', objectionBy: '' });
  const [affixForm, setAffixForm] = useState({ place: 'temple-board' as (typeof AFFIX_PLACES)[number], note: '', date: todayISO(), photoRef: '' });
  const [regForm, setRegForm] = useState({ name: '', phone: '', idReference: '', related: false, relationNote: '', emd: '', emdMode: 'cash' as 'cash' | 'dd' | 'transfer', emdReference: '' });
  const [objForm, setObjForm] = useState({ name: '', contact: '', text: '', receivedOn: todayISO() });
  const [respondText, setRespondText] = useState<Record<string, string>>({});
  const [outcomeForm, setOutcomeForm] = useState({ winnerId: '', amount: '', date: todayISO(), conductor: '', attendance: '', publishName: true });
  const [closureReason, setClosureReason] = useState('');
  const [depositForm, setDepositForm] = useState({ amount: '', mode: 'Bank Transfer' });
  const [balanceForm, setBalanceForm] = useState({ amount: '', mode: 'Bank Transfer' });

  useEffect(() => {
    if (!wsId) { setLots([]); return; }
    const unsub = onSnapshot(
      query(collection(db, 'auction_lots'), where('workspaceId', '==', wsId)),
      (snap) => {
        const rows = snap.docs.map((d) => d.data() as AuctionLot);
        rows.sort((a, b) => b.createdAt - a.createdAt);
        setLots(rows);
      },
      () => { void loadWorkspaceLots(wsId).then(setLots).catch(() => setLots([])); }
    );
    return () => unsub();
  }, [wsId]);

  useEffect(() => {
    if (!wsId || isDemo) { setRequests([]); return; }
    let live = true;
    firestoreApprovalsBackend
      .fetchForWorkspace(wsId)
      .then((rows) => { if (live) setRequests(rows.filter((r) => r.kind === 'auction.lot')); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [wsId, isDemo, lots]);

  const lot = useMemo(() => lots.find((l) => l.id === selectedId) ?? null, [lots, selectedId]);

  useEffect(() => {
    if (lot) {
      setDraft(draftFromLot(lot));
      setOutcomeForm((f) => ({ ...f, publishName: lot.lotClass !== 'immovable-sale' }));
      if (lot.notice) {
        setNoticeForm({
          auctionAt: toLocalInput(lot.notice.auctionAt),
          place: lot.notice.auctionPlace,
          emd: String(lot.notice.emdAmount || ''),
          inspectionFrom: lot.notice.inspectionFrom ?? '',
          inspectionTo: lot.notice.inspectionTo ?? '',
          objectionBy: lot.notice.objectionDeadline ? new Date(lot.notice.objectionDeadline).toISOString().slice(0, 10) : '',
        });
      }
    }
  }, [lot?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingFor = (l: AuctionLot, step: 'approve' | 'accept') =>
    requests.find(
      (r) => r.status === 'PENDING' && (r.payload as { lotId?: string; step?: string }).lotId === l.id
        && (r.payload as { step?: string }).step === step
    );

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      showToast(t('surfaces.nilam.saved'), 'success');
    } catch (err) {
      showToast(friendlyError(err, t, 'save'), 'error');
    } finally {
      setBusy('');
    }
  };

  /* ---------------- draft create / save ---------------- */

  const buildLotFields = (f: DraftForm) => {
    const sourceLabel =
      f.sourceKind === 'asset'
        ? assets.find((a) => a.id === f.sourceRefId)?.name ?? f.sourceLabel
        : f.sourceKind === 'property'
          ? bhoomiProperties.find((p) => p.id === f.sourceRefId)?.name ?? f.sourceLabel
          : f.sourceLabel;
    return {
      source: {
        kind: f.sourceKind,
        ...(f.sourceKind !== 'standalone' && f.sourceRefId ? { refId: f.sourceRefId } : {}),
        label: sourceLabel || f.title,
      },
      lotClass: f.lotClass,
      title: f.title.trim(),
      description: f.description.trim(),
      mediaRefs: f.mediaRefs.split(',').map((s) => s.trim()).filter(Boolean),
      reservePrice: Number(f.reservePrice) || 0,
      ...(f.lotClass === 'rights-lease' && f.leaseTermYears ? { leaseTermYears: Number(f.leaseTermYears) } : {}),
      ...(f.valuationFigure !== ''
        ? {
            valuationBasis: {
              kind: f.valuationKind,
              ...(f.valuationKind === 'independent-valuer' && f.valuerName ? { valuerName: f.valuerName } : {}),
              ...(f.valuedOn ? { valuedOn: f.valuedOn } : {}),
              figure: Number(f.valuationFigure) || 0,
            },
          }
        : {}),
      ...(f.sanctionAuthority.trim() || f.sanctionReference.trim()
        ? { sanction: { authority: f.sanctionAuthority.trim(), reference: f.sanctionReference.trim(), date: f.sanctionDate } }
        : {}),
    };
  };

  const onCreate = () =>
    run('create', async () => {
      const fields = buildLotFields(draft);
      if (!fields.title) throw new Error('title');
      const created = await createLot(
        { workspaceId: wsId, ...fields },
        { uid: actor.uid, name: actor.name },
        Date.now()
      );
      setCreating(false);
      setDraft(emptyDraft());
      setSelectedId(created.id);
    });

  const onSaveDraft = () => {
    if (!lot) return;
    run('save', async () => {
      await patchLot(lot.id, buildLotFields(draft) as Partial<AuctionLot>, Date.now());
    });
  };

  /* ---------------- maker–checker steps ---------------- */

  const fileStep = (l: AuctionLot, step: 'approve' | 'accept', outcome?: LotOutcome) =>
    run(`file-${step}`, async () => {
      const effective = outcome ? { ...l, outcome } : l;
      if (isDemo) {
        // The approvals service's documented DEMO_ posture: stamp
        // the decision directly, with the seal digest on record.
        const target: LotStatus = step === 'approve' ? 'approved' : 'accepted';
        const issues = lotGateIssues(effective, target, Date.now()).filter((i) => i !== 'status');
        if (issues.length > 0) throw new Error(issues[0]);
        const digest = lotStepDigest(effective, step);
        const now = Date.now();
        await patchLot(l.id, {
          status: step === 'approve' ? 'approved' : 'accepted',
          ...(outcome ? { outcome } : {}),
          history: {
            ...l.history,
            [step === 'approve' ? 'approved' : 'accepted']: {
              at: now, by: actor.uid, byName: actor.name, ref: `demo-seal:${digest.slice(0, 16)}`,
            },
          },
        }, now);
        return;
      }
      await fileLotApproval(effective, step, actor, activeWorkspace?.name || '');
      showToast(t('surfaces.nilam.approvalPending'), 'success');
    });

  /* ---------------- lifecycle steps ---------------- */

  const publishNotice = () => {
    if (!lot) return;
    run('notice', async () => {
      const auctionAt = new Date(noticeForm.auctionAt).getTime();
      if (!Number.isFinite(auctionAt)) throw new Error('notice-clock');
      const notice = {
        publishedAt: Date.now(),
        auctionAt,
        auctionPlace: noticeForm.place.trim(),
        ...(noticeForm.inspectionFrom ? { inspectionFrom: noticeForm.inspectionFrom } : {}),
        ...(noticeForm.inspectionTo ? { inspectionTo: noticeForm.inspectionTo } : {}),
        objectionDeadline: noticeForm.objectionBy
          ? new Date(`${noticeForm.objectionBy}T23:59:59`).getTime()
          : auctionAt,
        emdAmount: Number(noticeForm.emd) || 0,
      };
      await transitionLot(lot, 'noticed', { uid: actor.uid, name: actor.name }, Date.now(), { notice });
    });
  };

  const simpleTransition = (to: LotStatus) => {
    if (!lot) return;
    run(`to-${to}`, async () => {
      await transitionLot(lot, to, { uid: actor.uid, name: actor.name }, Date.now());
    });
  };

  const closeWithReason = (to: 'failed' | 'withdrawn') => {
    if (!lot) return;
    run(`to-${to}`, async () => {
      if (!closureReason.trim()) throw new Error('closure');
      await transitionLot(lot, to, { uid: actor.uid, name: actor.name }, Date.now(), { failReason: closureReason.trim() });
      setClosureReason('');
    });
  };

  /* ---------------- registrations / objections / affixtures ---------------- */

  const addRegistration = () => {
    if (!lot) return;
    run('reg-add', async () => {
      if (lot.registrations.length >= REGISTRATIONS_CAP) throw new Error('registrations-cap');
      if (!regForm.name.trim()) throw new Error('name');
      const reg = {
        id: `reg_${Date.now().toString(36)}`,
        name: regForm.name.trim(),
        phone: regForm.phone.trim(),
        idReference: regForm.idReference.trim(),
        relatedParty: regForm.related,
        ...(regForm.related && regForm.relationNote ? { relationNote: regForm.relationNote.trim() } : {}),
        emdAmount: Number(regForm.emd) || 0,
        emdMode: regForm.emdMode,
        ...(regForm.emdReference ? { emdReference: regForm.emdReference.trim() } : {}),
        receivedAt: Date.now(),
      };
      await patchLot(lot.id, { registrations: [...lot.registrations, reg] }, Date.now());
      setRegForm({ name: '', phone: '', idReference: '', related: false, relationNote: '', emd: '', emdMode: 'cash', emdReference: '' });
    });
  };

  const patchRegistration = (regId: string, patch: Partial<AuctionLot['registrations'][number]>) => {
    if (!lot) return;
    run(`reg-${regId}`, async () => {
      await patchLot(
        lot.id,
        { registrations: lot.registrations.map((r) => (r.id === regId ? { ...r, ...patch } : r)) },
        Date.now()
      );
    });
  };

  const addObjection = () => {
    if (!lot) return;
    run('obj-add', async () => {
      if (!objForm.name.trim() || !objForm.text.trim()) throw new Error('objection');
      const obj = {
        id: `obj_${Date.now().toString(36)}`,
        objectorName: objForm.name.trim(),
        ...(objForm.contact ? { contact: objForm.contact.trim() } : {}),
        text: objForm.text.trim(),
        receivedOn: objForm.receivedOn,
      };
      await patchLot(lot.id, { objections: [...lot.objections, obj] }, Date.now());
      setObjForm({ name: '', contact: '', text: '', receivedOn: todayISO() });
    });
  };

  const respondObjection = (objId: string) => {
    if (!lot) return;
    run(`obj-${objId}`, async () => {
      const text = (respondText[objId] || '').trim();
      if (!text) throw new Error('response');
      await patchLot(
        lot.id,
        {
          objections: lot.objections.map((o) =>
            o.id === objId ? { ...o, response: text, respondedOn: todayISO(), respondedBy: actor.name } : o
          ),
        },
        Date.now()
      );
    });
  };

  const addAffixture = () => {
    if (!lot) return;
    run('affix-add', async () => {
      const aff = {
        place: affixForm.place,
        ...(affixForm.note ? { placeNote: affixForm.note.trim() } : {}),
        date: affixForm.date,
        ...(affixForm.photoRef ? { photoRef: affixForm.photoRef.trim() } : {}),
      };
      await patchLot(lot.id, { affixtures: [...lot.affixtures, aff] }, Date.now());
      setAffixForm({ place: 'temple-board', note: '', date: todayISO(), photoRef: '' });
    });
  };

  /* ---------------- outcome + settlement ---------------- */

  const recordOutcome = () => {
    if (!lot) return;
    const winner = lot.registrations.find((r) => r.id === outcomeForm.winnerId);
    if (!winner) { showToast(t('surfaces.nilam.outcomeWinner'), 'error'); return; }
    const outcome: LotOutcome = {
      winnerRegistrationId: winner.id,
      winnerName: winner.name,
      winningAmount: Number(outcomeForm.amount) || 0,
      auctionDate: outcomeForm.date,
      conductorName: outcomeForm.conductor.trim(),
      ...(outcomeForm.attendance ? { attendanceCount: Number(outcomeForm.attendance) } : {}),
      publishWinnerName: outcomeForm.publishName,
    };
    void fileStep(lot, 'accept', outcome);
  };

  const postSettlementLeg = (leg: 'deposit' | 'balance') => {
    if (!lot || !lot.outcome) return;
    run(`settle-${leg}`, async () => {
      const form = leg === 'deposit' ? depositForm : balanceForm;
      const amount = Number(form.amount) || 0;
      if (amount <= 0) throw new Error('amount');
      let txId = '';
      const ok = addTreasuryTransaction(
        {
          workspaceId: wsId,
          date: todayISO(),
          type: 'Income',
          category: 'Auction & Allotment',
          subcategory: lot.title,
          amount,
          handledBy: actor.name || 'Nilam Desk',
          paymentMode: form.mode,
          purpose: `Nilam ${leg} — ${lot.title} — ${lot.outcome.winnerName}`,
          is80GEligible: false,
          taxReceiptIssued: false,
          devoteeName: lot.outcome.winnerName,
        },
        (id) => { txId = id; }
      );
      if (!ok || !txId) throw new Error('treasury');
      const settlement = {
        ...(lot.settlement ?? {}),
        ...(leg === 'deposit'
          ? { depositTxId: txId, depositAmount: amount }
          : { balanceTxId: txId, balanceAmount: amount }),
      };
      if (leg === 'deposit') {
        await patchLot(lot.id, { settlement }, Date.now());
        return;
      }
      // Balance posted — the lot settles (transitionLot's gate
      // reads the merged settlement), and the source record
      // closes its own loop in the same breath.
      const settledLot: AuctionLot = { ...lot, settlement, status: 'settled' };
      await transitionLot(lot, 'settled', { uid: actor.uid, name: actor.name }, Date.now(), { settlement });
      reflectSettlement(settledLot);
    });
  };

  const reflectSettlement = (l: AuctionLot) => {
    if (!l.outcome) return;
    const winner = l.registrations.find((r) => r.id === l.outcome?.winnerRegistrationId);
    if (l.source.kind === 'property' && l.source.refId && l.lotClass === 'rights-lease') {
      updateBhoomiProperty(l.source.refId, {
        tenantName: l.outcome.winnerName,
        ...(winner?.phone ? { tenantPhone: winner.phone } : {}),
        status: 'Occupied',
        leaseStartDate: l.outcome.auctionDate,
        ...(l.settlement?.depositAmount ? { depositAmount: l.settlement.depositAmount } : {}),
      });
    }
    if (l.source.kind === 'asset' && l.source.refId) {
      const asset = assets.find((a) => a.id === l.source?.refId);
      const noteLine = `Nilam ${l.lotClass === 'rights-lease' ? 'allotted' : 'sold'} — ${l.title} — ${l.outcome.winningAmount} — lot ${l.id}`;
      updateAsset(l.source.refId, {
        notes: asset?.notes ? `${asset.notes}\n${noteLine}` : noteLine,
        ...(l.lotClass !== 'rights-lease' ? { condition: 'Retired' } : {}),
      });
    }
  };

  const doPrint = (mode: 'notice' | 'result') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 150);
  };

  /* ---------------- render helpers ---------------- */

  const statusLabel = (s: LotStatus) => t(`surfaces.nilam.status_${s}`);
  const classLabel = (c: LotClass) => t(`surfaces.nilam.class_${c.replace('-', '_')}`);

  const renderLotDetail = (l: AuctionLot) => {
    const totals = registrationTotals(l);
    const openObjs = openObjectionsOf(l);
    const sanctionNeeded = sanctionRequiredFor(l);
    const approvePending = pendingFor(l, 'approve');
    const acceptPending = pendingFor(l, 'accept');
    return (
      <div className="space-y-4">
        {/* Draft editor */}
        {(l.status === 'draft') && (
          <div className={cardCls}>
            {renderDraftForm()}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnGhost} disabled={busy !== ''} onClick={onSaveDraft}>
                {t('surfaces.nilam.saveDraft')}
              </button>
              <button
                type="button" className={btnPrimary} disabled={busy !== '' || !!approvePending}
                onClick={() => void fileStep(l, 'approve')}
              >
                <ShieldCheck size={16} /> {t('surfaces.nilam.approvalFile')}
              </button>
            </div>
            {approvePending && <p className="text-xs text-amber-300">{t('surfaces.nilam.approvalPending')}</p>}
            {lotGateIssues(l, 'approved', Date.now()).includes('valuation') && (
              <p className="text-xs text-red-300 flex items-center gap-1"><AlertTriangle size={14} /> {t('surfaces.nilam.valuationRequired')}</p>
            )}
            {sanctionNeeded && (
              <p className="text-xs text-amber-300 flex items-center gap-1"><AlertTriangle size={14} /> {t('surfaces.nilam.sanctionRequired')}</p>
            )}
          </div>
        )}

        {/* Notice */}
        {(l.status === 'approved' || l.status === 'noticed') && (
          <div className={cardCls}>
            <h4 className="font-extrabold text-temple-100">{t('surfaces.nilam.noticeTitle')}</h4>
            {l.status === 'approved' && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t('surfaces.nilam.noticeAuctionAt')}</label>
                    <input type="datetime-local" className={inputCls} value={noticeForm.auctionAt}
                      onChange={(e) => setNoticeForm({ ...noticeForm, auctionAt: e.target.value })} />
                    <p className="text-[11px] text-temple-400 mt-1">
                      {t('surfaces.nilam.noticeEarliest')}: {fmtWhen(earliestAuctionAt(l.lotClass, Date.now()))}
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>{t('surfaces.nilam.noticePlace')}</label>
                    <input className={inputCls} value={noticeForm.place}
                      onChange={(e) => setNoticeForm({ ...noticeForm, place: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('surfaces.nilam.noticeEmd')}</label>
                    <input type="number" min="0" className={inputCls} value={noticeForm.emd}
                      onChange={(e) => setNoticeForm({ ...noticeForm, emd: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('surfaces.nilam.noticeObjectionBy')}</label>
                    <input type="date" className={inputCls} value={noticeForm.objectionBy}
                      onChange={(e) => setNoticeForm({ ...noticeForm, objectionBy: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('surfaces.nilam.noticeInspection')}</label>
                    <div className="flex gap-2">
                      <input type="date" className={inputCls} value={noticeForm.inspectionFrom}
                        onChange={(e) => setNoticeForm({ ...noticeForm, inspectionFrom: e.target.value })} />
                      <input type="date" className={inputCls} value={noticeForm.inspectionTo}
                        onChange={(e) => setNoticeForm({ ...noticeForm, inspectionTo: e.target.value })} />
                    </div>
                  </div>
                </div>
                <button type="button" className={btnPrimary} disabled={busy !== ''} onClick={publishNotice}>
                  {t('surfaces.nilam.noticePublish')}
                </button>
              </>
            )}
            {l.status === 'noticed' && l.notice && (
              <>
                <p className="text-sm text-temple-200">
                  {t('surfaces.nilam.noticeAuctionAt')}: <strong>{fmtWhen(l.notice.auctionAt)}</strong>
                  {l.notice.auctionPlace ? ` · ${l.notice.auctionPlace}` : ''}
                  {' · '}{t('surfaces.nilam.noticeEmd')}: {inr(l.notice.emdAmount)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnGhost} onClick={() => doPrint('notice')}>
                    <Printer size={16} /> {t('surfaces.nilam.noticePrint')}
                  </button>
                  <button type="button" className={btnPrimary} disabled={busy !== ''} onClick={() => simpleTransition('open')}>
                    {t('surfaces.nilam.openLot')}
                  </button>
                </div>
                {/* Affixtures */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-temple-300">{t('surfaces.nilam.affixtureTitle')}</h5>
                  {l.affixtures.map((a, i) => (
                    <p key={i} className="text-xs text-temple-300">
                      {t(`surfaces.nilam.affix_${a.place.replace('-', '_')}`)} · {a.date}{a.placeNote ? ` · ${a.placeNote}` : ''}
                    </p>
                  ))}
                  <div className="grid sm:grid-cols-4 gap-2">
                    <select className={inputCls} value={affixForm.place}
                      onChange={(e) => setAffixForm({ ...affixForm, place: e.target.value as (typeof AFFIX_PLACES)[number] })}>
                      {AFFIX_PLACES.map((p) => (
                        <option key={p} value={p}>{t(`surfaces.nilam.affix_${p.replace('-', '_')}`)}</option>
                      ))}
                    </select>
                    <input type="date" className={inputCls} value={affixForm.date}
                      onChange={(e) => setAffixForm({ ...affixForm, date: e.target.value })} />
                    <input className={inputCls} placeholder={t('surfaces.nilam.affixtureNote')} value={affixForm.note}
                      onChange={(e) => setAffixForm({ ...affixForm, note: e.target.value })} />
                    <button type="button" className={btnGhost} disabled={busy !== ''} onClick={addAffixture}>
                      {t('surfaces.nilam.affixtureAdd')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Registrations + objections (noticed / open / accepted) */}
        {['noticed', 'open', 'accepted'].includes(l.status) && (
          <div className={cardCls}>
            <h4 className="font-extrabold text-temple-100">{t('surfaces.nilam.registrationsTitle')} · {totals.count}/{REGISTRATIONS_CAP}</h4>
            <p className="text-xs text-temple-400">
              {t('surfaces.nilam.regEmdHeld')}: {inr(totals.emdHeld)} · {t('surfaces.nilam.regEmdRefunded')}: {inr(totals.emdRefunded)}
              {totals.relatedCount > 0 ? ` · ${totals.relatedCount} ${t('surfaces.nilam.regRelated')}` : ''}
            </p>
            <div className="space-y-2">
              {l.registrations.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-temple-950/60 border border-temple-800 px-3 py-2">
                  <span className="text-sm font-bold text-temple-100">{r.name}</span>
                  <span className="text-xs text-temple-400">{r.phone} · {r.idReference}</span>
                  {r.relatedParty && <span className="text-[11px] font-bold text-amber-300">{t('surfaces.nilam.regRelated')}{r.relationNote ? `: ${r.relationNote}` : ''}</span>}
                  <span className="text-xs text-temple-300">{t('surfaces.nilam.regEmd')}: {inr(r.emdAmount)} ({r.emdMode})</span>
                  {r.barredNote && <span className="text-[11px] font-bold text-red-300">{t('surfaces.nilam.regBarred')}: {r.barredNote}</span>}
                  <span className="ml-auto flex gap-1.5">
                    {!r.refundedAt && (
                      <button type="button" className={btnGhost} disabled={busy !== ''}
                        onClick={() => patchRegistration(r.id, { refundedAt: Date.now() })}>
                        {t('surfaces.nilam.regRefund')}
                      </button>
                    )}
                    {r.refundedAt && <span className="text-[11px] text-emerald-300 flex items-center gap-1"><CheckCircle2 size={13} /> {t('surfaces.nilam.regRefunded')}</span>}
                    {!r.barredNote && (
                      <button type="button" className={btnGhost} disabled={busy !== ''}
                        onClick={() => {
                          const note = window.prompt(t('surfaces.nilam.regBarredPrompt')) || '';
                          if (note.trim()) void patchRegistration(r.id, { barredNote: note.trim() });
                        }}>
                        {t('surfaces.nilam.regBarred')}
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {l.status !== 'accepted' && (
              <div className="grid sm:grid-cols-3 gap-2">
                <input className={inputCls} placeholder={t('surfaces.nilam.regName')} value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} />
                <input className={inputCls} placeholder={t('surfaces.nilam.regPhone')} value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} />
                <input className={inputCls} placeholder={t('surfaces.nilam.regIdRef')} value={regForm.idReference}
                  onChange={(e) => setRegForm({ ...regForm, idReference: e.target.value })} />
                <input type="number" min="0" className={inputCls} placeholder={t('surfaces.nilam.regEmd')} value={regForm.emd}
                  onChange={(e) => setRegForm({ ...regForm, emd: e.target.value })} />
                <select className={inputCls} value={regForm.emdMode}
                  onChange={(e) => setRegForm({ ...regForm, emdMode: e.target.value as 'cash' | 'dd' | 'transfer' })}>
                  <option value="cash">Cash</option>
                  <option value="dd">DD</option>
                  <option value="transfer">Transfer</option>
                </select>
                <input className={inputCls} placeholder="EMD ref" value={regForm.emdReference}
                  onChange={(e) => setRegForm({ ...regForm, emdReference: e.target.value })} />
                <label className="flex items-center gap-2 text-xs text-temple-200 min-h-[44px]">
                  <input type="checkbox" checked={regForm.related}
                    onChange={(e) => setRegForm({ ...regForm, related: e.target.checked })} />
                  {t('surfaces.nilam.regRelated')}
                </label>
                {regForm.related && (
                  <input className={inputCls} placeholder={t('surfaces.nilam.regRelationNote')} value={regForm.relationNote}
                    onChange={(e) => setRegForm({ ...regForm, relationNote: e.target.value })} />
                )}
                <button type="button" className={btnPrimary} disabled={busy !== ''} onClick={addRegistration}>
                  <Plus size={16} /> {t('surfaces.nilam.registrationAdd')}
                </button>
              </div>
            )}

            {/* Objections */}
            <div className="space-y-2 pt-2 border-t border-temple-800">
              <h5 className="text-xs font-bold uppercase tracking-wider text-temple-300">{t('surfaces.nilam.objectionsTitle')}</h5>
              {openObjs.length > 0 && (
                <p className="text-xs text-red-300 flex items-center gap-1"><AlertTriangle size={14} /> {t('surfaces.nilam.objectionsBlock')}</p>
              )}
              {l.objections.map((o) => (
                <div key={o.id} className="rounded-xl bg-temple-950/60 border border-temple-800 px-3 py-2 space-y-1">
                  <p className="text-sm text-temple-100"><strong>{o.objectorName}</strong> · {o.receivedOn}</p>
                  <p className="text-xs text-temple-300">{o.text}</p>
                  {o.response ? (
                    <p className="text-xs text-emerald-300">{o.respondedBy} · {o.respondedOn}: {o.response}</p>
                  ) : (
                    <div className="flex gap-2">
                      <input className={inputCls} placeholder={t('surfaces.nilam.objectionRespond')} value={respondText[o.id] || ''}
                        onChange={(e) => setRespondText({ ...respondText, [o.id]: e.target.value })} />
                      <button type="button" className={btnGhost} disabled={busy !== ''} onClick={() => respondObjection(o.id)}>
                        {t('surfaces.nilam.objectionRespond')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div className="grid sm:grid-cols-3 gap-2">
                <input className={inputCls} placeholder={t('surfaces.nilam.regName')} value={objForm.name}
                  onChange={(e) => setObjForm({ ...objForm, name: e.target.value })} />
                <input type="date" className={inputCls} value={objForm.receivedOn}
                  onChange={(e) => setObjForm({ ...objForm, receivedOn: e.target.value })} />
                <input className={inputCls} placeholder={t('surfaces.nilam.objectionText')} value={objForm.text}
                  onChange={(e) => setObjForm({ ...objForm, text: e.target.value })} />
                <button type="button" className={btnGhost} disabled={busy !== ''} onClick={addObjection}>
                  {t('surfaces.nilam.objectionAdd')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Outcome */}
        {l.status === 'open' && (
          <div className={cardCls}>
            <h4 className="font-extrabold text-temple-100">{t('surfaces.nilam.outcomeTitle')}</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('surfaces.nilam.outcomeWinner')}</label>
                <select className={inputCls} value={outcomeForm.winnerId}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, winnerId: e.target.value })}>
                  <option value="">—</option>
                  {l.registrations.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('surfaces.nilam.outcomeAmount')}</label>
                <input type="number" min="0" className={inputCls} value={outcomeForm.amount}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, amount: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{t('surfaces.nilam.outcomeDate')}</label>
                <input type="date" className={inputCls} value={outcomeForm.date}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, date: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{t('surfaces.nilam.outcomeConductor')}</label>
                <input className={inputCls} value={outcomeForm.conductor}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, conductor: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{t('surfaces.nilam.outcomeAttendance')}</label>
                <input type="number" min="0" className={inputCls} value={outcomeForm.attendance}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, attendance: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-xs text-temple-200 min-h-[44px]">
                <input type="checkbox" checked={outcomeForm.publishName}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, publishName: e.target.checked })} />
                {t('surfaces.nilam.outcomePublishName')}
              </label>
            </div>
            <button type="button" className={btnPrimary} disabled={busy !== '' || !!acceptPending} onClick={recordOutcome}>
              <ShieldCheck size={16} /> {t('surfaces.nilam.outcomeRecord')}
            </button>
            {acceptPending && <p className="text-xs text-amber-300">{t('surfaces.nilam.approvalPending')}</p>}
          </div>
        )}

        {/* Settlement */}
        {l.status === 'accepted' && l.outcome && (
          <div className={cardCls}>
            <h4 className="font-extrabold text-temple-100">{t('surfaces.nilam.settleTitle')}</h4>
            <p className="text-sm text-temple-200">
              {l.outcome.winnerName} · {inr(l.outcome.winningAmount)}
              {' · '}{t('surfaces.nilam.settleDue')}: {inr(balanceDue(l))}
            </p>
            {!l.settlement?.depositTxId ? (
              <div className="flex flex-wrap gap-2">
                <input type="number" min="0" className={inputCls + ' max-w-[180px]'} placeholder={t('surfaces.nilam.settleDeposit')}
                  value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} />
                <select className={inputCls + ' max-w-[180px]'} value={depositForm.mode}
                  onChange={(e) => setDepositForm({ ...depositForm, mode: e.target.value })}>
                  {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button type="button" className={btnPrimary} disabled={busy !== ''} onClick={() => postSettlementLeg('deposit')}>
                  {t('surfaces.nilam.settleDepositPost')}
                </button>
              </div>
            ) : (
              <p className="text-xs text-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={14} /> {t('surfaces.nilam.settleDeposit')}: {inr(l.settlement.depositAmount ?? 0)} · {l.settlement.depositTxId}
              </p>
            )}
            {l.settlement?.depositTxId && !l.settlement?.balanceTxId && (
              <div className="flex flex-wrap gap-2">
                <input type="number" min="0" className={inputCls + ' max-w-[180px]'} placeholder={t('surfaces.nilam.settleBalance')}
                  value={balanceForm.amount} onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })} />
                <select className={inputCls + ' max-w-[180px]'} value={balanceForm.mode}
                  onChange={(e) => setBalanceForm({ ...balanceForm, mode: e.target.value })}>
                  {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button type="button" className={btnPrimary} disabled={busy !== ''} onClick={() => postSettlementLeg('balance')}>
                  {t('surfaces.nilam.settleBalancePost')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Settled / closed record */}
        {(l.status === 'settled' || l.status === 'failed' || l.status === 'withdrawn') && (
          <div className={cardCls}>
            <h4 className="font-extrabold text-temple-100">{statusLabel(l.status)}</h4>
            {l.outcome && (
              <p className="text-sm text-temple-200">
                {l.outcome.winnerName} · {inr(l.outcome.winningAmount)} · {l.outcome.auctionDate}
                {l.settlement?.depositTxId ? ` · ${l.settlement.depositTxId}` : ''}
                {l.settlement?.balanceTxId ? ` · ${l.settlement.balanceTxId}` : ''}
              </p>
            )}
            {l.failReason && <p className="text-sm text-red-300">{l.failReason}</p>}
            {l.status === 'settled' && (
              <button type="button" className={btnGhost} onClick={() => doPrint('result')}>
                <Printer size={16} /> {t('surfaces.nilam.resultPrint')}
              </button>
            )}
          </div>
        )}

        {/* Closure actions */}
        {canTransitionLot(l.status, 'failed') || canTransitionLot(l.status, 'withdrawn') ? (
          <div className={cardCls}>
            <label className={labelCls}>{t('surfaces.nilam.closureReason')}</label>
            <div className="flex flex-wrap gap-2">
              <input className={inputCls + ' flex-1 min-w-[200px]'} value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)} />
              {canTransitionLot(l.status, 'failed') && (
                <button type="button" className={btnGhost} disabled={busy !== ''} onClick={() => closeWithReason('failed')}>
                  {t('surfaces.nilam.failAction')}
                </button>
              )}
              {canTransitionLot(l.status, 'withdrawn') && (
                <button type="button" className={btnGhost} disabled={busy !== ''} onClick={() => closeWithReason('withdrawn')}>
                  {t('surfaces.nilam.withdrawAction')}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderDraftForm = () => (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label className={labelCls}>{t('surfaces.nilam.fieldTitle')}</label>
        <input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>{t('surfaces.nilam.fieldClass')}</label>
        <select className={inputCls} value={draft.lotClass} onChange={(e) => setDraft({ ...draft, lotClass: e.target.value as LotClass })}>
          {CLASSES.map((c) => <option key={c} value={c}>{classLabel(c)}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>{t('surfaces.nilam.fieldSource')}</label>
        <select className={inputCls} value={draft.sourceKind}
          onChange={(e) => setDraft({ ...draft, sourceKind: e.target.value as DraftForm['sourceKind'], sourceRefId: '' })}>
          <option value="asset">{t('surfaces.nilam.source_asset')}</option>
          <option value="property">{t('surfaces.nilam.source_property')}</option>
          <option value="standalone">{t('surfaces.nilam.source_standalone')}</option>
        </select>
      </div>
      {draft.sourceKind === 'asset' && (
        <div>
          <label className={labelCls}>{t('surfaces.nilam.source_asset')}</label>
          <select className={inputCls} value={draft.sourceRefId} onChange={(e) => setDraft({ ...draft, sourceRefId: e.target.value })}>
            <option value="">—</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}
      {draft.sourceKind === 'property' && (
        <div>
          <label className={labelCls}>{t('surfaces.nilam.source_property')}</label>
          <select className={inputCls} value={draft.sourceRefId} onChange={(e) => setDraft({ ...draft, sourceRefId: e.target.value })}>
            <option value="">—</option>
            {bhoomiProperties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      {draft.sourceKind === 'standalone' && (
        <div>
          <label className={labelCls}>{t('surfaces.nilam.sourceLabel')}</label>
          <input className={inputCls} value={draft.sourceLabel} onChange={(e) => setDraft({ ...draft, sourceLabel: e.target.value })} />
        </div>
      )}
      <div>
        <label className={labelCls}>{t('surfaces.nilam.fieldReserve')}</label>
        <input type="number" min="0" className={inputCls} value={draft.reservePrice}
          onChange={(e) => setDraft({ ...draft, reservePrice: e.target.value })} />
      </div>
      {draft.lotClass === 'rights-lease' && (
        <div>
          <label className={labelCls}>{t('surfaces.nilam.leaseTerm')}</label>
          <input type="number" min="0" className={inputCls} value={draft.leaseTermYears}
            onChange={(e) => setDraft({ ...draft, leaseTermYears: e.target.value })} />
        </div>
      )}
      <div className="sm:col-span-2">
        <label className={labelCls}>{t('surfaces.nilam.fieldDescription')}</label>
        <textarea className={inputCls} rows={3} value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>{t('surfaces.nilam.refsLabel')}</label>
        <input className={inputCls} value={draft.mediaRefs} onChange={(e) => setDraft({ ...draft, mediaRefs: e.target.value })} />
      </div>
      {/* Valuation */}
      <div className="sm:col-span-2 pt-2 border-t border-temple-800">
        <h5 className="text-xs font-bold uppercase tracking-wider text-temple-300 mb-2">{t('surfaces.nilam.valuationTitle')}</h5>
        <div className="grid sm:grid-cols-2 gap-3">
          <select className={inputCls} value={draft.valuationKind}
            onChange={(e) => setDraft({ ...draft, valuationKind: e.target.value as DraftForm['valuationKind'] })}>
            <option value="independent-valuer">{t('surfaces.nilam.valuationIndependent')}</option>
            <option value="committee-estimate">{t('surfaces.nilam.valuationCommittee')}</option>
          </select>
          <input type="number" min="0" className={inputCls} placeholder={t('surfaces.nilam.valuationFigure')} value={draft.valuationFigure}
            onChange={(e) => setDraft({ ...draft, valuationFigure: e.target.value })} />
          {draft.valuationKind === 'independent-valuer' && (
            <input className={inputCls} placeholder={t('surfaces.nilam.valuerName')} value={draft.valuerName}
              onChange={(e) => setDraft({ ...draft, valuerName: e.target.value })} />
          )}
          <input type="date" className={inputCls} value={draft.valuedOn}
            onChange={(e) => setDraft({ ...draft, valuedOn: e.target.value })} />
        </div>
      </div>
      {/* Sanction */}
      <div className="sm:col-span-2 pt-2 border-t border-temple-800">
        <h5 className="text-xs font-bold uppercase tracking-wider text-temple-300 mb-2">{t('surfaces.nilam.sanctionTitle')}</h5>
        <div className="grid sm:grid-cols-3 gap-3">
          <input className={inputCls} placeholder={t('surfaces.nilam.sanctionAuthority')} value={draft.sanctionAuthority}
            onChange={(e) => setDraft({ ...draft, sanctionAuthority: e.target.value })} />
          <input className={inputCls} placeholder={t('surfaces.nilam.sanctionReference')} value={draft.sanctionReference}
            onChange={(e) => setDraft({ ...draft, sanctionReference: e.target.value })} />
          <input type="date" className={inputCls} value={draft.sanctionDate}
            onChange={(e) => setDraft({ ...draft, sanctionDate: e.target.value })} />
        </div>
      </div>
    </div>
  );

  /* ---------------- print sheet ---------------- */

  const renderPrintSheet = (l: AuctionLot, mode: 'notice' | 'result') => (
    <div className="receipt-paper print-nilam-notice rounded-2xl p-5">
      <div className="rp-eyebrow text-[11px] font-bold uppercase tracking-widest">
        {activeWorkspace?.name || ''} · {t('surfaces.nilam.deskTitle')}
      </div>
      <div className="rp-title text-2xl font-black mt-1">{l.title}</div>
      <div className="rp-soft text-sm mt-0.5">{classLabel(l.lotClass)} · {l.source.label}</div>
      {l.description && <p className="rp-ink text-sm mt-2">{l.description}</p>}
      <div className="rp-ink text-sm mt-3 space-y-1">
        <p>{t('surfaces.nilam.fieldReserve')}: <strong>{inr(l.reservePrice)}</strong></p>
        {l.valuationBasis && (
          <p>
            {t('surfaces.nilam.valuationTitle')}: {inr(l.valuationBasis.figure)}
            {' '}({l.valuationBasis.kind === 'independent-valuer' ? t('surfaces.nilam.valuationIndependent') : t('surfaces.nilam.valuationCommittee')}
            {l.valuationBasis.valuerName ? ` — ${l.valuationBasis.valuerName}` : ''}
            {l.valuationBasis.valuedOn ? ` — ${l.valuationBasis.valuedOn}` : ''})
          </p>
        )}
        {mode === 'notice' && l.notice && (
          <>
            <p>{t('surfaces.nilam.noticeAuctionAt')}: <strong>{fmtWhen(l.notice.auctionAt)}</strong>{l.notice.auctionPlace ? ` · ${l.notice.auctionPlace}` : ''}</p>
            <p>{t('surfaces.nilam.noticeEmd')}: <strong>{inr(l.notice.emdAmount)}</strong></p>
            {(l.notice.inspectionFrom || l.notice.inspectionTo) && (
              <p>{t('surfaces.nilam.noticeInspection')}: {l.notice.inspectionFrom || ''} — {l.notice.inspectionTo || ''}</p>
            )}
            <p>{t('surfaces.nilam.noticeObjectionBy')}: <strong>{new Date(l.notice.objectionDeadline).toLocaleDateString('en-IN')}</strong></p>
          </>
        )}
        {mode === 'result' && l.outcome && (
          <>
            <p>{t('surfaces.nilam.outcomeWinner')}: <strong>{l.outcome.publishWinnerName ? l.outcome.winnerName : '—'}</strong></p>
            <p>{t('surfaces.nilam.outcomeAmount')}: <strong>{inr(l.outcome.winningAmount)}</strong></p>
            <p>{t('surfaces.nilam.registrationsTitle')}: {l.registrations.length} · {l.outcome.auctionDate}</p>
          </>
        )}
        {l.sanction && (
          <p>{t('surfaces.nilam.sanctionTitle')}: {l.sanction.authority} · {l.sanction.reference} · {l.sanction.date}</p>
        )}
      </div>
      <p className="rp-soft text-xs mt-4">{t('surfaces.nilam.honestyNote')}</p>
    </div>
  );

  /* ---------------- root ---------------- */

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-xl sm:text-2xl font-black text-temple-100 flex items-center gap-2">
            <Gavel className="text-saffron-500" /> {t('surfaces.nilam.deskTitle')}
          </h2>
          <p className="text-sm text-temple-400 mt-1">{t('surfaces.nilam.deskIntro')}</p>
          <p className="text-xs text-temple-500 mt-1">{t('surfaces.nilam.honestyNote')}</p>
        </div>
        <button
          type="button" className={btnPrimary}
          onClick={() => { setCreating(true); setSelectedId(null); setDraft(emptyDraft()); }}
        >
          <Plus size={16} /> {t('surfaces.nilam.newLot')}
        </button>
      </div>

      {creating && (
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-temple-100">{t('surfaces.nilam.newLot')}</h3>
            <button type="button" className={btnGhost} onClick={() => setCreating(false)} aria-label="Close">
              <X size={16} />
            </button>
          </div>
          {renderDraftForm()}
          <button type="button" className={btnPrimary} disabled={busy !== ''} onClick={onCreate}>
            {t('surfaces.nilam.createLot')}
          </button>
        </div>
      )}

      {lots.length === 0 && !creating && (
        <p className="text-sm text-temple-400">{t('surfaces.nilam.emptyLots')}</p>
      )}

      <div className="space-y-3">
        {lots.map((l) => (
          <div key={l.id} className="rounded-2xl bg-temple-900/70 border border-temple-800">
            <button
              type="button"
              className="w-full text-left px-4 sm:px-5 py-4 min-h-[44px] flex flex-wrap items-center gap-2"
              onClick={() => setSelectedId(selectedId === l.id ? null : l.id)}
              aria-expanded={selectedId === l.id}
            >
              <span className="font-extrabold text-temple-100">{l.title}</span>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-temple-800 text-temple-200">{classLabel(l.lotClass)}</span>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-saffron-600/20 text-saffron-400">{statusLabel(l.status)}</span>
              <span className="text-xs text-temple-400 ml-auto">{t('surfaces.nilam.fieldReserve')}: {inr(l.reservePrice)}</span>
            </button>
            {selectedId === l.id && (
              <div className="px-4 sm:px-5 pb-5">{renderLotDetail(l)}</div>
            )}
          </div>
        ))}
      </div>

      {printMode && lot && renderPrintSheet(lot, printMode)}
    </div>
  );
};

export default NilamDesk;
