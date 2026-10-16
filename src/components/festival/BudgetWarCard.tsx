/**
 * BudgetWarCard — budget vs actual, war-room view (Pillar 2).
 * =====================================================================
 * Aggregates the REAL Utsav budget lines into four war-room heads
 * (prasad · decoration · security · misc) with SVG bars — no parallel
 * budget system, no heavy chart deps. Honesty rule: this is the samiti's
 * own management view, not audited accounts.
 */
import React, { useMemo } from 'react';
import { useUtsav } from '../../utsav/utsavStore';
import { T, Card, Empty, inr } from '../../utsav/ui';

const HEADS = [
  { id: 'prasad', en: 'Prasad & bhandara', bn: 'প্রসাদ ও ভাণ্ডারা', hi: 'प्रसाद व भंडारा', keys: ['prasad', 'bhandara', 'bhog', 'annadan', 'kitchen', 'catering'] },
  { id: 'decoration', en: 'Decoration & pandal', bn: 'সাজসজ্জা ও প্যান্ডেল', hi: 'सज्जा व पंडाल', keys: ['pandal', 'decor', 'flower', 'samagri', 'light', 'sound'] },
  { id: 'security', en: 'Security & safety', bn: 'নিরাপত্তা', hi: 'सुरक्षा', keys: ['secur', 'safety', 'medical', 'police', 'crowd'] },
  { id: 'misc', en: 'Everything else', bn: 'অন্যান্য', hi: 'अन्य', keys: [] },
] as const;

const headOf = (head: string): string => {
  const h = head.toLowerCase();
  for (const c of HEADS) {
    if (c.id !== 'misc' && c.keys.some((k) => h.includes(k))) return c.id;
  }
  return 'misc';
};

export const BudgetWarCard: React.FC = () => {
  const { state } = useUtsav();

  const rows = useMemo(() => {
    const agg: Record<string, { planned: number; actual: number }> = {};
    for (const h of HEADS) agg[h.id] = { planned: 0, actual: 0 };
    for (const b of state.budget) {
      if (b.kind !== 'expense') continue;
      const id = headOf(b.head);
      agg[id].planned += b.planned || 0;
      agg[id].actual += b.actual || 0;
    }
    // Quiet heads with no plan and no spend stay out of the war-room view.
    return HEADS.map((h) => ({ ...h, ...agg[h.id] }))
      .filter((r) => r.planned > 0 || r.actual > 0);
  }, [state.budget]);

  const totals = rows.reduce(
    (s, r) => ({ planned: s.planned + r.planned, actual: s.actual + r.actual }),
    { planned: 0, actual: 0 }
  );
  const maxVal = Math.max(...rows.map((r) => Math.max(r.planned, r.actual)), 1);
  const hasAny = totals.planned > 0 || totals.actual > 0;

  return (
    <Card>
      <h3 className="font-extrabold text-stone-800 mb-1">
        <T en="Budget vs actual" bn="বাজেট বনাম প্রকৃত" hi="बजट बनाम वास्तविक" />
      </h3>
      <p className="text-xs text-stone-500 mb-3">
        <T en="From your Utsav budget lines. Management view — confirm final figures with your koshadhyaksh."
          bn="আপনার উৎসব বাজেট লাইন থেকে। পরিচালন দৃশ্য — চূড়ান্ত অঙ্ক কোষাধ্যক্ষের সঙ্গে নিশ্চিত করুন।"
          hi="आपकी उत्सव बजट पंक्तियों से। प्रबंधन दृश्य — अंतिम आंकड़े कोषाध्यक्ष से पुष्टि करें।" />
      </p>
      {!hasAny ? (
        <Empty text="No budget lines yet — add them in the Budget tab and they appear here." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const burn = r.planned > 0 ? Math.min(100, Math.round((r.actual / r.planned) * 100)) : r.actual > 0 ? 100 : 0;
            return (
              <div key={r.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-bold text-stone-700"><T en={r.en} bn={r.bn} hi={r.hi} /></span>
                  <span className="text-xs text-stone-500">
                    <span className="font-extrabold text-stone-800">{inr(r.actual)}</span>
                    {' / '}{inr(r.planned)}
                    <span className={`ml-1.5 font-bold ${burn > 100 ? 'text-red-600' : burn >= 80 ? 'text-amber-600' : 'text-emerald-700'}`}>{burn}%</span>
                  </span>
                </div>
                <svg viewBox="0 0 100 10" className="w-full h-2.5 mt-1" role="img" aria-label={`${r.en}: ${burn}% spent`}>
                  <rect x="0" y="0" width="100" height="10" rx="5" fill="#f5f0e8" />
                  <rect x="0" y="0" width={(r.planned / maxVal) * 100} height="10" rx="5" fill="#fed7aa" />
                  <rect x="0" y="0" width={Math.min(100, (r.actual / maxVal) * 100)} height="10" rx="5" fill={burn > 100 ? '#dc2626' : '#c2410c'} />
                </svg>
              </div>
            );
          })}
          <div className="flex justify-between border-t border-stone-100 pt-2 text-sm">
            <span className="text-stone-500 font-semibold"><T en="Total spent / planned" bn="মোট ব্যয় / পরিকল্পিত" hi="कुल व्यय / नियोजित" /></span>
            <span className="font-extrabold text-stone-800">{inr(totals.actual)} <span className="text-stone-400 font-semibold">/ {inr(totals.planned)}</span></span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default BudgetWarCard;
