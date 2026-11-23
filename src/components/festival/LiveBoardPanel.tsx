/**
 * LiveBoardPanel — NEXT-LEVEL A4: the festival's live notice board.
 * =====================================================================
 * The War Room surface for the `liveBoard` field on the published
 * festival_events doc: gate notes, lost & found, announcements —
 * posted by the organising team on the day, read read-free on the
 * public festival page the moment they land.
 *
 * Write path (verified against firestore.rules before building):
 * the festival_events update clause admits staff via
 * hasRole(docWs(), R_BOARD()) with NO key-set pin, and the house
 * pattern for staff-stamped fields on this doc is exactly this —
 * setDoc merge (PublishPanel's festivalCancelled, DebriefCard's
 * debriefSummary, SponsorsStallsPanel's sponsorThanks). So the
 * board writes the whole next array through that same merge; no
 * rules change, no new collection. Every array is shaped by
 * lib/liveBoard first (sanitise → append/resolve/remove → cap), so
 * what reaches the doc is always a shape the builders produced.
 *
 * The board lives ON the published page: with no published doc
 * there is nothing to write to, and the panel teaches that instead
 * of queueing notes nobody can see.
 *
 * Text is the organiser's own words — the lib trims and caps it,
 * nothing scans or rewrites it. The composer's phone-number line
 * is a hint (the board is public), never a block.
 */
import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { Btn, Card, inputCls } from '../../utsav/ui';
import { db } from '../../lib/firebase';
import { timeAgo } from '../../lib/p2pLedger';
import type { FestivalEventDoc, WarFestival, WarRoomPlan } from '../../lib/festival';
import {
  appendBoardEntry,
  makeBoardEntry,
  removeBoardEntry,
  resolveBoardEntry,
  sanitiseBoard,
  type LiveBoardEntry,
  type LiveBoardKind,
} from '../../lib/liveBoard';

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
  event: FestivalEventDoc | null;
}

const KIND_ICON: Record<LiveBoardKind, string> = {
  gate: '🚪',
  lost: '🧭',
  found: '🧺',
  announcement: '📣',
};

const KIND_ORDER: LiveBoardKind[] = ['gate', 'lost', 'found', 'announcement'];

let boardSeq = 0;
const newEntryId = () =>
  `lb_${Date.now().toString(36)}_${(boardSeq += 1).toString(36)}`;

export const LiveBoardPanel: React.FC<Props> = ({ plan, event }) => {
  const { t, currentLang } = useLanguage();
  const lang2 = (currentLang || 'en').slice(0, 2);
  const agoLang = lang2 === 'bn' || lang2 === 'hi' ? lang2 : 'en';

  const [kind, setKind] = useState<LiveBoardKind>('announcement');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<'posted' | 'failed' | null>(null);

  const board = sanitiseBoard(event?.liveBoard);
  // Staff manage chronologically — newest first. (The public page
  // re-orders for readers via boardForDisplay.)
  const staffOrder = [...board].sort((a, b) => b.at - a.at);

  const kindLabel = (k: LiveBoardKind) =>
    t(`surfaces.events.boardKind${k.charAt(0).toUpperCase()}${k.slice(1)}`);

  const write = async (next: LiveBoardEntry[]): Promise<boolean> => {
    setBusy(true);
    setNote(null);
    try {
      await setDoc(doc(db, 'festival_events', plan.id), { liveBoard: next }, { merge: true });
      return true;
    } catch {
      setNote('failed');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const post = async () => {
    const entry = makeBoardEntry(kind, text, Date.now(), newEntryId());
    if (!entry || busy) return;
    if (await write(appendBoardEntry(board, entry))) {
      setText('');
      setNote('posted');
    }
  };

  const title = (
    <h3 className="font-extrabold text-stone-800 mb-1">📌 {t('surfaces.events.boardTitle')}</h3>
  );

  if (!event) {
    return (
      <Card>
        {title}
        <p className="text-xs text-stone-500">{t('surfaces.events.boardNotPublished')}</p>
      </Card>
    );
  }

  return (
    <Card>
      {title}
      <p className="text-xs text-stone-500 mb-3">{t('surfaces.events.boardIntro')}</p>
      {note === 'posted' && (
        <div className="text-xs font-bold text-emerald-700 mb-2">{t('surfaces.events.boardPosted')}</div>
      )}
      {note === 'failed' && (
        <div className="text-xs font-bold text-red-700 mb-2">{t('surfaces.events.boardSaveFailed')}</div>
      )}

      {/* ── Composer ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 mb-2" role="group" aria-label={t('surfaces.events.boardTitle')}>
        {KIND_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`px-3 py-2 rounded-full text-xs font-black min-h-[44px] border transition ${
              kind === k
                ? 'bg-cta text-white border-transparent'
                : 'bg-white text-stone-600 border-stone-200 hover:border-saffron-400'
            }`}
          >
            {KIND_ICON[k]} {kindLabel(k)}
          </button>
        ))}
      </div>
      <textarea
        className={inputCls}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('surfaces.events.boardTextPlaceholder')}
        aria-label={t('surfaces.events.boardTitle')}
      />
      <p className="text-[11px] text-stone-400 mt-1.5">{t('surfaces.events.boardHint')}</p>
      <Btn className="!min-h-[44px] mt-2" disabled={busy || !text.trim()} onClick={() => void post()}>
        {t('surfaces.events.boardPost')}
      </Btn>

      {/* ── Current board ────────────────────────────────────── */}
      {staffOrder.length === 0 ? (
        <p className="text-xs text-stone-500 mt-4">{t('surfaces.events.boardEmpty')}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {staffOrder.map((e) => (
            <li
              key={e.id}
              className={`rounded-xl border px-3 py-2.5 ${
                e.resolved ? 'border-stone-100 bg-stone-50/60' : 'border-orange-100 bg-orange-50/40'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wide text-orange-800 bg-orange-100 rounded-full px-2 py-0.5">
                  {KIND_ICON[e.kind]} {kindLabel(e.kind)}
                </span>
                <span className="text-[11px] text-stone-500">{timeAgo(e.at, agoLang)}</span>
                {e.resolved && (
                  <span className="text-[10px] font-black uppercase tracking-wide text-emerald-800 bg-emerald-100 rounded-full px-2 py-0.5">
                    {t('surfaces.events.boardResolvedTag')}
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 ${e.resolved ? 'text-stone-400' : 'text-stone-700'}`}>{e.text}</p>
              <div className="flex gap-2 mt-1.5">
                {(e.kind === 'lost' || e.kind === 'found') && !e.resolved && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void write(resolveBoardEntry(board, e.id))}
                    className="px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] border bg-white border-emerald-200 text-emerald-800 hover:border-emerald-400 disabled:opacity-50"
                  >
                    ✓ {t('surfaces.events.boardResolve')}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void write(removeBoardEntry(board, e.id))}
                  className="px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] border bg-white border-stone-200 text-stone-500 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                >
                  {t('surfaces.events.boardRemove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default LiveBoardPanel;
