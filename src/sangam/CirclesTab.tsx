import React, { useState } from 'react';
import { useSangam, type AuthorInfo } from './sangamStore';
import { Card, Btn, Field, inputCls, Modal, AuthorLine, EmptyState, useLocaleText, T } from './ui';
import { CreateGroupSheet } from '../chat/groups/CreateGroupSheet';
import { JoinGroupSheet } from '../chat/groups/JoinGroupSheet';
import { useToast } from '../context/ToastContext';
import type { ChatParticipant } from '../chat/types';

/* Satsang Circles — topic/devotion-based groups.
 * =====================================================================
 * Bhajan, shastra study, seva — small circles of sadhaks. Joining is
 * one tap; every circle shows its creator with their SAN id. No
 * algorithmic recommendations — browse and join what calls to you.
 */

const TOPICS = [
  { id: 'bhajan', en: 'Bhajan & Kirtan', bn: 'ভজন ও কীর্তন', hi: 'भजन व कीर्तन', icon: '🎶' },
  { id: 'shastra', en: 'Shastra Study', bn: 'শাস্ত্র অধ্যয়ন', hi: 'शास्त्र अध्ययन', icon: '📖' },
  { id: 'seva', en: 'Seva', bn: 'সেবা', hi: 'सेवा', icon: '🤲' },
  { id: 'sadhana', en: 'Sadhana', bn: 'সাধনা', hi: 'साधना', icon: '🧘' },
  { id: 'yatra', en: 'Yatra', bn: 'যাত্রা', hi: 'यात्रा', icon: '🚩' },
  { id: 'other', en: 'Other', bn: 'অন্যান্য', hi: 'अन्य', icon: '🪔' },
];

export const CirclesTab: React.FC<{ author: AuthorInfo }> = ({ author }) => {
  const { circles, joinCircle, createCircle } = useSangam();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [topicFilter, setTopicFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('bhajan');
  const [desc, setDesc] = useState('');
  const [groupCircle, setGroupCircle] = useState<{ id: string; name: string } | null>(null);

  const selfInfo: ChatParticipant = {
    uid: author.uid,
    displayName: author.name,
    sanataniId: author.sanId,
    verificationTier: author.tier,
  };

  const visible = topicFilter === 'all' ? circles : circles.filter((c) => c.topic === topicFilter);

  const doCreate = async () => {
    if (!name.trim()) return;
    const n = name, t = topic, d = desc;
    setName(''); setDesc(''); setTopic('bhajan'); setCreateOpen(false); // close immediately — sync is best-effort
    await createCircle(author.uid, author.name, n, t, d);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Satsang Circles" bn="সৎসঙ্গ বৃত্ত" hi="सत्संग मंडल" /></h2>
        <div className="flex gap-2 shrink-0">
          {/* Invite-code door (discoverability fix #13): joining by code used
              to hide in the chat overflow menu. Same JoinGroupSheet flow —
              the code remains the only door into a private group. */}
          <Btn variant="ghost" onClick={() => setJoinOpen(true)} className="!px-3">🔑 {tr('Join with code', 'কোড দিয়ে যোগ দিন', 'कोड से जुड़ें')}</Btn>
          <Btn onClick={() => setCreateOpen(true)} className="!px-3">＋ {tr('New circle', 'নতুন বৃত্ত', 'नया मंडल')}</Btn>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setTopicFilter('all')} className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] ${topicFilter === 'all' ? 'bg-temple-950 text-amber-200' : 'bg-white border border-stone-200 text-stone-600'}`}>
          🪔 {tr('All', 'সব', 'सभी')}
        </button>
        {TOPICS.map((t) => (
          <button key={t.id} onClick={() => setTopicFilter(t.id)} className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] ${topicFilter === t.id ? 'bg-temple-950 text-amber-200' : 'bg-white border border-stone-200 text-stone-600'}`}>
            {t.icon} {t.en}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon="⭕" title={<T en="No circles here yet" bn="এখনও কোনো বৃত্ত নেই" hi="अभी कोई मंडल नहीं" />} body={tr('Start the first circle on this topic.', 'প্রথম বৃত্ত শুরু করুন।', 'पहला मंडल शुरू करें।')} /></Card>
      ) : (
        visible.map((c) => {
          const joined = (c.members || []).includes(author.uid);
          const topicMeta = TOPICS.find((t) => t.id === c.topic);
          return (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl" aria-hidden>{topicMeta?.icon || '🪔'}</span>
                    <h3 className="font-extrabold text-stone-800">{c.name}</h3>
                  </div>
                  <p className="text-sm text-stone-600 mt-1">{c.description}</p>
                  <div className="text-[11px] text-stone-500 mt-1.5">
                    👥 {c.memberCount} {tr('members', 'সদস্য', 'सदस्य')} · {tr('by', 'দ্বারা', 'द्वारा')} {c.creatorName}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Btn variant={joined ? 'ghost' : 'primary'} onClick={() => !joined && joinCircle(c.id, author.uid)} disabled={joined} className="!px-3">
                    {joined ? `✓ ${tr('Joined', 'যোগ দিয়েছেন', 'जुड़े')}` : tr('Join', 'যোগ দিন', 'जुड़ें')}
                  </Btn>
                  {joined && (
                    <button
                      type="button"
                      onClick={() => setGroupCircle({ id: c.id, name: c.name })}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-900 min-h-[36px] px-2 rounded-lg hover:bg-amber-50"
                    >
                      💬 {tr('Group chat', 'গ্রুপ চ্যাট', 'समूह चैट')}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}

      {groupCircle && (
        <CreateGroupSheet
          uid={author.uid}
          selfInfo={selfInfo}
          prefill={{ name: `🪔 ${groupCircle.name}`, type: 'satsang' }}
          onClose={() => setGroupCircle(null)}
          onCreated={() => setGroupCircle(null)}
        />
      )}

      {joinOpen && (
        <JoinGroupSheet
          uid={author.uid}
          selfInfo={selfInfo}
          onClose={() => setJoinOpen(false)}
          onJoined={() => {
            setJoinOpen(false);
            showToast(tr('Welcome to the circle 🙏 Find your group in 💬 Messages.', 'বৃত্তে স্বাগতম 🙏 💬 বার্তায় আপনার দলটি খুঁজুন।', 'मंडल में स्वागत है 🙏 अपना समूह 💬 संदेशों में पाएँ।'), 'success');
          }}
        />
      )}

      {createOpen && (
        <Modal onClose={() => setCreateOpen(false)} title={<T en="Start a circle" bn="বৃত্ত শুরু করুন" hi="मंडल शुरू करें" />}>
          <div className="space-y-3">
            <Field label={<T en="Circle name" bn="বৃত্তের নাম" hi="मंडल का नाम" />}>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={60} placeholder={tr('e.g. Evening Bhajan Circle', 'যেমন সান্ধ্য ভজন বৃত্ত', 'जैसे सांध्य भजन मंडल')} />
            </Field>
            <Field label={<T en="Topic" bn="বিষয়" hi="विषय" />}>
              <select value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls}>
                {TOPICS.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.en}</option>)}
              </select>
            </Field>
            <Field label={<T en="What is this circle for?" bn="এই বৃত্ত কীসের জন্য?" hi="यह मंडल किस लिए है?" />}>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={300} className={inputCls} />
            </Field>
            <Btn onClick={doCreate} disabled={!name.trim()} className="w-full">⭕ {tr('Create circle', 'বৃত্ত তৈরি করুন', 'मंडल बनाएं')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
