import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Book, MessageCircle, FileText, Settings, Shield, ChevronRight, ArrowLeft, PlayCircle, LifeBuoy } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SUPPORT_EMAIL } from '../../config/contact';

export const HelpSupport: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { safeTranslate, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'home' | 'category' | 'article'>('home');
  const [selectedTitle, setSelectedTitle] = useState('');

  const KNOWLEDGE_BASE: Record<string, React.ReactNode> = {
    'How to generate an 80G compliant donation receipt?': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.issuing80gCompliantTaxReceiptsIs')}</p>
         <ol className="list-decimal pl-5 space-y-2">
           <li>{t('surfaces.help.navigateToThe')}{' '}<strong>{t('surfaces.help.treasuryLedger')}</strong> desk.</li>
           <li>Click <strong>{t('surfaces.help.newEntry')}</strong>{' '}{t('surfaces.help.andSelectDonationChanda')}</li>
           <li>{t('surfaces.help.selectTheDevoteeEnsureTheir')}{' '}<strong>{t('surfaces.help.panNumber')}</strong>{' '}{t('surfaces.help.isUpdatedInTheirCrmProfile')}</li>
           <li>{t('surfaces.help.enterTheAmountAndClickSave')}</li>
         </ol>
         <p className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm border border-emerald-100">{t('surfaces.help.proTipIfYouHaveThe')}</p>
       </div>
    ),
    'Importing Devotee records from Excel/CSV': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.migratingFromPaperKhatasOrLegacy')}</p>
         <ol className="list-decimal pl-5 space-y-2">
           <li>{t('surfaces.help.goToThe')}{' '}<strong>{t('surfaces.help.bulkImport')}</strong>{' '}{t('surfaces.help.deskFromYourDashboard')}</li>
           <li>{t('surfaces.help.downloadTheStandardCsvTemplate')}</li>
           <li>{t('surfaces.help.fillInTheDetailsNamePhone')}</li>
           <li>{t('surfaces.help.uploadTheFileOurSystemAutomatically')}</li>
         </ol>
       </div>
    ),
    'Setting up multi-admin access control': (
       <div className="space-y-4 text-slate-600">
         <p>Sanatani Bandhan uses strict Role-Based Access Control (RBAC) to ensure security.</p>
         <ul className="list-disc pl-5 space-y-2">
           <li><strong>Trustee:</strong>{' '}{t('surfaces.help.fullAccessToTreasuryMasterSettings')}</li>
           <li><strong>Purohit:</strong>{' '}{t('surfaces.help.accessToPoojaBookingsSankalpDetails')}</li>
           <li><strong>Accountant:</strong>{' '}{t('surfaces.help.canGenerate80gReceiptsAndView')}</li>
           <li><strong>Volunteer:</strong>{' '}{t('surfaces.help.limitedToScanningQrPassesAnd')}</li>
         </ul>
         <p>{t('surfaces.help.assignTheseRolesInThe')}{' '}<strong>{t('surfaces.help.userRoles')}</strong> desk.</p>
       </div>
    ),
    'Understanding offline-first synchronization': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.templeFestivalsGetCrowdedAndInternet')}</p>
         <p><strong>{t('surfaces.help.howItWorks')}</strong> If you lose internet connection, you can continue scanning QR passes, logging donations, and adding devotees. The data is securely encrypted and stored locally on your device.</p>
         <p>{t('surfaces.help.onceYourDeviceDetectsAnActive')}</p>
       </div>
    ),
    'Customizing your Workspace Taxonomy': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.ourPlatformAutomaticallyAdaptsItsTerminology')}</p>
         <p>{t('surfaces.help.goToThe')}{' '}<strong>{t('surfaces.help.workspaceSelector')}</strong>. If you switch from "Mandir" to "Goshala", the UI will change "Devotees" to "Gau Sevaks", and "Poojas" to "Gau Seva". This ensures the software feels native to your daily Dharmic operations.</p>
       </div>
    ),
    '1-Click WhatsApp Broadcasts for Tithis & Festivals': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.callingHundredsOfDevoteesIsExhausting')}</p>
         <ol className="list-decimal pl-5 space-y-2">
           <li>{t('surfaces.help.openThe')}{' '}<strong>{t('surfaces.help.whatsappBroadcaster')}</strong> desk.</li>
           <li>{t('surfaces.help.selectYourAudienceEGAll')}</li>
           <li>{t('surfaces.help.typeYourMessageOrSelectA')}</li>
           <li>{t('surfaces.help.clickSendMessagesAreDispatchedIndividually')}</li>
         </ol>
       </div>
    ),
    'AES-256 Encryption & Data Isolation': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.yourDevoteeDataIsYourMost')}</p>
         <ul className="list-disc pl-5 space-y-2">
           <li><strong>{t('surfaces.help.aes256Encryption')}</strong>{' '}{t('surfaces.help.allSensitiveFieldsPanContactInfo')}</li>
           <li><strong>{t('surfaces.help.dataIsolation')}</strong>{' '}{t('surfaces.help.yourWorkspaceDataIsCryptographicallyIsolated')}</li>
           <li><strong>{t('surfaces.help.auditLogs')}</strong>{' '}{t('surfaces.help.everyActionTakenByAnyAdmin')}</li>
         </ul>
       </div>
    ),
    'Admin Dashboard Walkthrough': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.watchThisComprehensive5MinuteVideo')}</p>
         <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center text-slate-400">
           <div className="flex flex-col items-center gap-2">
             <PlayCircle className="w-12 h-12 opacity-50" />
             <span className="text-sm font-medium">{t('surfaces.help.videoPlayerPlaceholder')}</span>
           </div>
         </div>
       </div>
    ),
    'Setting up the Puja Calendar': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.learnHowToConfigureYourPuja')}</p>
         <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center text-slate-400">
           <div className="flex flex-col items-center gap-2">
             <PlayCircle className="w-12 h-12 opacity-50" />
             <span className="text-sm font-medium">{t('surfaces.help.videoPlayerPlaceholder')}</span>
           </div>
         </div>
       </div>
    ),
    'Mastering the Treasury Ledger': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.aDeepDiveIntoTheDouble')}</p>
         <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center text-slate-400">
           <div className="flex flex-col items-center gap-2">
             <PlayCircle className="w-12 h-12 opacity-50" />
             <span className="text-sm font-medium">{t('surfaces.help.videoPlayerPlaceholder')}</span>
           </div>
         </div>
       </div>
    ),
    'How to open a support ticket': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.encounteredAnIssueOurEngineeringTeam')}</p>
         <ol className="list-decimal pl-5 space-y-2">
           <li>{t('surfaces.help.ensureYouAreLoggedInWith')}{' '}<strong>Trustee</strong> or <strong>Admin</strong> account.</li>
           <li>{t('surfaces.help.clickOnThe')}{' '}<strong>Help</strong>{' '}{t('surfaces.help.iconInTheBottomRightCorner')}</li>
           <li>Select <strong>{t('surfaces.help.openNewTicket')}</strong>.</li>
           <li>{t('surfaces.help.describeYourIssueInDetailAnd')}</li>
         </ol>
       </div>
    ),
    'Check ticket status': (
       <div className="space-y-4 text-slate-600">
         <p>{t('surfaces.help.youCanTrackTheProgressOf')}</p>
         <p>{t('surfaces.help.navigateTo')}{' '}<strong>{t('surfaces.help.masterSettingsGtSupportTickets')}</strong>{' '}{t('surfaces.help.toViewAListOfAll')}</p>
       </div>
    ),
    'Enterprise SLA details': (
       <div className="space-y-4 text-slate-600">
         <p>Sanatani Bandhan offers dedicated Service Level Agreements (SLAs) for enterprise Dharmic institutions.</p>
         <ul className="list-disc pl-5 space-y-2">
           <li><strong>{t('surfaces.help.criticalIssuesP0')}</strong>{' '}{t('surfaces.help.1HourResponseTime247')}</li>
           <li><strong>{t('surfaces.help.highPriorityP1')}</strong>{' '}{t('surfaces.help.4HourResponseTimeDuringBusiness')}</li>
           <li><strong>{t('surfaces.help.generalInquiriesP2')}</strong>{' '}{t('surfaces.help.24HourResponseTime')}</li>
         </ul>
       </div>
    )
  };

  const CATEGORIES = [
    {
      icon: <Book className="w-6 h-6 text-saffron-500" />,
      title: 'Documentation',
      description: 'Comprehensive written guides for Dharmic workspace modules.',
      articles: [
        'Setting up multi-admin access control',
        'Importing Devotee records from Excel/CSV',
        'How to generate an 80G compliant donation receipt?',
        'Customizing your Workspace Taxonomy'
      ]
    },
    {
      icon: <PlayCircle className="w-6 h-6 text-indigo-500" />,
      title: 'Video Tutorials',
      description: 'Step-by-step visual guides and onboarding webinars.',
      articles: [
        'Admin Dashboard Walkthrough',
        'Setting up the Puja Calendar',
        'Mastering the Treasury Ledger'
      ]
    },
    {
      icon: <LifeBuoy className="w-6 h-6 text-emerald-500" />,
      title: 'Ticket System',
      description: 'Open a ticket for technical issues or enterprise support.',
      articles: [
        'How to open a support ticket',
        'Check ticket status',
        'Enterprise SLA details'
      ]
    }
  ];

  const POPULAR_ARTICLES = [
    'How to generate an 80G compliant donation receipt?',
    'Importing Devotee records from Excel/CSV',
    'Admin Dashboard Walkthrough',
    'How to open a support ticket',
    'Setting up multi-admin access control'
  ];

  const handleOpenCategory = (title: string) => {
    setSelectedTitle(title);
    setActiveView('category');
  };

  const handleOpenArticle = (title: string) => {
    setSelectedTitle(title);
    setActiveView('article');
  };

  const handleBack = () => {
    if (activeView === 'article' && CATEGORIES.some(c => c.title === selectedTitle)) {
        setActiveView('category');
    } else {
        setActiveView('home');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="p-6 md:p-8 bg-slate-900 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-saffron-500 rounded-full blur-3xl opacity-20"></div>
          
          <div className="relative z-10 flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              {activeView !== 'home' && (
                <button onClick={handleBack} className="p-2 -ml-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              )}
              <div>
                <h2 className="text-2xl md:text-3xl font-black mb-1">
                  {activeView === 'home' ? 'Help & Support Center' : selectedTitle}
                </h2>
                {activeView === 'home' && (
                  <p className="text-slate-400 font-medium text-base">{t('surfaces.help.howCanWeHelpYouToday')}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {activeView === 'home' && (
            <div className="relative z-10 max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder={t('surfaces.help.searchForArticlesGuidesOrFeatures')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:bg-white/20 transition-all font-medium text-base backdrop-blur-md"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
          {activeView === 'home' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {CATEGORIES.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase())).map((cat, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleOpenCategory(cat.title)}
                    className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-saffron-500/50 hover:shadow-lg transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{cat.title}</h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed">{cat.description}</p>
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  Popular Articles
                </h3>
                <div className="space-y-3">
                  {POPULAR_ARTICLES.filter(a => a.toLowerCase().includes(searchQuery.toLowerCase())).map((article, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleOpenArticle(article)}
                      className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group text-left"
                    >
                      <span className="font-medium text-slate-700 group-hover:text-saffron-500 transition-colors">{article}</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-saffron-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === 'category' && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Book className="w-5 h-5 text-saffron-500" />
                    Articles in {selectedTitle}
                  </h3>
                  <div className="space-y-3">
                    {CATEGORIES.find(c => c.title === selectedTitle)?.articles.map((article, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => handleOpenArticle(article)}
                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group text-left"
                      >
                        <span className="font-medium text-slate-700 group-hover:text-saffron-500 transition-colors">{article}</span>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-saffron-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
             </div>
          )}

          {activeView === 'article' && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-10 shadow-sm">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold mb-6">
                    <FileText className="w-3 h-3" /> Article
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-8 leading-tight">{selectedTitle}</h1>
                  
                  {KNOWLEDGE_BASE[selectedTitle] ? (
                    KNOWLEDGE_BASE[selectedTitle]
                  ) : (
                    <div className="space-y-6 text-slate-600 leading-relaxed">
                      <p className="text-lg font-medium text-slate-700">
                        This article is currently being updated by our support team.
                      </p>
                      <p>
                        Please check back later or contact enterprise support for immediate assistance regarding {selectedTitle.toLowerCase()}.
                      </p>
                    </div>
                  )}
                </div>
             </div>
          )}

          <div className="bg-indigo-50 rounded-2xl p-6 md:p-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-100">
            <div>
              <h3 className="text-xl font-bold text-indigo-900 mb-2">{t('surfaces.help.stillNeedHelp')}</h3>
              <p className="text-indigo-700/80 font-medium">{t('surfaces.help.ourEngineeringAndSupportTeamIs')}</p>
            </div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="shrink-0 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
