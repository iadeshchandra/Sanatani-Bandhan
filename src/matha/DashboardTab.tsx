import React from 'react';
import { useMatha, livingSannyasis, todaysDinacharya, upcomingObservances, dakshinaTotal, displayName } from './mathaStore';
import { T, Card, Stat, fmtTime, fmtMonthDay, inr } from './ui';

/* Dashboard — residents, today's dinacharya, upcoming observances, branches. */

export const DashboardTab: React.FC = () => {
  const { state } = useMatha();
  const residents = livingSannyasis(state);
  const today = todaysDinacharya(state);
  const upcoming = upcomingObservances(state).slice(0, 5);
  const students = state.students.filter((s) => s.status === 'studying');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={<T en="Residents" bn="বাসিন্দা" hi="निवासी" />} value={residents.length} sub={<T en="sannyasis & sadhaks" bn="সন্ন্যাসী ও সাধক" hi="संन्यासी व साधक" />} />
        <Stat label={<T en="Gurukul students" bn="গুরুকুল শিক্ষার্থী" hi="गुरुकुल छात्र" />} value={students.length} sub={<T en="under training" bn="প্রশিক্ষণরত" hi="प्रशिक्षणरत" />} tone="amber" />
        <Stat label={<T en="Branch mathas" bn="শাখা মঠ" hi="शाखा मठ" />} value={state.branches.length} sub={<T en="sub-centres" bn="উপকেন্দ্র" hi="उपकेंद्र" />} tone="sky" />
        <Stat label={<T en="Dakshina received" bn="প্রাপ্ত দক্ষিণা" hi="प्राप्त दक्षिणा" />} value={inr(dakshinaTotal(state))} sub={<T en="all time, this device" bn="সর্বমোট, এই ডিভাইস" hi="कुल, यह डिवाइस" />} tone="stone" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3">
            <T en="Today's dinacharya" bn="আজকের দিনচর্যা" hi="आज की दिनचर्या" />
          </h3>
          {today.length === 0 && (
            <p className="text-sm text-stone-400">
              <T en="No routine set yet — add the daily schedule in the Dinacharya tab." bn="এখনও রুটিন নেই — দিনচর্যা ট্যাবে দৈনিক সূচি যোগ করুন।" hi="अभी कोई दिनचर्या नहीं — दिनचर्या टैब में दैनिक कार्यक्रम जोड़ें।" />
            </p>
          )}
          <div className="space-y-2">
            {today.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-1.5 border-b border-stone-100 last:border-0">
                <span className="font-mono font-bold text-orange-800 text-sm w-20 shrink-0">{fmtTime(d.time)}</span>
                <span className="text-sm text-stone-700 font-medium">{d.activity}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3">
            <T en="Upcoming observances" bn="আসন্ন পালনীয়" hi="आगामी अनुष्ठान" />
          </h3>
          {upcoming.length === 0 && (
            <p className="text-sm text-stone-400">
              <T en="No observances recorded — add Guru Purnima, diksha anniversaries and festivals in the Utsav tab." bn="কোনো পালনীয় নথিভুক্ত নেই — উৎসব ট্যাবে গুরু পূর্ণিমা, দীক্ষা বার্ষিকী যোগ করুন।" hi="कोई अनुष्ठान दर्ज नहीं — उत्सव टैब में गुरु पूर्णिमा, दीक्षा वर्षगांठ जोड़ें।" />
            </p>
          )}
          <div className="space-y-2">
            {upcoming.map(({ o, date, inDays }) => (
              <div key={o.id} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                <div>
                  <div className="text-sm font-bold text-stone-800">{o.name}</div>
                  <div className="text-xs text-stone-500">{fmtMonthDay(o.monthDay)}</div>
                </div>
                <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1">
                  {inDays === 0 ? <T en="today" bn="আজ" hi="आज" /> : <T en={`${inDays} days`} bn={`${inDays} দিন`} hi={`${inDays} दिन`} />}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {residents.length > 0 && (
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3">
            <T en="Resident sannyasis" bn="বাসিন্দা সন্ন্যাসী" hi="निवासी संन्यासी" />
          </h3>
          <div className="flex flex-wrap gap-2">
            {residents.map((s) => (
              <span key={s.id} className="text-sm bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 font-semibold text-orange-900">
                {displayName(s)}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
