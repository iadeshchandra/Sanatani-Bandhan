/**
 * GateRegisterPanel — REAL-WORLD PACK: the printable gate register.
 * =====================================================================
 * Lives in the War Room, in the day-of cluster beside the pass
 * ledger — because the register is a PLANNING document: the
 * committee prints it BEFORE the day, from the same festival_rsvps
 * records the gate admits from, and the gate volunteer ticks the
 * blank column by hand as each party arrives. (The QR Gate Scanner
 * desk is a phone-in-hand scanning surface — a print flow there
 * would interrupt scanning, and the gate phone is rarely the
 * device with the printer.)
 *
 * The sheet is .receipt-paper under the E4 print idiom
 * (print.css :has isolation): paper colours only, no Sandhya
 * rules inside. The CSV export is the whole festival's confirmed
 * list — built by the same pure builders (lib/gateRegister).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { Card, Btn, fmtDate } from '../../utsav/ui';
import { db } from '../../lib/firebase';
import { festivalDayList, type WarFestival, type WarRoomPlan } from '../../lib/festival';
import type { EventTicket } from '../../lib/eventTickets';
import {
  buildAttendeeCsvRows, buildGateRegisterRows, gateRegisterTotals,
} from '../../lib/gateRegister';
import { useFestivalCloud } from './festivalWarStore';

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
}

/* The DebriefCard CSV idiom, kept per-file like the house pattern. */
const csvEscape = (rows: string[][]) =>
  rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
const downloadCsv = (name: string, text: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

export const GateRegisterPanel: React.FC<Props> = ({ wf, plan }) => {
  const { t, language } = useLanguage();
  const { activeWorkspace } = useAuthWorkspace();
  const cloud = useFestivalCloud(activeWorkspace.id, wf.key);
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'event_tickets'), where('festivalId', '==', plan.id));
    const unsub = onSnapshot(
      q,
      (snap) => setTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventTicket, 'id'>) }))),
      () => { /* staff-only read; offline keeps the last list */ }
    );
    return unsub;
  }, [plan.id]);

  const ticketsById = useMemo(() => new Map(tickets.map((x) => [x.id, x])), [tickets]);
  const days = useMemo(() => festivalDayList(wf.dateISO, wf.endDateISO), [wf.dateISO, wf.endDateISO]);
  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState<string>('');
  const selectedDay = day && days.includes(day) ? day : (days.includes(today) ? today : days[0] || wf.dateISO);

  const rows = useMemo(
    () => buildGateRegisterRows(cloud.rsvps, ticketsById, selectedDay),
    [cloud.rsvps, ticketsById, selectedDay]
  );
  const totals = useMemo(() => gateRegisterTotals(rows), [rows]);

  const lang = (language || 'en').slice(0, 2);
  const festivalName = lang === 'bn' ? wf.name.bn : lang === 'hi' ? wf.name.hi : wf.name.en;

  /* Print — the DebriefCard idiom: mark the sheet, let it paint,
   * print, unmark. print.css isolates .print-gate-register. */
  const printSheet = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
  };

  const exportCsv = () => {
    downloadCsv(
      `gate-attendees-${wf.dateISO}.csv`,
      csvEscape(buildAttendeeCsvRows(cloud.rsvps, ticketsById, days))
    );
  };

  return (
    <Card>
      <h3 className="font-extrabold text-stone-800 mb-1">🎟️ {t('surfaces.events.gateRegTitle')}</h3>
      <p className="text-xs text-stone-500 mb-3">{t('surfaces.events.gateRegIntro')}</p>

      {days.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label={t('surfaces.events.gateRegTitle')}>
          {days.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={selectedDay === d}
              onClick={() => setDay(d)}
              className={`px-3 py-2 rounded-xl border-2 text-xs font-bold min-h-[44px] transition ${
                selectedDay === d
                  ? 'border-orange-600 bg-orange-50 text-orange-900'
                  : 'border-stone-200 bg-white text-stone-500'
              }`}
            >
              {fmtDate(d)}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-stone-400">{t('surfaces.events.gateRegEmpty')}</p>
      ) : (
        <>
          <p className="text-sm font-bold text-stone-700 mb-3">
            {t('surfaces.events.gateRegExpected')
              .replace('{parties}', String(totals.parties))
              .replace('{heads}', String(totals.heads))}
            {' · '}{fmtDate(selectedDay)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={printSheet}>{t('surfaces.events.gateRegPrint')}</Btn>
            <Btn variant="ghost" onClick={exportCsv}>{t('surfaces.events.gateRegCsv')}</Btn>
          </div>
        </>
      )}

      {/* ── The printable sheet — paper only ─────────────────── */}
      {printing && (
        <div className="receipt-paper print-gate-register rounded-2xl p-5">
          <div className="rp-eyebrow text-[11px] font-bold uppercase tracking-widest">
            {activeWorkspace.name || ''} · {fmtDate(selectedDay)}
          </div>
          <div className="rp-title text-2xl font-black mt-1">{festivalName}</div>
          <div className="rp-soft text-sm mt-0.5">
            {t('surfaces.events.gateRegTitle')} · {t('surfaces.events.gateRegExpected')
              .replace('{parties}', String(totals.parties))
              .replace('{heads}', String(totals.heads))}
          </div>
          <table className="w-full mt-4 text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="paper-line border-t border-b">
                <th className="text-left py-2 pr-2">{t('surfaces.events.gateRegColParty')}</th>
                <th className="text-right py-2 px-2">{t('surfaces.events.gateRegColHeads')}</th>
                <th className="text-left py-2 px-2">{t('surfaces.events.gateRegColPass')}</th>
                <th className="text-left py-2 px-2">{t('surfaces.events.gateRegColPhone')}</th>
                <th className="text-center py-2 pl-2" style={{ width: '15%' }}>{t('surfaces.events.gateRegColAdmitted')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.name}-${i}`} className="paper-line border-b">
                  <td className="py-2 pr-2 font-semibold rp-ink">{r.name}</td>
                  <td className="py-2 px-2 text-right tnum">{r.headcount}</td>
                  <td className="py-2 px-2">{r.tierName || '—'}</td>
                  <td className="py-2 px-2">{r.phone || '—'}</td>
                  <td className="py-2 pl-2 text-center">{r.checkedIn ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default GateRegisterPanel;
