import React from 'react';
import { useSamskara, allReminders, Reminder } from './samskaraStore';
import { Card, Empty } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Reminders. Gentle, never urgent: age-based samskara
 * nudges, annual shraddha remembrance, and upcoming ceremonies.
 * Quiet by design — this is remembrance, not notification spam. */

const KIND_ICON: Record<Reminder['kind'], string> = {
  'samskara-age': '🌱',
  'shraddha': '🪔',
  'ceremony': '📿',
};

export const RemindersTab: React.FC = () => {
  const { state } = useSamskara();
  const { safeTranslate } = useLanguage();
  const reminders = allReminders(state);

  const groups: Array<{ kind: Reminder['kind']; title: string }> = [
    {
      kind: 'shraddha',
      title: safeTranslate('samskara.reminders.shraddha', 'Shraddha remembrance', 'শ্রাদ্ধ স্মরণ', 'श्राद्ध स्मरण'),
    },
    {
      kind: 'ceremony',
      title: safeTranslate('samskara.reminders.ceremony', 'Upcoming ceremonies', 'আসন্ন অনুষ্ঠান', 'आगामी अनुष्ठान'),
    },
    {
      kind: 'samskara-age',
      title: safeTranslate('samskara.reminders.age', 'Samskara ages approaching', 'আসন্ন সংস্কার বয়স', 'आगामी संस्कार आयु'),
    },
  ];

  if (reminders.length === 0) {
    return (
      <Empty text={safeTranslate(
        'samskara.reminders.empty',
        'All quiet. Add family members with birth dates, record ancestors\u2019 shraddha dates, or plan a ceremony — gentle remembrances will appear here.',
        'সব শান্ত। জন্ম তারিখসহ পরিবারের সদস্য যোগ করুন, পূর্বপুরুষদের শ্রাদ্ধ তারিখ লিখুন, বা অনুষ্ঠান পরিকল্পনা করুন — কোমল স্মরণ এখানে দেখা দেবে।',
        'सब शांत है। जन्म तिथि सहित परिवार के सदस्य जोड़ें, पूर्वजों की श्राद्ध तिथि लिखें, या अनुष्ठान की योजना बनाएं — कोमल स्मरण यहाँ दिखेंगे।'
      )} />
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const items = reminders.filter((r) => r.kind === g.kind);
        if (items.length === 0) return null;
        return (
          <div key={g.kind}>
            <h3 className="text-sm font-bold text-stone-600 mb-2 px-1">{g.title}</h3>
            <div className="space-y-2">
              {items.map((r) => (
                <Card key={r.id} className={r.gentle ? 'border-stone-200 bg-stone-50/60' : ''}>
                  <div className="flex gap-3">
                    <div className="text-2xl shrink-0">{KIND_ICON[r.kind]}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-800">{r.title}</div>
                      <div className="text-xs text-stone-500 mt-1 leading-relaxed">{r.detail}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-[11px] text-stone-400 italic text-center px-4 pt-2">
        {safeTranslate(
          'samskara.reminders.footnote',
          'Reminders are gentle suggestions based on widely observed custom. Always follow your family\u2019s own traditions and your purohit\u2019s guidance.',
          'স্মরণ বহুল প্রচলিত রীতি অনুযায়ী কোমল পরামর্শ। সর্বদা আপনার পরিবারের ঐতিহ্য ও পুরোহিতের নির্দেশনা অনুসরণ করুন।',
          'स्मरण व्यापक प्रचलित परंपरा पर आधारित कोमल सुझाव हैं। सदैव अपने परिवार की परंपरा व पुरोहित के मार्गदर्शन का पालन करें।'
        )}
      </p>
    </div>
  );
};
