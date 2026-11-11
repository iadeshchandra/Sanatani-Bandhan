import React, { useMemo } from 'react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import type { TreasuryTransaction } from '../../types';

/* ------------------------------------------------------------------ */
/* WeekShape — Clean Dashboard D2: the Week Shape (Zone C).            */
/* A hand-rolled inline SVG 7-day collections chart for the role       */
/* homes — deliberately NOT recharts (spec §4): the home sits on the   */
/* shell's critical path, so the week's shape is ~30 lines of SVG      */
/* rects over data the homes already load. Static SVG — nothing to     */
/* step down at dusk; its fills are semantic classes (index.css:       */
/* .week-shape .ws-bar-*) registered in the Sandhya layer per the E4   */
/* law. Income wears the peacock/emerald family; the Accountant        */
/* variant adds each day's expense as a wider rose bar behind the      */
/* income bar; today's income bar wears --cta. Values live on the      */
/* bars' <title> (hover/tap) only — the glance is the shape itself,    */
/* captioned "Collections · last 7 days".                              */
/*                                                                     */
/* Windowed honesty (spec §8 mitigation — hard law): the buckets read  */
/* the loaded treasury window, exactly as the Day Band's sums do;      */
/* when that window is partial the caption carries the band's own      */
/* "Loaded window" qualifier pill, so the shape never silently         */
/* presents a windowed week as an exact one.                           */
/* ------------------------------------------------------------------ */

/** Local-timezone YYYY-MM-DD — the same algorithm as RoleHome's
 *  todayISO, kept local so this leaf component never imports its
 *  parent (no cycle); the day filter below is D1's exact pattern. */
function dayISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface DayBucket {
  /** Local YYYY-MM-DD of the bucket's day. */
  iso: string;
  /** Day-of-month number, shown under the bar. */
  dayOfMonth: number;
  income: number;
  expense: number;
}

/**
 * Daily bucketing — the D2 NEW COMPUTATION, shared-helper form:
 * Σ Income and Σ Expense per day for the last 7 days including
 * today, oldest → newest, using D1/AccountantHome's day filter
 * ((tx.date || '').slice(0, 10) === iso) once per day.
 */
export function last7DayBuckets(
  treasury: ReadonlyArray<Pick<TreasuryTransaction, 'date' | 'type' | 'amount'>>
): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let back = 6; back >= 0; back--) {
    const d = new Date();
    d.setDate(d.getDate() - back);
    const iso = dayISO(d);
    let income = 0;
    let expense = 0;
    for (const tx of treasury) {
      if ((tx.date || '').slice(0, 10) !== iso) continue;
      if (tx.type === 'Income') income += tx.amount || 0;
      else if (tx.type === 'Expense') expense += tx.amount || 0;
    }
    buckets.push({ iso, dayOfMonth: d.getDate(), income, expense });
  }
  return buckets;
}

/* Chart geometry (viewBox units): 7 slots of 44, baseline at y=64,
   tallest bar 56 — proportions stay identical at every width
   because the SVG scales to the card. */
const SLOT = 44;
const BASELINE_Y = 64;
const MAX_BAR_H = 56;
const MIN_BAR_H = 3;
const EMPTY_H = 2;

export const WeekShape: React.FC<{
  /** 'income' — Trustee form (collections only).
   *  'incomeExpense' — Accountant form (expense bar behind income). */
  variant?: 'income' | 'incomeExpense';
}> = ({ variant = 'income' }) => {
  const { t, safeTranslate } = useLanguage();
  const { activeWorkspace } = useAuthWorkspace();
  const { treasury, collectionWindows } = useData();

  const buckets = useMemo(() => last7DayBuckets(treasury), [treasury]);
  const treasuryWindowed = !!(collectionWindows as any)?.treasury?.windowed;

  const showExpense = variant === 'incomeExpense';
  const maxValue = buckets.reduce(
    (m, b) => Math.max(m, b.income, showExpense ? b.expense : 0),
    0
  );
  const heightFor = (v: number) =>
    v > 0 && maxValue > 0 ? Math.max(MIN_BAR_H, (v / maxValue) * MAX_BAR_H) : EMPTY_H;
  const money = (v: number) =>
    `${activeWorkspace.currencySymbol} ${Math.round(v).toLocaleString('en-IN')}`;
  const caption = t('surfaces.roleHome.collectionsLast7Days');

  return (
    <div className="week-shape bg-white p-4 rounded-xl shadow-sm border border-temple-200 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-temple-600 uppercase tracking-widest">
          {caption}
        </span>
        {treasuryWindowed &&
          (variant === 'income' ? (
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
              {safeTranslate('kpi_treasury_partial', 'Loaded window only', 'শুধু লোড করা অংশ', 'केवल लोड किया भाग')}
            </span>
          ) : (
            <span className="text-[10px] text-temple-600 font-bold bg-temple-100 px-1.5 py-0.5 rounded shrink-0">
              {safeTranslate('kpi_treasury_partial', 'Loaded window')}
            </span>
          ))}
      </div>
      <svg
        viewBox={`0 0 ${SLOT * 7} 72`}
        className="w-full h-auto mt-2"
        role="img"
        aria-label={caption}
        preserveAspectRatio="none"
      >
        {buckets.map((b, i) => {
          const center = i * SLOT + SLOT / 2;
          const isToday = i === buckets.length - 1;
          const incomeH = heightFor(b.income);
          const expenseH = heightFor(b.expense);
          return (
            <g key={b.iso}>
              {showExpense && (
                <rect
                  x={center - 13}
                  y={BASELINE_Y - expenseH}
                  width={26}
                  height={expenseH}
                  rx={2}
                  className={b.expense > 0 ? 'ws-bar-expense' : 'ws-bar-empty'}
                >
                  <title>{`${b.iso} · ${money(b.expense)}`}</title>
                </rect>
              )}
              <rect
                x={center - (showExpense ? 8 : 11)}
                y={BASELINE_Y - incomeH}
                width={showExpense ? 16 : 22}
                height={incomeH}
                rx={2}
                className={
                  b.income <= 0 ? 'ws-bar-empty' : isToday ? 'ws-bar-today' : 'ws-bar-income'
                }
              >
                <title>{`${b.iso} · ${money(b.income)}`}</title>
              </rect>
            </g>
          );
        })}
        <rect x={0} y={BASELINE_Y} width={SLOT * 7} height={1} className="ws-baseline" />
      </svg>
      <div className="grid grid-cols-7 mt-1" aria-hidden="true">
        {buckets.map((b, i) => (
          <span
            key={b.iso}
            className={`text-center text-[10px] ${
              i === buckets.length - 1
                ? 'font-black text-temple-900'
                : 'font-bold text-temple-500'
            }`}
          >
            {b.dayOfMonth}
          </span>
        ))}
      </div>
    </div>
  );
};
