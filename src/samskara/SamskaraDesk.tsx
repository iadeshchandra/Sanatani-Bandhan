import React, { useState } from 'react';
import { SamskaraProvider } from './samskaraStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { FamilyTab } from './FamilyTab';
import { SamskarasTab } from './SamskarasTab';
import { RemindersTab } from './RemindersTab';
import { PitraTab } from './PitraTab';
import { CeremonyTab } from './CeremonyTab';
import { ReportsTab } from './ReportsTab';

/* ------------------------------------------------------------------ */
/* Samskara One — the family lifecycle suite.                          */
/*                                                                     */
/* The sixteen samskaras from conception to the final rites, kept as   */
/* a family's sacred chronicle: family units and members, samskara     */
/* records per member, gentle age-based reminders, pitra records with  */
/* annual shraddha remembrance, and ceremony planning with purohit     */
/* connection and dakshina tracking.                                   */
/*                                                                     */
/* All family records live on this device. Sacred family data NEVER    */
/* leaves the device — only dakshina postings go to the cloud ledger.  */
/*                                                                     */
/* RESPECT RULE: this handles people's most sacred family moments.    */
/* Warm, quiet, reverent tone. No badges, no streaks, no points, no    */
/* gamification of any kind.                                           */
/*                                                                     */
/* HONESTY RULE: muhurat and tithi guidance should be confirmed with   */
/* the family's purohit or jyotishi — the UI says so plainly.         */
/* Timings follow widely observed custom; family and regional          */
/* traditions take precedence.                                         */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'family', bn: 'পরিবার', en: 'Family', hi: 'परिवार' },
  { id: 'samskaras', bn: 'সংস্কার', en: 'Samskaras', hi: 'संस्कार' },
  { id: 'reminders', bn: 'স্মরণ', en: 'Reminders', hi: 'स्मरण' },
  { id: 'pitra', bn: 'পিতৃ', en: 'Pitra', hi: 'पितृ' },
  { id: 'ceremony', bn: 'অনুষ্ঠান', en: 'Ceremony', hi: 'अनुष्ठान' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट' },
];

const SamskaraInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { safeTranslate } = useLanguage();

  return (
    <div className="min-h-full bg-gradient-to-b from-rose-50/60 via-stone-50 to-stone-100">
      <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 text-rose-50 px-4 sm:px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-2xl">🪔</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('samskara.title', 'Samskara One', 'সংস্কার ওয়ান', 'संस्कार वन')}{' '}
              <span className="font-normal text-rose-200/90 text-sm">(Family Lifecycle)</span>
            </h1>
            <p className="text-xs text-rose-200/80">
              ॥ संस्कारो हि नाम गुणान्तराधानम् ॥ —{' '}
              {safeTranslate('samskara.subtitle', 'Your family\u2019s sacred journey, from birth to blessing — kept with reverence', 'আপনার পরিবারের পবিত্র যাত্রা, জন্ম থেকে আশীর্বাদ — শ্রদ্ধার সঙ্গে রক্ষিত', 'आपके परिवार की पवित्र यात्रा, जन्म से आशीर्वाद तक — श्रद्धा से संरक्षित')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-xs text-rose-900">
          <span className="font-bold">🪔 {safeTranslate('samskara.honesty.title', 'Kept private', 'ব্যক্তিগত রাখা', 'निजी रखा गया')}: </span>
          {safeTranslate(
            'samskara.honesty.body',
            'Your family\u2019s records stay on this device and are never uploaded. Only dakshina you choose to post reaches the treasury ledger. Timings follow widely observed custom — your family and regional traditions take precedence; please confirm muhurat and tithi with your purohit.',
            'আপনার পরিবারের রেকর্ড এই ডিভাইসেই থাকে, কখনো আপলোড হয় না। শুধুমাত্র আপনার দেওয়া দক্ষিণা কোষাগারে পোস্ট হয়। সময় বহুল প্রচলিত রীতি অনুসরণ করে — আপনার পারিবারিক ও আঞ্চলিক ঐতিহ্যই চূড়ান্ত; মুহূর্ত ও তিথি পুরোহিতের সঙ্গে নিশ্চিত করুন।',
            'आपके परिवार के रिकॉर्ड इसी डिवाइस पर रहते हैं, कभी अपलोड नहीं होते। केवल आपके द्वारा दी गई दक्षिणा कोषागार में दर्ज होती है। समय व्यापक प्रचलित परंपरा का पालन करता है — आपकी पारिवारिक व क्षेत्रीय परंपरा ही सर्वोपरि है; मुहूर्त व तिथि अपने पुरोहित से पुष्टि करें।'
          )}
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab goTab={setTab} />}
          {tab === 'family' && <FamilyTab />}
          {tab === 'samskaras' && <SamskarasTab />}
          {tab === 'reminders' && <RemindersTab />}
          {tab === 'pitra' && <PitraTab />}
          {tab === 'ceremony' && <CeremonyTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export interface SamskaraDeskProps {
  /** Storage scope. Defaults to the active workspace; Solo mode passes `solo_<uid>`. */
  scopeId?: string;
}

export const SamskaraDesk: React.FC<SamskaraDeskProps> = ({ scopeId }) => {
  const { activeWorkspace } = useAuthWorkspace();
  const scope = scopeId || activeWorkspace?.id || 'default';
  return (
    <SamskaraProvider scopeId={scope}>
      <SamskaraInner />
    </SamskaraProvider>
  );
};

export default SamskaraDesk;
