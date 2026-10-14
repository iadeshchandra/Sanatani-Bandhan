import React, { useEffect, useRef, useState } from 'react';
import { MathaProvider, useMatha } from './mathaStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { SannyasiTab } from './SannyasiTab';
import { ParamparaTab } from './ParamparaTab';
import { BranchesTab } from './BranchesTab';
import { DinacharyaTab } from './DinacharyaTab';
import { GurukulTab } from './GurukulTab';
import { SevaTab } from './SevaTab';
import { UtsavTab } from './UtsavTab';
import { DakshinaTab } from './DakshinaTab';
import { ReportsTab } from './ReportsTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Matha One — monastic management for Sangha/Matha and Ashram         */
/* workspaces. The sannyasi registry, parampara lineage, branches,    */
/* dinacharya, gurukul students, seva assignments, observances and    */
/* dakshina records live on this device; only treasury postings go    */
/* to the cloud ledger. Registered in workspaceRegistry for Sangha +  */
/* Ashram — the App.tsx org-type guard blocks it everywhere else.     */
/*                                                                     */
/* RESPECT RULE: this is a sacred institution's internal record. The   */
/* UI tone is respectful; nothing here is gamified — no badges, no     */
/* points, no streaks.                                                 */
/*                                                                     */
/* HONESTY RULE: donations post to treasury as income; 80G eligibility */
/* must be confirmed with the CA — the UI says so plainly.            */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'sannyasi', bn: 'সন্ন্যাসী', en: 'Sannyasi', hi: 'संन्यासी' },
  { id: 'parampara', bn: 'পরম্পরা', en: 'Parampara', hi: 'परंपरा' },
  { id: 'branches', bn: 'শাখা', en: 'Branches', hi: 'शाखाएं' },
  { id: 'dinacharya', bn: 'দিনচর্যা', en: 'Dinacharya', hi: 'दिनचर्या' },
  { id: 'gurukul', bn: 'গুরুকুল', en: 'Gurukul', hi: 'गुरुकुल' },
  { id: 'seva', bn: 'সেবা', en: 'Seva', hi: 'सेवा' },
  { id: 'utsav', bn: 'উৎসব', en: 'Utsav', hi: 'उत्सव' },
  { id: 'dakshina', bn: 'দক্ষিণা', en: 'Dakshina', hi: 'दक्षिणा' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट' },
];

const MathaInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useMatha();
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
    <div className="min-h-full bg-gradient-to-b from-orange-50/60 via-stone-50 to-stone-100">
      <div className="bg-gradient-to-r from-orange-900 via-amber-900 to-orange-900 text-orange-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-400/20 border border-orange-300/40 flex items-center justify-center text-2xl">🕉️</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('matha.title', 'Matha One', 'মঠ ওয়ান', 'मठ वन')}{' '}
              <span className="font-normal text-orange-200/90 text-sm">(Monastic Management)</span>
            </h1>
            <p className="text-xs text-orange-200/80">
              ॥ गुरुर्ब्रह्मा गुरुर्विष्णुः ॥ —{' '}
              {safeTranslate('matha.subtitle', 'Parampara, sannyasis & daily life — respectfully kept', 'পরম্পরা, সন্ন্যাসী ও দৈনন্দিন জীবন — শ্রদ্ধার সঙ্গে রক্ষিত', 'परंपरा, संन्यासी व दैनिक जीवन — श्रद्धा से संरक्षित')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50/70 px-4 py-3 text-xs text-orange-900 no-print">
          <span className="font-bold">⚖️ {safeTranslate('matha.honesty.title', 'Honest scope', 'সৎ পরিধি', 'ईमानदार दायरा')}: </span>
          {safeTranslate(
            'matha.honesty.body',
            'This is the matha\u2019s own internal record, kept on this device. Donations post to treasury as income — confirm 80G eligibility with your CA. Nothing here leaves this device except treasury postings.',
            'এটি মঠের নিজস্ব অভ্যন্তরীণ রেকর্ড, এই ডিভাইসে রক্ষিত। অনুদান কোষাগারে আয় হিসেবে পোস্ট হয় — 80G যোগ্যতা সিএ-এর সঙ্গে নিশ্চিত করুন। কোষাগার পোস্টিং ছাড়া কিছুই এই ডিভাইস ছাড়ে না।',
            'यह मठ का अपना आंतरिक रिकॉर्ड है, इसी डिवाइस पर रखा जाता है। दान कोषागार में आय के रूप में दर्ज होते हैं — 80G पात्रता अपने CA से पुष्टि करें। कोषागार प्रविष्टियों के अलावा कुछ भी इस डिवाइस से बाहर नहीं जाता।'
          )}
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'sannyasi' && <SannyasiTab />}
          {tab === 'parampara' && <ParamparaTab />}
          {tab === 'branches' && <BranchesTab />}
          {tab === 'dinacharya' && <DinacharyaTab />}
          {tab === 'gurukul' && <GurukulTab />}
          {tab === 'seva' && <SevaTab />}
          {tab === 'utsav' && <UtsavTab />}
          {tab === 'dakshina' && <DakshinaTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export const MathaDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <MathaProvider workspaceId={activeWorkspace.id}>
      <MathaInner />
    </MathaProvider>
  );
};

export default MathaDesk;
