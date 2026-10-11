import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, ArrowRight } from 'lucide-react';
import { WorkspaceType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface DemoSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: WorkspaceType) => void;
}

const ORG_TYPES: WorkspaceType[] = [
  'Mandir', 'Goshala', 'Sangha', 'Ashram', 'Gurukul',
  'AkshayaPatra', 'MahotsavSamiti', 'PurohitSabha', 'KashiKshetra', 'AkshayaPatra'
];

export const DemoSelectionModal: React.FC<DemoSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { safeTranslate } = useLanguage();
  const [selected, setSelected] = useState<WorkspaceType | null>(null);

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
                <p className={`text-sm font-bold ${selected === type ? 'text-saffron-900' : 'text-slate-700'}`}>{type}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
          <button
            disabled={!selected}
            onClick={() => selected && onSelect(selected)}
            className={`px-8 py-3 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 ${
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
