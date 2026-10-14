import React from 'react';
import { useSabha, activeMembers, duesCollected, duesDefaulters, welfareBalance, upcomingDuties, upcomingTrainings, thisYear } from './sabhaStore';
import { T, Card, Stat, inr, fmtDate } from './ui';

/* Dashboard — member count, dues collected/pending, welfare balance,
 * upcoming trainings and duties. */

export const DashboardTab: React.FC = () => {
  const { state } = useSabha();
  const yr = thisYear();
  const members = activeMembers(state);
  const collected = duesCollected(state, yr);
  const defaulters = duesDefaulters(state, yr);
  const welfare = welfareBalance(state);
  const duties = upcomingDuties(state);
  const trainings = upcomingTrainings(state);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat tone="amber" label={<T en="Active members" bn="সক্রিয় সদস্য" hi="सक्रिय सदस्य" />} value={members.length} sub={<T en={`${state.members.length} total`} bn={`${state.members.length} মোট`} hi={`${state.members.length} कुल`} />} />
        <Stat tone="emerald" label={<T en={`Dues collected · ${yr}`} bn={`${yr} চাঁদা সংগৃহীত`} hi={`${yr} शुल्क संग्रहित`} />} value={inr(collected)} sub={<T en={`${defaulters.length} unpaid`} bn={`${defaulters.length} অনাদায়ী`} hi={`${defaulters.length} बकाया`} />} />
        <Stat tone="sky" label={<T en="Welfare fund balance" bn="কল্যাণ তহবিল ব্যালেন্স" hi="कल्याण निधि शेष" />} value={inr(welfare)} sub={<T en="contributions − disbursements" bn="অবদান − বিতরণ" hi="अंशदान − वितरण" />} />
        <Stat tone="rose" label={<T en="Upcoming duties" bn="আসন্ন দায়িত্ব" hi="आगामी कर्तव्य" />} value={duties.length} sub={<T en={`${trainings.length} trainings scheduled`} bn={`${trainings.length} প্রশিক্ষণ নির্ধারিত`} hi={`${trainings.length} प्रशिक्षण निर्धारित`} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="text-sm font-bold text-stone-700 mb-3">
            <T en="Upcoming duties" bn="আসন্ন দায়িত্ব" hi="आगामी कर्तव्य" />
          </div>
          {duties.length === 0 && <div className="text-xs text-stone-400"><T en="No duties scheduled." bn="কোনো দায়িত্ব নির্ধারিত নেই।" hi="कोई कर्तव्य निर्धारित नहीं।" /></div>}
          {duties.slice(0, 5).map((d) => {
            const who = state.members.find((m) => m.id === d.memberId)?.name || '—';
            return (
              <div key={d.id} className="text-xs py-2 border-b border-stone-100 flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-stone-700">{d.festival}</div>
                  <div className="text-stone-500">{fmtDate(d.date)}{d.slot && <> · {d.slot}</>}{d.mandir && <> · {d.mandir}</>}</div>
                </div>
                <div className="text-right text-stone-600">{who}</div>
              </div>
            );
          })}
        </Card>

        <Card>
          <div className="text-sm font-bold text-stone-700 mb-3">
            <T en="Upcoming trainings" bn="আসন্ন প্রশিক্ষণ" hi="आगामी प्रशिक्षण" />
          </div>
          {trainings.length === 0 && <div className="text-xs text-stone-400"><T en="No trainings scheduled." bn="কোনো প্রশিক্ষণ নির্ধারিত নেই।" hi="कोई प्रशिक्षण निर्धारित नहीं।" /></div>}
          {trainings.slice(0, 5).map((t) => (
            <div key={t.id} className="text-xs py-2 border-b border-stone-100">
              <div className="font-bold text-stone-700">{t.title}</div>
              <div className="text-stone-500">{fmtDate(t.date)}{t.venue && <> · {t.venue}</>} · {t.attendeeIds.length} <T en="attending" bn="অংশগ্রহণকারী" hi="उपस्थित" /></div>
            </div>
          ))}
        </Card>
      </div>

      {defaulters.length > 0 && (
        <Card>
          <div className="text-sm font-bold text-red-700 mb-2">
            💰 <T en={`Dues pending · ${yr} (${defaulters.length})`} bn={`${yr} চাঁদা বকেয়া (${defaulters.length})`} hi={`${yr} शुल्क बकाया (${defaulters.length})`} />
          </div>
          <div className="text-xs text-stone-600">
            {defaulters.slice(0, 8).map((m) => m.name).join(', ')}
            {defaulters.length > 8 && <> +{defaulters.length - 8} <T en="more" bn="আরও" hi="और" /></>}
          </div>
        </Card>
      )}
    </div>
  );
};
