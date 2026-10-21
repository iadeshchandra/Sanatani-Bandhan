import React from 'react';
import { useSatsang, nextGathering, activeMembers, fundBalance, daysUntil, irregularMembers, presentCount } from './satsangStore';
import { T, Card, Stat, fmtDate, fmtTime } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';

/* ------------------------------------------------------------------ */
/* Dashboard — next gathering countdown, member count, attendance      */
/* trend, fund balance.                                               */
/* ------------------------------------------------------------------ */

export const DashboardTab: React.FC = () => {
  const inr = useInr();
  const { state } = useSatsang();
  const next = nextGathering(state);
  const members = activeMembers(state);
  const balance = fundBalance(state);
  const irregular = irregularMembers(state);
  const completed = state.gatherings.filter((g) => g.status === 'completed');
  const avgAttendance = completed.length
    ? Math.round(completed.reduce((s, g) => s + presentCount(state, g.id), 0) / completed.length)
    : 0;

  const host = next?.hostId ? state.members.find((m) => m.id === next.hostId) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label={<T en="Next gathering" bn="পরবর্তী সমাবেশ" hi="अगली सभा" />}
          value={next ? (daysUntil(next.date) === 0 ? 'Today' : `${daysUntil(next.date)}d`) : '—'}
          sub={next ? `${fmtDate(next.date)} · ${fmtTime(next.time)}` : 'No gathering scheduled'}
        />
        <Stat
          label={<T en="Active members" bn="সক্রিয় সদস্য" hi="सक्रिय सदस्य" />}
          value={members.length}
          sub={`${state.members.length} total`}
          tone="sky"
        />
        <Stat
          label={<T en="Avg attendance" bn="গড় উপস্থিতি" hi="औसत उपस्थिति" />}
          value={avgAttendance}
          sub={`${completed.length} gatherings held`}
          tone="emerald"
        />
        <Stat
          label={<T en="Fund balance" bn="তহবিল ব্যালেন্স" hi="निधि शेष" />}
          value={inr(balance)}
          sub="contributions − expenses"
          tone={balance >= 0 ? 'amber' : 'red'}
        />
      </div>

      {next && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-rose-600 uppercase tracking-wide">
                <T en="Next gathering" bn="পরবর্তী সমাবেশ" hi="अगली सभा" />
              </div>
              <div className="text-lg font-extrabold text-stone-800 mt-1">
                {fmtDate(next.date)} · {fmtTime(next.time)}
              </div>
              <div className="text-sm text-stone-600 mt-0.5">
                📍 {next.venue || '—'}
                {host && <> · <T en="Host" bn="আয়োজক" hi="मेज़बान" />: <span className="font-semibold">{host.name}</span></>}
                {next.theme && <> · 🎵 {next.theme}</>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {irregular.length > 0 && (
        <Card>
          <div className="text-sm font-bold text-stone-700 mb-2">
            <T en="Members missing often (< 50% attendance)" bn="যারা প্রায়ই অনুপস্থিত (< ৫০% উপস্থিতি)" hi="अक्सर अनुपस्थित सदस्य (< 50% उपस्थिति)" />
          </div>
          <div className="flex flex-wrap gap-2">
            {irregular.map((m) => (
              <span key={m.id} className="text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-3 py-1.5">
                {m.name}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-stone-500 mt-2">
            <T en="A gentle check-in keeps the mandali warm — not a reprimand." bn="একটি মৃদু খোঁজখবর মণ্ডলীকে উষ্ণ রাখে — তিরস্কার নয়।" hi="स्नेहपूर्ण कुशल-क्षेम मंडली को जोड़े रखता है — डांट नहीं।" />
          </p>
        </Card>
      )}

      {!next && (
        <Card>
          <p className="text-sm text-stone-500">
            <T en="No upcoming gathering scheduled. Add one from the Gatherings tab." bn="কোনো আসন্ন সমাবেশ নির্ধারিত নেই। সমাবেশ ট্যাব থেকে যোগ করুন।" hi="कोई आगामी सभा निर्धारित नहीं। सभाएं टैब से जोड़ें।" />
          </p>
        </Card>
      )}
    </div>
  );
};
