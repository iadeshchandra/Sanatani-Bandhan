import React from 'react';
import { useSamskara, allReminders, familyMembers } from './samskaraStore';
import { Card, Stat, Btn, Empty, fmtDate, T } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Dashboard. A quiet overview of the family's sacred
 * record: families, members, samskaras chronicled, and gentle
 * upcoming remembrances. */

export const DashboardTab: React.FC<{ goTab: (t: string) => void }> = ({ goTab }) => {
  const { state } = useSamskara();
  const { safeTranslate } = useLanguage();
  const reminders = allReminders(state).slice(0, 5);
  const completedCount = state.records.filter((r) => r.status === 'completed').length;
  const plannedCount = state.plans.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label={<T en="Families" bn="পরিবার" hi="परिवार" />}
          value={state.families.length}
          tone="maroon"
        />
        <Stat
          label={<T en="Family members" bn="সদস্য" hi="सदस्य" />}
          value={state.members.length}
          tone="gold"
        />
        <Stat
          label={<T en="Samskaras chronicled" bn="সংস্কার লিপিবদ্ধ" hi="संस्कार अंकित" />}
          value={completedCount}
          tone="sage"
        />
        <Stat
          label={<T en="Ceremonies planned" bn="পরিকল্পিত অনুষ্ঠান" hi="योजनाबद्ध अनुष्ठान" />}
          value={plannedCount}
          tone="stone"
        />
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">
          {safeTranslate('samskara.dashboard.upcoming', 'Gentle remembrances', 'কোমল স্মরণ', 'कोमल स्मरण')}
        </h3>
        {reminders.length === 0 ? (
          <Empty text={safeTranslate(
            'samskara.dashboard.noReminders',
            'Nothing approaching right now. Add family members with birth dates and the reminders will appear here quietly.',
            'এখন কিছু আসন্ন নেই। জন্ম তারিখসহ পরিবারের সদস্য যোগ করুন, স্মরণ এখানে নীরবে দেখা দেবে।',
            'अभी कुछ निकट नहीं है। जन्म तिथि सहित परिवार के सदस्य जोड़ें, स्मरण यहाँ शांति से दिखेंगे।'
          )} />
        ) : (
          <div className="space-y-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border px-4 py-3 ${r.gentle ? 'border-stone-200 bg-stone-50' : 'border-amber-200 bg-amber-50/60'}`}
              >
                <div className="text-sm font-bold text-stone-800">{r.title}</div>
                <div className="text-xs text-stone-500 mt-0.5">{r.detail}</div>
              </div>
            ))}
          </div>
        )}
        {reminders.length > 0 && (
          <Btn variant="ghost" className="mt-3" onClick={() => goTab('reminders')}>
            {safeTranslate('samskara.dashboard.viewAll', 'View all remembrances', 'সব স্মরণ দেখুন', 'सभी स्मरण देखें')}
          </Btn>
        )}
      </Card>

      {state.families.length === 0 ? (
        <Card className="text-center py-8">
          <div className="text-4xl mb-3">🪔</div>
          <h3 className="font-bold text-stone-800 mb-2">
            {safeTranslate('samskara.dashboard.begin', 'Begin your family\u2019s chronicle', 'আপনার পরিবারের ইতিহাস শুরু করুন', 'अपने परिवार का वृत्तांत आरंभ करें')}
          </h3>
          <p className="text-sm text-stone-500 mb-4 max-w-md mx-auto">
            {safeTranslate(
              'samskara.dashboard.beginBody',
              'Create your family, add its members, and keep the sacred record of every samskara — from the first prayers to the final farewell. Everything stays on this device.',
              'আপনার পরিবার তৈরি করুন, সদস্য যোগ করুন, এবং প্রতিটি সংস্কারের পবিত্র রেকর্ড রাখুন — প্রথম প্রার্থনা থেকে শেষ বিদায় পর্যন্ত। সবকিছু এই ডিভাইসেই থাকে।',
              'अपना परिवार बनाएं, सदस्य जोड़ें, और प्रत्येक संस्कार का पवित्र रिकॉर्ड रखें — पहली प्रार्थना से अंतिम विदाई तक। सब कुछ इसी डिवाइस पर रहता है।'
            )}
          </p>
          <Btn onClick={() => goTab('family')}>
            {safeTranslate('samskara.dashboard.beginCta', 'Create your family', 'আপনার পরিবার তৈরি করুন', 'अपना परिवार बनाएं')}
          </Btn>
        </Card>
      ) : (
        <Card>
          <h3 className="font-bold text-stone-800 mb-3">
            {safeTranslate('samskara.dashboard.families', 'Your families', 'আপনার পরিবারসমূহ', 'आपके परिवार')}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {state.families.map((f) => {
              const members = familyMembers(state, f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => goTab('family')}
                  className="text-left rounded-xl border border-stone-200 hover:border-rose-300 bg-stone-50/50 p-4 transition min-h-[44px]"
                >
                  <div className="font-bold text-stone-800">{f.name}</div>
                  <div className="text-xs text-stone-500 mt-1">
                    {members.length} {safeTranslate('samskara.dashboard.memberCount', 'members', 'জন সদস্য', 'सदस्य')}
                    {f.gotra ? ` · ${safeTranslate('samskara.family.gotra', 'Gotra', 'গোত্র', 'गोत्र')}: ${f.gotra}` : ''}
                  </div>
                  {members.slice(0, 3).map((m) => (
                    <div key={m.id} className="text-xs text-stone-600 mt-0.5">
                      {m.name}{m.birthDate ? ` · ${fmtDate(m.birthDate)}` : ''}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
