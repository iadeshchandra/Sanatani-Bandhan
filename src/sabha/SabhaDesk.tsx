import React, { useEffect, useRef, useState } from 'react';
import { SabhaProvider, useSabha } from './sabhaStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { MembersTab } from './MembersTab';
import { DuesTab } from './DuesTab';
import { WelfareTab } from './WelfareTab';
import { TrainingTab } from './TrainingTab';
import { DutiesTab } from './DutiesTab';
import { MeetingsTab } from './MeetingsTab';
import { NoticesTab } from './NoticesTab';
import { ReportsTab } from './ReportsTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Sabha One — the purohit association's management tool. Membership, */
/* dues, welfare fund, training, festival duty roster, meetings and   */
/* notices live on this device; only money movements post to the      */
/* cloud treasury. Registered in workspaceRegistry for PurohitSabha  */
/* + Mandir — the App.tsx org-type guard blocks it everywhere else.   */
/*                                                                     */
/* SCOPE: the ASSOCIATION. Individual purohit profiles, bookings and  */
/* ratings stay in Purohit One — no duplication, no cross-writes.     */
/*                                                                     */
/* HONESTY RULE: dues and welfare post to treasury as income/expense; */
/* 80G eligibility must be confirmed with the CA — the UI says so.    */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'members', bn: 'সদস্য', en: 'Members', hi: 'सदस्य' },
  { id: 'dues', bn: 'চাঁদা', en: 'Dues', hi: 'शुल्क' },
  { id: 'welfare', bn: 'কল্যাণ', en: 'Welfare', hi: 'कल्याण' },
  { id: 'training', bn: 'প্রশিক্ষণ', en: 'Training', hi: 'प्रशिक्षण' },
  { id: 'duties', bn: 'দায়িত্ব', en: 'Duties', hi: 'कर्तव्य' },
  { id: 'meetings', bn: 'সভা', en: 'Meetings', hi: 'बैठकें' },
  { id: 'notices', bn: 'বিজ্ঞপ্তি', en: 'Notices', hi: 'सूचनाएं' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट' },
];

const SabhaInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useSabha();
  const { activeWorkspace } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const seededFor = useRef('');

  useEffect(() => {
    const key = activeWorkspace.id;
    if (seededFor.current !== key) {
      seededFor.current = key;
      ensureSeeded();
    }
  }, [activeWorkspace.id, ensureSeeded]);

  return (
    <div className="min-h-full bg-gradient-to-b from-amber-50/60 via-stone-50 to-stone-100">
      <div className="bg-gradient-to-r from-amber-900 via-orange-900 to-amber-900 text-amber-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-2xl">🏛️</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('sabha.title', 'Sabha One', 'সভা ওয়ান', 'सभा वन')}{' '}
              <span className="font-normal text-amber-200/90 text-sm">(Purohit Sabha)</span>
            </h1>
            <p className="text-xs text-amber-200/80">
              ॥ संघे शक्तिः ॥ —{' '}
              {safeTranslate('sabha.subtitle', 'Members, dues, welfare, training & duties — the sabha, organized', 'সদস্য, চাঁদা, কল্যাণ, প্রশিক্ষণ ও দায়িত্ব — সভা, সংগঠিত', 'सदस्य, शुल्क, कल्याण, प्रशिक्षण व कर्तव्य — सभा, व्यवस्थित')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900 no-print">
          <span className="font-bold">⚖️ {safeTranslate('sabha.honesty.title', 'Honest scope', 'সৎ পরিধি', 'ईमानदार दायरा')}: </span>
          {safeTranslate(
            'sabha.honesty.body',
            'This is the sabha\u2019s own association record, kept on this device. Dues and welfare movements post to treasury — confirm 80G eligibility with your CA before issuing any 80G receipt. Member verification tiers shown here are display-only and managed in Purohit One. Nothing here leaves this device except treasury postings.',
            'এটি সভার নিজস্ব সমিতির রেকর্ড, এই ডিভাইসে রক্ষিত। চাঁদা ও কল্যাণের লেনদেন কোষাগারে পোস্ট হয় — 80G রসিদ দেওয়ার আগে সিএ-এর সঙ্গে 80G যোগ্যতা নিশ্চিত করুন। সদস্য যাচাইকরণ স্তর এখানে শুধু প্রদর্শনের জন্য, Purohit One-এ পরিচালিত। কোষাগার পোস্টিং ছাড়া কিছুই এই ডিভাইস ছাড়ে না।',
            'यह सभा का अपना समिति रिकॉर्ड है, इसी डिवाइस पर रखा जाता है। शुल्क व कल्याण लेनदेन कोषागार में दर्ज होते हैं — 80G रसीद जारी करने से पहले अपने CA से 80G पात्रता पुष्टि करें। सदस्य सत्यापन स्तर यहां केवल प्रदर्शन हेतु हैं, Purohit One में प्रबंधित। कोषागार प्रविष्टियों के अलावा कुछ भी इस डिवाइस से बाहर नहीं जाता।'
          )}
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'members' && <MembersTab />}
          {tab === 'dues' && <DuesTab />}
          {tab === 'welfare' && <WelfareTab />}
          {tab === 'training' && <TrainingTab />}
          {tab === 'duties' && <DutiesTab />}
          {tab === 'meetings' && <MeetingsTab />}
          {tab === 'notices' && <NoticesTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export const SabhaDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <SabhaProvider workspaceId={activeWorkspace.id}>
      <SabhaInner />
    </SabhaProvider>
  );
};

export default SabhaDesk;
