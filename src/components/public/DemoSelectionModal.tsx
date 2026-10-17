import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, ArrowRight } from 'lucide-react';
import { WorkspaceType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface DemoSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: WorkspaceType, view: DemoView) => void;
}

/** Demo-only role preview. Never touches production RBAC — this only drives
 *  the local demo bootstrap (useDemoStarter → loginAsRole). */
export type DemoView = 'trustee' | 'devotee' | 'priest' | 'accountant' | 'sevadar' | 'superadmin';

const STAFF_VIEWS: { id: Exclude<DemoView, 'trustee' | 'devotee'>; icon: string; label: string; desc: string }[] = [
  { id: 'priest', icon: '🪔', label: 'Priest', desc: 'Rituals & sanctum' },
  { id: 'accountant', icon: '📒', label: 'Accountant', desc: 'Treasury & audit' },
  { id: 'sevadar', icon: '🤝', label: 'Sevadar', desc: 'Front-desk seva' },
  { id: 'superadmin', icon: '🛡️', label: 'SuperAdmin', desc: 'Everything' },
];

const ORG_TYPES: WorkspaceType[] = [
  'Mandir', 'Goshala', 'Sangha', 'Ashram', 'Gurukul',
  'AkshayaPatra', 'MahotsavSamiti', 'PurohitSabha', 'KashiKshetra', 'Trust',
  'Tirth', 'Vidyalaya',
];

/** Human-readable labels for demo org types. */
const ORG_LABELS: Record<string, string> = {
  AkshayaPatra: 'Akshaya Patra',
  MahotsavSamiti: 'Mahotsav Samiti',
  PurohitSabha: 'Purohit Sabha',
  KashiKshetra: 'Kashi Kshetra',
  Tirth: 'Tirth / Yatra',
  Vidyalaya: 'Vidyalaya / Pathshala',
};

export const DemoSelectionModal: React.FC<DemoSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { safeTranslate } = useLanguage();
  const [selected, setSelected] = useState<WorkspaceType | null>(null);
  const [view, setView] = useState<DemoView>('trustee');

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {safeTranslate('select_demo_type', 'Select Demo Environment', 'ডেমো পরিবেশ নির্বাচন করুন', 'डेमो पर्यावरण चुनें')}
            </h2>
            <p className="text-sm text-slate-500">
              {safeTranslate('select_demo_desc', 'Experience the platform configured for your organization type.', 'আপনার প্রতিষ্ঠানের ধরণ অনুযায়ী প্ল্যাটফর্মের অভিজ্ঞতা নিন।', 'अपने संगठन के प्रकार के लिए कॉन्फ़िगर किए गए प्लेटफ़ॉर्म का अनुभव करें।')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ORG_TYPES.map((type, idx) => (
              <button
                key={type}
                onClick={() => setSelected(type)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selected === type 
                    ? 'border-saffron-500 bg-saffron-50 ring-2 ring-saffron-500/20' 
                    : 'border-slate-200 bg-white hover:border-saffron-500/30 hover:bg-saffron-50/30'
                }`}
              >
                <Building2 className={`w-6 h-6 mb-2 ${selected === type ? 'text-saffron-500' : 'text-slate-400'}`} />
                <p className={`text-sm font-bold ${selected === type ? 'text-saffron-900' : 'text-slate-700'}`}>{ORG_LABELS[type] ?? type}</p>
              </button>
            ))}
          </div>
        </div>

        {/* View selector: explicit role choice (2026-10-15 audit P1-4:
            demo entry was non-deterministic — buyers got random views).
            Plain "Explore as" — never insider "Preview" jargon (Track 0). */}
        <div className="px-6 pt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {safeTranslate('demo_view_label', 'Explore as', 'হিসেবে দেখুন', 'के रूप में देखें')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setView('trustee')}
              className={`p-3 rounded-xl border text-left transition-all ${
                view === 'trustee'
                  ? 'border-saffron-500 bg-saffron-50 ring-2 ring-saffron-500/20'
                  : 'border-slate-200 bg-white hover:border-saffron-500/30'
              }`}
            >
              <p className={`text-sm font-bold ${view === 'trustee' ? 'text-saffron-900' : 'text-slate-700'}`}>
                🏛️ {safeTranslate('demo_view_trustee', 'Trustee Console', 'ট্রাস্টি কনসোল', 'ट्रस्टी कंसोल')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {safeTranslate('demo_view_trustee_desc', 'Manage donations, treasury & devotees', 'দান, কোষাগার ও ভক্তদের পরিচালনা করুন', 'दान, कोषागार और भक्तों का प्रबंधन करें')}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setView('devotee')}
              className={`p-3 rounded-xl border text-left transition-all ${
                view === 'devotee'
                  ? 'border-saffron-500 bg-saffron-50 ring-2 ring-saffron-500/20'
                  : 'border-slate-200 bg-white hover:border-saffron-500/30'
              }`}
            >
              <p className={`text-sm font-bold ${view === 'devotee' ? 'text-saffron-900' : 'text-slate-700'}`}>
                🙏 {safeTranslate('demo_view_devotee', 'Devotee App', 'ভক্ত অ্যাপ', 'भक्त ऐप')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {safeTranslate('demo_view_devotee_desc', 'See what your community members see', 'আপনার সম্প্রদায়ের সদস্যরা যা দেখেন তা দেখুন', 'देखें कि आपके समुदाय के सदस्य क्या देखते हैं')}
              </p>
            </button>
          </div>
          {/* Staff role previews — demo-only (never weakens production RBAC).
              Lets a buyer feel what each role's workspace is like. */}
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2">
            {safeTranslate('demo_view_staff_label', 'Also explore as — staff roles', 'কর্মী ভূমিকা হিসেবেও দেখুন', 'स्टाफ भूमिकाओं के रूप में भी देखें')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STAFF_VIEWS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setView(s.id)}
                className={`p-2.5 rounded-xl border text-left transition-all min-h-[52px] ${
                  view === s.id
                    ? 'border-saffron-500 bg-saffron-50 ring-2 ring-saffron-500/20'
                    : 'border-slate-200 bg-white hover:border-saffron-500/30'
                }`}
              >
                <p className={`text-[13px] font-bold ${view === s.id ? 'text-saffron-900' : 'text-slate-700'}`}>
                  <span aria-hidden className="mr-1">{s.icon}</span>{s.label}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
          <button
            disabled={!selected}
            onClick={() => selected && onSelect(selected, view)}
            className={`px-8 py-3 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 min-h-[44px] ${
              selected 
                ? 'bg-saffron-500 hover:bg-saffron-600 text-white shadow-saffron-500/25' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {safeTranslate('enter_demo_btn', 'Enter Demo Workspace', 'ডেমো ওয়ার্কস্পেসে প্রবেশ করুন', 'डेमो कार्यक्षेत्र दर्ज करें')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
