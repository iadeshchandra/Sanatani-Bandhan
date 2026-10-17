/**
 * CrisisDetailDrawer — shared incident drawer (map pins + triage rows).
 * =========================================================================
 * Sections: who / what / where / medical / voice / response timeline /
 * coordinator actions (acknowledge, assign, escalate, broadcast, resolve).
 * All actions are RBAC-gated from the `access` prop (fail-closed).
 * Mobile-first bottom sheet; side panel on desktop. ≥44px targets.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { subscribeToResponses } from './sosService';
import {
  X, MapPin, Phone, MessageSquare, Megaphone, CheckCircle2, UserCheck,
  Droplet, BadgeCheck, Clock, ChevronDown, Play,
} from 'lucide-react';
import { db } from '../firebase';
import type { WorkspaceMembership } from '../types/membership';
import type {
  CrisisAccess,
  CrisisEvent,
  CrisisResponse,
} from './crisisCommandTypes';
import { tsToMs } from './crisisCommandTypes';
import { useCrisisT } from './crisisI18n';
import { SITUATION_ICON, SEVERITY_STYLE, relTime } from './crisisShared';
import {
  acknowledgeEvent,
  assignSevadars,
  broadcastAlert,
  buildEscalateLinks,
  resolveEvent,
  setResponseStatus,
  type Actor,
} from './crisisActions';

function ActionButton(props: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`min-h-[48px] px-4 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 ${props.className ?? ''}`}
    >
      {props.children}
    </button>
  );
}

interface Props {
  event: CrisisEvent | null;
  access: CrisisAccess;
  actor: Actor;
  orgId: string;
  onClose: () => void;
}

export const CrisisDetailDrawer: React.FC<Props> = ({
  event,
  access,
  actor,
  orgId,
  onClose,
}) => {
  const t = useCrisisT();
  const [responses, setResponses] = useState<CrisisResponse[]>([]);
  const [members, setMembers] = useState<WorkspaceMembership[]>([]);
  const [panel, setPanel] = useState<'none' | 'assign' | 'escalate' | 'broadcast' | 'resolve'>('none');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [areaText, setAreaText] = useState('');
  const [outcome, setOutcome] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setPanel('none');
    setSelected(new Set());
    setOutcome('');
    setAreaText('');
    if (!event) return;
    // Phase 1's single responses subscription (oldest first = timeline order).
    const unsub = subscribeToResponses(event.id, setResponses);
    return () => unsub();
  }, [event?.id]);

  // Load org members once per drawer session (for the assign picker).
  useEffect(() => {
    if (!event || !orgId) return;
    getDocs(
      query(
        collection(db, 'workspaceMembers'),
        where('workspaceId', '==', orgId),
        limit(200),
      ),
    )
      .then((snap) => {
        const list: WorkspaceMembership[] = [];
        snap.forEach((d) => list.push(d.data() as WorkspaceMembership));
        setMembers(list);
      })
      .catch(() => setMembers([]));
  }, [event?.id, orgId]);

  const links = useMemo(
    () => (event ? buildEscalateLinks(event) : null),
    [event],
  );

  if (!event) return null;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2800);
  };

  const guard = (ok: boolean) => {
    if (!ok) flash(t('act.noPermission'));
    return ok;
  };

  const doAcknowledge = async () => {
    if (!guard(access.canAcknowledge) || busy) return;
    setBusy(true);
    try {
      await acknowledgeEvent(event, actor);
      flash(t('act.acknowledged'));
    } catch {
      flash(t('act.noPermission'));
    } finally {
      setBusy(false);
    }
  };

  const doAssign = async () => {
    if (!guard(access.canAssign) || busy || selected.size === 0) return;
    setBusy(true);
    try {
      const assignees = members
        .filter((m) => selected.has(m.uid))
        .map((m) => ({ uid: m.uid, name: m.displayName || m.uid }));
      await assignSevadars(event, actor, assignees, orgId);
      flash(t('act.assigned'));
      setPanel('none');
    } catch {
      flash(t('act.noPermission'));
    } finally {
      setBusy(false);
    }
  };

  const doBroadcast = async () => {
    if (!guard(access.canBroadcast) || busy || !areaText.trim()) return;
    setBusy(true);
    try {
      await broadcastAlert(event, actor, orgId, areaText.trim());
      flash(t('act.broadcastSent'));
      setPanel('none');
    } catch {
      flash(t('act.noPermission'));
    } finally {
      setBusy(false);
    }
  };

  const doResolve = async () => {
    if (!guard(access.canResolve) || busy) return;
    if (!outcome.trim()) {
      flash(t('act.outcomeRequired'));
      return;
    }
    setBusy(true);
    try {
      await resolveEvent(event, actor, outcome);
      flash(t('act.resolved'));
      setPanel('none');
      onClose();
    } catch (e: any) {
      flash(e?.message === 'outcome-required' ? t('act.outcomeRequired') : t('act.noPermission'));
    } finally {
      setBusy(false);
    }
  };

  const doRespond = async (status: 'coming' | 'arrived') => {
    if (!guard(access.canRespond) || busy) return;
    setBusy(true);
    try {
      await setResponseStatus(event.id, actor, undefined, status);
      flash(status === 'arrived' ? t('drawer.arrived') : t('drawer.coming'));
    } catch {
      flash(t('act.noPermission'));
    } finally {
      setBusy(false);
    }
  };

  const sev = event.severity;
  const createdMs = tsToMs(event.createdAt);
  const capturedMs = event.location?.capturedAt ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t('dash.title')}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:w-[430px] sm:h-full max-h-[92vh] bg-white rounded-t-3xl sm:rounded-none sm:rounded-l-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-200 bg-gradient-to-r from-red-50 to-amber-50">
          <div className={`p-2 rounded-xl ${SEVERITY_STYLE[sev] ?? 'bg-stone-500 text-white'}`}>
            {SITUATION_ICON[event.situation]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[17px] text-stone-900 truncate">
                {t(`sit.${event.situation}`)}
              </h2>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_STYLE[sev] ?? ''}`}>
                {t(`sev.${sev}`)}
              </span>
            </div>
            <p className="text-[12px] text-stone-500">
              {t(`st.${event.status}`)} · {relTime(createdMs, t)}
              {event.autoGenerated ? ` · ${t('triage.autoCrowd')}` : ''}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('act.close')}
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-stone-100 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* who */}
          <section>
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-stone-400 mb-2">
              {t('drawer.who')}
            </h3>
            <div className="flex items-center gap-3">
              {event.senderPhoto ? (
                <img src={event.senderPhoto} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-amber-200" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xl">
                  {(event.senderName || '?').charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <p className="font-bold text-stone-900 text-[16px]">{event.senderName}</p>
                <div className="flex flex-wrap gap-2 mt-1 text-[12px]">
                  {event.sanId ? (
                    <span className="inline-flex items-center gap-1 bg-stone-100 rounded-full px-2 py-1 text-stone-700">
                      <BadgeCheck size={13} /> {t('drawer.sanId')}: {event.sanId}
                    </span>
                  ) : null}
                  {event.bloodGroup ? (
                    <span className="inline-flex items-center gap-1 bg-red-50 rounded-full px-2 py-1 text-red-700 font-semibold">
                      <Droplet size={13} /> {t('drawer.bloodGroup')}: {event.bloodGroup}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            {event.familyNotified && event.familyNotified.length > 0 ? (
              <p className="mt-2 text-[13px] text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={14} /> {t('drawer.familyNotified')} ({event.familyNotified.length})
              </p>
            ) : null}
          </section>

          {/* what */}
          <section>
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-stone-400 mb-2">
              {t('drawer.what')}
            </h3>
            <p className="text-[15px] text-stone-800 leading-relaxed">
              {event.details || t(`sit.${event.situation}`)}
            </p>
            {event.voiceNoteUrl ? (
              <div className="mt-2 flex items-center gap-2 bg-stone-50 rounded-2xl p-3">
                <Play size={18} className="text-stone-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-[12px] text-stone-500 mb-1">{t('drawer.voiceNote')}</p>
                  <audio controls src={event.voiceNoteUrl} className="w-full h-9" />
                </div>
              </div>
            ) : null}
          </section>

          {/* where */}
          <section>
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-stone-400 mb-2">
              {t('drawer.where')}
            </h3>
            <div className="flex items-start gap-2 bg-stone-50 rounded-2xl p-3">
              <MapPin size={18} className="text-red-600 mt-0.5 shrink-0" />
              <div className="text-[14px] text-stone-800">
                <p>{event.location?.address || (event.location ? `${event.location.lat.toFixed(5)}, ${event.location.lng.toFixed(5)}` : '—')}</p>
                {capturedMs > 0 ? (
                  <p className="text-[12px] text-stone-500 mt-1 flex items-center gap-1">
                    <Clock size={12} /> {t('drawer.capturedAgo')} · {relTime(capturedMs, t)}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* medical — Phase 1 shape is string[]; tolerate legacy strings too */}
          {(() => {
            const medList = (v: unknown): string =>
              Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : '';
            const allergies = medList(event.medicalShare?.allergies);
            const conditions = medList(event.medicalShare?.conditions);
            if (!allergies && !conditions) return null;
            return (
              <section>
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-stone-400 mb-2">
                  {t('drawer.medical')}
                </h3>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-[14px] space-y-1">
                  {allergies ? (
                    <p className="text-stone-800"><span className="font-semibold">{t('drawer.allergies')}:</span> {allergies}</p>
                  ) : null}
                  {conditions ? (
                    <p className="text-stone-800"><span className="font-semibold">{t('drawer.conditions')}:</span> {conditions}</p>
                  ) : null}
                </div>
              </section>
            );
          })()}

          {/* responders */}
          <section>
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-stone-400 mb-2">
              {t('drawer.responders')} ({responses.length})
            </h3>
            {responses.length === 0 ? (
              <p className="text-[14px] text-stone-500 bg-amber-50 border border-amber-100 rounded-2xl p-3">
                {t('drawer.noResponders')}
              </p>
            ) : (
              <ul className="space-y-2">
                {responses.map((r) => (
                  <li key={r.uid} className="flex items-center gap-3 bg-stone-50 rounded-2xl p-2.5">
                    {r.photo ? (
                      <img src={r.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center font-bold text-stone-600">
                        {(r.name || '?').charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px] text-stone-900 truncate">{r.name}</p>
                      <p className="text-[12px] text-stone-500">
                        {r.status === 'arrived' ? t('drawer.arrived') : t('drawer.coming')}
                        {typeof r.distanceM === 'number' ? ` · ${Math.round(r.distanceM)} m` : ''}
                      </p>
                    </div>
                    <span className={`w-3 h-3 rounded-full ${r.status === 'arrived' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* action panels */}
          {panel === 'assign' && access.canAssign ? (
            <section className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3">
              <h3 className="font-bold text-[15px] text-indigo-900 mb-2">{t('act.assignTitle')}</h3>
              <ul className="max-h-52 overflow-y-auto space-y-1.5">
                {members.map((m) => (
                  <li key={m.uid}>
                    <label className="flex items-center gap-3 min-h-[48px] bg-white rounded-xl px-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-indigo-600"
                        checked={selected.has(m.uid)}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.uid)) next.delete(m.uid);
                            else next.add(m.uid);
                            return next;
                          })
                        }
                      />
                      <span className="flex-1 text-[15px] text-stone-800">{m.displayName || m.uid}</span>
                      <span className="text-[12px] text-stone-400">{m.role}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <ActionButton
                label={t('act.assign')}
                onClick={doAssign}
                disabled={busy || selected.size === 0}
                className="w-full mt-3 bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 shadow-[0_4px_14px_rgba(180,83,9,0.35)]"
              >
                <UserCheck size={18} /> {t('act.assign')} ({selected.size})
              </ActionButton>
            </section>
          ) : null}

          {panel === 'escalate' && access.canEscalate && links ? (
            <section className="bg-red-50 border border-red-100 rounded-2xl p-3 space-y-2">
              <h3 className="font-bold text-[15px] text-red-900">{t('act.escalate')}</h3>
              <a href={links.tel108} className="min-h-[52px] flex items-center justify-center gap-2 rounded-2xl bg-red-600 text-white font-bold text-[16px] active:scale-[0.98]">
                <Phone size={20} /> {t('act.callAmbulance')}
              </a>
              <a href={links.tel101} className="min-h-[52px] flex items-center justify-center gap-2 rounded-2xl bg-orange-600 text-white font-bold text-[16px] active:scale-[0.98]">
                <Phone size={20} /> {t('act.callFire')}
              </a>
              <a href={links.tel100} className="min-h-[52px] flex items-center justify-center gap-2 rounded-2xl bg-stone-800 text-white font-bold text-[16px] active:scale-[0.98]">
                <Phone size={20} /> {t('act.callPolice')}
              </a>
              <a href={links.sms} className="min-h-[52px] flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-red-200 text-red-700 font-bold text-[16px] active:scale-[0.98]">
                <MessageSquare size={20} /> {t('act.smsHelpline')}
              </a>
            </section>
          ) : null}

          {panel === 'broadcast' && access.canBroadcast ? (
            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <h3 className="font-bold text-[15px] text-amber-900 mb-1">{t('act.broadcastTitle')}</h3>
              <p className="text-[13px] text-amber-800 mb-2">{t('act.broadcastHint')}</p>
              <input
                type="text"
                value={areaText}
                onChange={(e) => setAreaText(e.target.value)}
                placeholder={t('act.broadcastPlaceholder')}
                className="w-full min-h-[48px] rounded-xl border border-amber-200 px-3 text-[15px] bg-white"
              />
              <ActionButton
                label={t('act.send')}
                onClick={doBroadcast}
                disabled={busy || !areaText.trim()}
                className="w-full mt-2 bg-amber-500 text-white"
              >
                <Megaphone size={18} /> {t('act.send')}
              </ActionButton>
            </section>
          ) : null}

          {panel === 'resolve' && access.canResolve ? (
            <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
              <h3 className="font-bold text-[15px] text-emerald-900 mb-1">{t('act.resolveTitle')}</h3>
              <label className="text-[13px] text-emerald-800 font-semibold" htmlFor="crisis-outcome">
                {t('act.outcomeLabel')}
              </label>
              <textarea
                id="crisis-outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder={t('act.outcomePlaceholder')}
                rows={3}
                className="w-full mt-1 rounded-xl border border-emerald-200 px-3 py-2 text-[15px] bg-white"
              />
              <ActionButton
                label={t('act.resolve')}
                onClick={doResolve}
                disabled={busy}
                className="w-full mt-2 bg-emerald-600 text-white"
              >
                <CheckCircle2 size={18} /> {t('act.resolve')}
              </ActionButton>
            </section>
          ) : null}

          {toast ? (
            <div className="sticky bottom-0 bg-stone-900 text-white text-[14px] rounded-2xl px-4 py-3 text-center shadow-lg">
              {toast}
            </div>
          ) : null}
        </div>

        {/* footer actions */}
        <div className="border-t border-stone-200 px-4 py-3 bg-white">
          <div className="grid grid-cols-2 gap-2">
            {access.canAcknowledge && event.status === 'active' ? (
              <ActionButton label={t('act.acknowledge')} onClick={doAcknowledge} disabled={busy} className="bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 col-span-2 shadow-[0_4px_14px_rgba(180,83,9,0.35)]">
                <BadgeCheck size={18} /> {t('act.acknowledge')}
              </ActionButton>
            ) : null}
            {access.canAssign ? (
              <ActionButton
                label={t('act.assign')}
                onClick={() => setPanel(panel === 'assign' ? 'none' : 'assign')}
                className="bg-amber-100 text-amber-900"
              >
                <UserCheck size={18} /> {t('act.assign')}
              </ActionButton>
            ) : null}
            {access.canEscalate ? (
              <ActionButton
                label={t('act.escalate')}
                onClick={() => setPanel(panel === 'escalate' ? 'none' : 'escalate')}
                className="bg-red-100 text-red-800"
              >
                <Phone size={18} /> {t('act.escalate')}
              </ActionButton>
            ) : null}
            {access.canBroadcast ? (
              <ActionButton
                label={t('act.broadcast')}
                onClick={() => setPanel(panel === 'broadcast' ? 'none' : 'broadcast')}
                className="bg-amber-100 text-amber-900"
              >
                <Megaphone size={18} /> {t('act.broadcast')}
              </ActionButton>
            ) : null}
            {access.canResolve ? (
              <ActionButton
                label={t('act.resolve')}
                onClick={() => setPanel(panel === 'resolve' ? 'none' : 'resolve')}
                className="bg-emerald-100 text-emerald-900"
              >
                <CheckCircle2 size={18} /> {t('act.resolve')}
              </ActionButton>
            ) : null}
          </div>
          {access.canRespond ? (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ActionButton label={t('drawer.imComing')} onClick={() => doRespond('coming')} disabled={busy} className="bg-stone-100 text-stone-800">
                {t('drawer.imComing')}
              </ActionButton>
              <ActionButton label={t('drawer.markArrived')} onClick={() => doRespond('arrived')} disabled={busy} className="bg-stone-100 text-stone-800">
                {t('drawer.markArrived')}
              </ActionButton>
            </div>
          ) : null}
          {panel !== 'none' ? (
            <button
              type="button"
              onClick={() => setPanel('none')}
              className="mt-2 w-full min-h-[44px] text-[14px] text-stone-500 flex items-center justify-center gap-1"
            >
              <ChevronDown size={16} /> {t('act.close')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
