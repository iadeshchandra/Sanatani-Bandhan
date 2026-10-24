import React from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const PrivacyPolicy: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { safeTranslate, t } = useLanguage();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {safeTranslate('privacy_title', 'Privacy Policy', 'গোপনীয়তা নীতি', 'गोपनीयता नीति')}
              </h2>
              <p className="text-sm font-medium text-slate-500">{t('surfaces.privacy.lastUpdatedAugust2026')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar prose prose-slate max-w-none prose-headings:font-bold prose-h3:text-slate-900 prose-p:text-slate-600 prose-a:text-saffron-500">
          <h3>{t('surfaces.privacy.1IntroductionAndCorePhilosophy')}</h3>
          <p>
            Sanatani Bandhan ("we", "our", or "us") is deeply committed to protecting the privacy and security of the Dharmic institutions we serve. We recognize that temple management software handles highly sensitive community data, including donor information, lineage (Vanshavali) records, and internal organizational communications. This Privacy Policy details our offline-first architecture approach, ensuring that your data belongs to you, always.
          </p>
          
          <h3>{t('surfaces.privacy.2InformationWeCollect')}</h3>
          <p>{t('surfaces.privacy.weCollectInformationInTheFollowing')}</p>
          <ul>
            <li><strong>{t('surfaces.privacy.institutionalAccountData')}</strong>{' '}{t('surfaces.privacy.nameOfTheOrganizationAdministratorNames')}</li>
            <li><strong>{t('surfaces.privacy.operationalDataEncrypted')}</strong>{' '}{t('surfaces.privacy.devoteeRecordsTreasuryLogsAssetInventories')}</li>
            <li><strong>{t('surfaces.privacy.telemetryData')}</strong>{' '}{t('surfaces.privacy.anonymousAggregatedSystemPerformanceMetricsT')}</li>
          </ul>

          <h3>{t('surfaces.privacy.3DataIsolationAndStorage')}</h3>
          <p>
            Every institution on Sanatani Bandhan operates within a strictly isolated data silo. We employ an offline-first architecture, meaning that data can optionally reside entirely on your local devices and only syncs to our secure cloud servers (hosted in Mumbai, India) when explicitly configured for cloud backup. We do not mix, mine, or aggregate data across different temples or organizations.
          </p>

          <h3>{t('surfaces.privacy.4ThirdPartySharing')}</h3>
          <p>
            <strong>{t('surfaces.privacy.weDoNotSellRentOr')}</strong> We only share data with carefully vetted sub-processors (such as payment gateways for 80G donations or SMS providers for OTPs) strictly for the purpose of providing our services to you. All third-party providers are bound by strict DPAs (Data Processing Agreements).
          </p>

          <h3>{t('surfaces.privacy.5YourRightsAndControl')}</h3>
          <p>
            You retain absolute ownership of all data entered into the Sanatani Bandhan platform. As an administrator, you can export your entire database in CSV/JSON format at any time. Upon account deletion, all active and backup data associated with your workspace is permanently cryptographically shredded within 30 days.
          </p>

          <h3>{t('surfaces.privacy.6ContactOurPrivacyTeam')}</h3>
          <p>
            If you have questions about this policy or our data practices, please contact our Data Protection Officer at <strong>privacy@sanatanibandhan.com</strong>.
          </p>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-md">
            I Understand
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
