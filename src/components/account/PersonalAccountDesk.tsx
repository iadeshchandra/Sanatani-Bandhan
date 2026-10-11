import React, { useState, useEffect } from 'react';
import {
  UserCircle, QrCode, Shield, Sparkles, Key, BookOpen, 
  HelpCircle, Settings, LogOut, CheckCircle2, ChevronRight,
  Phone, Mail, MapPin, Heart, Flame, Award, Calendar,
  Download, Printer, Share2, Copy, Check, ExternalLink,
  Bot, Search, ArrowRight, RefreshCw, AlertCircle, Eye, EyeOff,
  SwitchCamera, Edit3, X, Zap, Volume2, Send, Clock, FileText,
  Bookmark, Activity, Building2
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { useData } from "../../context/DataContext";

export type ProfileTab = 'card' | 'assistant' | 'non_ai_help' | 'bookings' | 'sadhana' | 'settings';

export const PersonalAccountDesk: React.FC<{
  initialTab?: ProfileTab;
  onNavigateDesk?: (deskId: string) => void;
}> = ({ initialTab = 'card', onNavigateDesk }) => {
  const { currentUser, currentRole, activeWorkspace, setViewMode, switchRole, logout } = useAuthWorkspace();
  const { treasury } = useData();
  const { language, setLanguage, safeTranslate, t } = useLanguage();
  const taxonomy = useWorkspaceTaxonomy();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const profileStorageKey = `sanatani_profile_${currentUser?.id || 'DEVOTEE'}`;
  
  const [profileData, setProfileData] = useState(() => {
    const defaultData = {
      name: currentUser?.name || 'Acharya Devotee',
      email: (currentUser as any)?.email || 'devotee@sanatan.org',
      phone: '+91 98765 43210',
      sanataniId: `SB-${String(activeWorkspace?.id || 'KASH').toUpperCase().slice(0, 4)}-2083`,
      gotra: 'Kashyapa',
      nakshatra: 'Rohini',
      kulaDaivam: 'Sri Shiva Parvati',
      city: activeWorkspace?.city || 'Varanasi',
      bloodGroup: 'B+',
      emergencyContact: '+91 98765 00000 (Spouse)',
      joinedDate: 'Chaitra Shukla Pratipada, 2081',
      membershipTier: 'Dharmic Sevadhari Patron',
      badge: 'Verified Sevak'
    };
    try {
      const saved = localStorage.getItem(profileStorageKey);
      if (saved) return { ...defaultData, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return defaultData;
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(profileStorageKey, JSON.stringify(profileData));
      showToast('Profile updated successfully! 🙏', 'success');
      setIsEditingProfile(false);
    } catch (e) {
      showToast('Failed to save profile', 'error');
    }
  };

  // API Key Management State
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('user_gemini_api_key') || '';
  });
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<'idle' | 'valid' | 'invalid'>(() => {
    return localStorage.getItem('user_gemini_api_key') ? 'valid' : 'idle';
  });
  const [showApiKeyGuide, setShowApiKeyGuide] = useState(false);

  const handleSaveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      localStorage.removeItem('user_gemini_api_key');
      setKeyValidationStatus('idle');
      showToast('Removed custom API key (will use default if available)', 'info');
      return;
    }

    setIsValidatingKey(true);
    try {
      const res = await fetch('/api/gemini/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKey.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user_gemini_api_key', geminiApiKey.trim());
        setKeyValidationStatus('valid');
        showToast('✅ Gemini API Key verified and saved securely in your browser!', 'success');
      } else {
        setKeyValidationStatus('invalid');
        showToast(`❌ Verification failed: ${data.error || 'Invalid key'}`, 'error');
      }
    } catch (e: any) {
      // If offline or network err, save locally anyway with warning
      localStorage.setItem('user_gemini_api_key', geminiApiKey.trim());
      setKeyValidationStatus('valid');
      showToast('Saved custom API key to local storage', 'info');
    } finally {
      setIsValidatingKey(false);
    }
  };

  // Copy Helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast(`Copied ${label} to clipboard!`, 'success');
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Print ID Card
  const handlePrintCard = () => {
    window.print();
  };

  // Non-AI Knowledge Base Query State
  const [nonAiSearch, setNonAiSearch] = useState('');
  const [nonAiCategory, setNonAiCategory] = useState<'all' | 'DEVOTEE' | 'MANAGER' | 'MANAGER'>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  // AI Chat Assistant State inside Account
  const [aiChatPrompt, setAiChatPrompt] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    shloka?: string;
    source?: string;
    points?: string[];
    time: string;
  }>>([
    {
      id: 'welcome-ai',
      sender: 'assistant',
      text: `Namaste ${profileData.name}! I am your personal Dharmic & ERP AI Assistant. You can ask me any question about Vedic rituals, Shloka meanings, Panchang muhurat, or how to use Sanatani Bandhan ERP modules.`,
      shloka: 'सत्यं वद। धर्मं चर। स्वाध्यायान्मा प्रमदः।',
      source: 'Taittiriya Upanishad 1.11.1',
      points: [
        'Ask for Samagri list for any Pooja (Rudrabhishek, Satyanarayan, Navagraha)',
        'Check auspicious Muhurat guidance and Tithi calculations',
        'Learn how to generate 80G tax receipts, manage Goshala diets, and trace Gotra ancestry'
      ],
      time: 'Just now'
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleSendAiMessage = async (queryOverride?: string) => {
    const textToSend = (queryOverride || aiChatPrompt).trim();
    if (!textToSend || isAiLoading) return;

    const userMsg = {
      id: 'u_' + Date.now(),
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAiChatMessages(prev => [...prev, userMsg]);
    setAiChatPrompt('');
    setIsAiLoading(true);

    try {
      const customKey = localStorage.getItem('user_gemini_api_key') || undefined;
      const res = await fetch('/api/gemini/dharmic-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          customApiKey: customKey,
          workspaceType: activeWorkspace?.type || 'MANDIR',
          workspaceName: activeWorkspace?.name || 'Sanatan Mandir',
          language: language,
          activeModule: 'personal-account'
        })
      });
      const data = await res.json();
      if (data.success && data.result) {
        const botMsg = {
          id: 'bot_' + Date.now(),
          sender: 'assistant' as const,
          text: data.result.summary || data.result.title || 'Guidance received.',
          shloka: data.result.shloka,
          source: data.result.scriptureSource,
          points: data.result.guidancePoints || [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setAiChatMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error(data.error || 'No response from assistant');
      }
    } catch (err: any) {
      const fallbackBotMsg = {
        id: 'bot_err_' + Date.now(),
        sender: 'assistant' as const,
        text: `Regarding "${textToSend}": In Sanatan Dharma, consistent prayer and transparent seva bring peace and prosperity. You can explore the dedicated desks in the menu for deeper actions.`,
        shloka: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।',
        source: 'Bhagavad Gita 2.47',
        points: [
          'Visit the Rituals & Puja desk to reserve slots',
          'Use the Sadhana desk for daily Japa tracking',
          'Consult with your temple purohit or trustee for custom Sankalpas'
        ],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAiChatMessages(prev => [...prev, fallbackBotMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Non-AI Knowledge Base Data
  const knowledgeBaseItems = [
    {
      id: 'faq-1',
      category: 'DEVOTEE',
      role: 'Devotee / Member',
      title: 'How do I book a Pooja, Havan, or Darshan Sankalp?',
      steps: [
        'Navigate to the "Purohit" or "Puja Booking" tab from the bottom navigation bar.',
        'Select your desired Vedic ritual (e.g. Rudrabhishek, Navagraha Shanti, Satyanarayan Katha).',
        'Enter Yajamana details (Gotra, Nakshatra, Rashi, and Sankalp intention).',
        'Choose your preferred date and available Vedic scholar / Purohit.',
        'Complete the Dakshina / Chanda contribution securely to receive an instant digital Sankalp receipt.'
      ],
      deskAction: 'pooja-booking',
      deskLabel: 'Go to Puja Booking Desk'
    },
    {
      id: 'faq-2',
      category: 'DEVOTEE',
      role: 'Devotee / Member',
      title: 'How do I download my 80G Tax Exemption Certificate for donations?',
      steps: [
        'Open the "My Bookings & Receipts" tab right here in your Personal Account section.',
        'Locate the donation or Chanda transaction in the ledger history.',
        'Click "Download 80G Certificate" or "Print PDF".',
        'The generated receipt includes official Trust Registration No., 80G Approval Code, and QR verification.'
      ],
      deskAction: 'tax-receipt-80g',
      deskLabel: 'Open 80G Tax Desk'
    },
    {
      id: 'faq-3',
      category: 'DEVOTEE',
      role: 'Devotee / Member',
      title: 'How to use the Daily Japa Counter & Personal Sadhana Tracker?',
      steps: [
        'Click on the "Sadhana" tab in the bottom bar.',
        'Choose your Ishta Devata mantra (e.g. Maha Mrityunjaya, Gayatri Mantra, Hare Krishna).',
        'Tap the digital Mala bead / counter for each repetition; it automatically tallies 108 counts per round.',
        'Enable audio sound / haptic vibration feedback for a tactile bead-turning experience.',
        'Track your weekly consistency streak and earn Dharmic Sadhana badges.'
      ],
      deskAction: 'personal-sadhana',
      deskLabel: 'Open Sadhana Desk'
    },
    {
      id: 'faq-4',
      category: 'MANAGER',
      role: 'Staff / Manager',
      title: 'How do I record and seal Hundi Cash collections?',
      steps: [
        'Open Treasury Ledger from the Admin / Manager menu.',
        'Select "+ New Transaction" and choose category "Hundi Cash Collection".',
        'Enter denomination breakdown (e.g. 500x10, 200x25, 100x40, coins).',
        'Assign at least two verifying witnesses (Sevadars or Pujaris) for double-blind validation.',
        'Submit to generate a tamper-proof Hundi Seal Receipt with automatic audit log tracking.'
      ],
      deskAction: 'treasury-ledger',
      deskLabel: 'Open Treasury Ledger'
    },
    {
      id: 'faq-5',
      category: 'MANAGER',
      role: 'Staff / Manager',
      title: 'How to manage Daily Aarti Rosters & Volunteer Shifts?',
      steps: [
        'Access Mandir Operations -> Aarti & Duty Roster.',
        'Select Morning Mangala, Bhog Aarti, Sandhya Aarti, or Shayan Aarti shifts.',
        'Assign certified Pujaris, Dhak/Mridangam players, and Prasadam distribution volunteers.',
        'Broadcast automatic shift reminders via WhatsApp / SMS.'
      ],
      deskAction: 'aarti-roster',
      deskLabel: 'View Aarti Roster'
    },
    {
      id: 'faq-6',
      category: 'MANAGER',
      role: 'Staff / Manager',
      title: 'How to calculate Kitchen Ingredients for Large Annadanam Footfall?',
      steps: [
        'Open Annadanam Kitchen Desk from the Seva menu.',
        'Enter the estimated devotee count (e.g. 500, 1,000, 5,000).',
        'The calculator auto-computes exact quantities: Basmati Rice, Toor Dal, Desi Ghee, Vegetables, and Jaggery.',
        'Check inventory stock in real-time to alert the procurement manager if raw materials run low.'
      ],
      deskAction: 'annadanam-kitchen',
      deskLabel: 'Open Kitchen Desk'
    },
    {
      id: 'faq-7',
      category: 'MANAGER',
      role: 'Trustee / Admin',
      title: 'How to configure Role-Based Permissions (RBAC) for Mandir Staff?',
      steps: [
        'Navigate to System Settings -> User Roles & Access Control.',
        'Click "Add New Staff Member" or edit an existing profile.',
        'Assign role permissions: Trustee (Full Access), Manager (Operations & Treasury Entry), Purohit (Rituals & Muhurat), or Volunteer.',
        'Set 2FA or biometric requirements for approving transactions above ₹50,000.'
      ],
      deskAction: 'user-roles',
      deskLabel: 'Open User Roles Desk'
    },
    {
      id: 'faq-8',
      category: 'MANAGER',
      role: 'Trustee / Admin',
      title: 'How to perform Monthly Fiduciary Double-Entry Audit & Exports?',
      steps: [
        'Go to Audit Log Desk under Enterprise Compliance.',
        'Select date range and filter by Cash, UPI, Bank Transfer, or In-Kind Asset donations.',
        'Review cryptographic hash signatures for every ledger ledger entry.',
        'Click "Export CA Audit Pack (Excel/PDF)" to produce balance sheet & income/expenditure statements.'
      ],
      deskAction: 'security-audit-log',
      deskLabel: 'Open Audit Log Desk'
    }
  ];

  const filteredFaqs = knowledgeBaseItems.filter(item => {
    const matchesCategory = nonAiCategory === 'all' || item.category === nonAiCategory;
    const matchesSearch = !nonAiSearch.trim() || 
      item.title.toLowerCase().includes(nonAiSearch.toLowerCase()) ||
      item.steps.some(s => s.toLowerCase().includes(nonAiSearch.toLowerCase())) ||
      item.role.toLowerCase().includes(nonAiSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-full bg-temple-100 flex flex-col overflow-hidden relative">
      {/* Top Banner & User Profile Hero */}
      <div className="bg-gradient-to-r from-temple-900 via-temple-800 to-saffron-950 text-white p-3 sm:p-6 shrink-0 shadow-md border-b border-saffron-900/40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto overflow-hidden">
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-saffron-500 to-saffron-400 p-0.5 shadow-xl">
                <div className="w-full h-full bg-temple-900 rounded-[14px] flex items-center justify-center text-xl sm:text-2xl font-black text-saffron-400">
                  {profileData.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 p-0.5 sm:p-1 bg-emerald-500 text-white rounded-full border-2 border-temple-900" title="Verified Devotee">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white truncate">
                  {profileData.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-saffron-500/20 text-saffron-300 border border-saffron-500/40 whitespace-nowrap">
                  {profileData.badge}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-temple-300 mt-1 flex-wrap font-medium">
                <span className="text-saffron-400 font-bold whitespace-nowrap">{profileData.sanataniId}</span>
                <span className="hidden sm:inline">•</span>
                <span className="whitespace-nowrap">{profileData.gotra} Gotra</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate max-w-[120px] sm:max-w-none">{activeWorkspace?.name || 'Sanatani Mandir'}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-temple-400 mt-0.5 flex items-center gap-1 truncate">
                <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-saffron-400 shrink-0" />
                <span className="truncate">Tier: <strong className="text-temple-200">{profileData.membershipTier}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Button in Header */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0">
            <button
              onClick={() => setIsEditingProfile(true)}
              className="flex-1 sm:flex-none justify-center items-center flex gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-bold transition-all border border-white/10"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>

            <button
              onClick={() => {
                setViewMode('MANAGER');
                showToast(`Switched back to ${activeWorkspace?.name || 'Organisation'} Console 🙏`, 'success', 'Mode Changed');
              }}
              className="flex-1 sm:flex-none justify-center items-center flex gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-500 hover:from-saffron-600 hover:to-saffron-600 text-temple-950 text-[11px] sm:text-xs font-black transition-all shadow-md cursor-pointer border border-saffron-300"
              title="Switch back to Organisation / Mandir Management Workspace (46 Desks)"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">Organisation View</span>
            </button>
          </div>
        </div>

        {/* Quick Karma Stat Counters (Horizontal Scroll on Mobile) */}
        <div className="max-w-4xl mx-auto mt-4 pt-3 sm:pt-4 border-t border-white/10">
          <div className="flex sm:grid sm:grid-cols-4 gap-2 sm:gap-3 overflow-x-auto no-scrollbar snap-x pb-1">
            <div className="bg-white/5 rounded-xl p-2 sm:p-2.5 border border-white/5 shrink-0 w-[110px] sm:w-auto text-center snap-center">
              <p className="text-[10px] sm:text-[11px] text-temple-400 font-bold">Puja Sankalps</p>
              <p className="text-sm sm:text-lg font-black text-saffron-400 mt-0.5">12 Completed</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2 sm:p-2.5 border border-white/5 shrink-0 w-[110px] sm:w-auto text-center snap-center">
              <p className="text-[10px] sm:text-[11px] text-temple-400 font-bold">Sadhana Streak</p>
              <p className="text-sm sm:text-lg font-black text-saffron-400 mt-0.5">24 Days 🔥</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2 sm:p-2.5 border border-white/5 shrink-0 w-[110px] sm:w-auto text-center snap-center">
              <p className="text-[10px] sm:text-[11px] text-temple-400 font-bold">Offerings</p>
              <p className="text-sm sm:text-lg font-black text-rose-400 mt-0.5">108 Pushpam 🌺</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2 sm:p-2.5 border border-white/5 shrink-0 w-[110px] sm:w-auto text-center snap-center">
              <p className="text-[10px] sm:text-[11px] text-temple-400 font-bold">Seva Points</p>
              <p className="text-sm sm:text-lg font-black text-emerald-400 mt-0.5">1,450 Karma</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white border-b border-temple-200 px-4 py-2 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-bold">
          {[
            { key: 'card', label: '🪪 Smart Digital Card', icon: QrCode },
            { key: 'assistant', label: '🤖 Personal AI Assistant', icon: Bot, highlight: true },
            { key: 'non_ai_help', label: '🛡️ Offline Help & SOPs', icon: HelpCircle },
            { key: 'bookings', label: '📜 Bookings & 80G', icon: FileText },
            { key: 'sadhana', label: '🧘 Sadhana Stats', icon: Flame },
            { key: 'settings', label: '⚙️ Preferences', icon: Settings },
          ].map((t, idx) => (
            <button
              key={`${t.key}-${idx}`}
              onClick={() => setActiveTab(t.key as ProfileTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                activeTab === t.key
                  ? 'bg-saffron-500 text-temple-950 font-black shadow-xs'
                  : 'text-temple-600 hover:text-temple-900 hover:bg-temple-100'
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          
          {/* TAB 1: SMART DIGITAL ID CARD */}
          {activeTab === 'card' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-gradient-to-br from-temple-900 via-temple-850 to-temple-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-saffron-500/30 relative overflow-hidden">
                {/* Decorative background aura */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-saffron-500/10 rounded-full filter blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-saffron-500/10 rounded-full filter blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-temple-800">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-saffron-500 flex items-center justify-center text-temple-950 font-black text-2xl shadow-lg">
                      🕉️
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-white">
                        {activeWorkspace?.name || 'Sanatani Mandir'}
                      </h2>
                      <p className="text-xs text-saffron-400 font-bold uppercase tracking-widest mt-0.5">
                        Official Universal Sanatani Member Card
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-saffron-500/20 border border-saffron-500/40 text-saffron-300 text-xs font-black">
                    Active Valid Pass • 2083
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 my-6">
                  {/* Devotee Info */}
                  <div className="sm:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-temple-400 uppercase font-bold tracking-wider">Devotee Name</p>
                        <p className="text-base font-bold text-white mt-0.5">{profileData.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-temple-400 uppercase font-bold tracking-wider">Sanatani Devotee ID</p>
                        <p className="text-base font-bold text-saffron-400 font-mono mt-0.5">{profileData.sanataniId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-temple-400 uppercase font-bold tracking-wider">Gotra & Pravara</p>
                        <p className="text-sm font-semibold text-temple-200 mt-0.5">{profileData.gotra} Gotra</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-temple-400 uppercase font-bold tracking-wider">Nakshatra / Rashi</p>
                        <p className="text-sm font-semibold text-temple-200 mt-0.5">{profileData.nakshatra}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-temple-400 uppercase font-bold tracking-wider">Kula Daivam</p>
                        <p className="text-sm font-semibold text-temple-200 mt-0.5">{profileData.kulaDaivam}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-temple-400 uppercase font-bold tracking-wider">Blood Group</p>
                        <p className="text-sm font-semibold text-rose-400 mt-0.5">{profileData.bloodGroup}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-temple-800 text-xs text-temple-400">
                      <span>Emergency Contact: <strong className="text-temple-300">{profileData.emergencyContact}</strong></span>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl text-temple-950 shadow-inner">
                    <div className="w-28 h-28 bg-temple-100 rounded-xl border border-temple-300 flex flex-col items-center justify-center p-1.5">
                      <QrCode className="w-20 h-20 text-temple-900" />
                      <span className="text-[9px] font-bold font-mono tracking-tighter text-temple-600 mt-1">{profileData.sanataniId}</span>
                    </div>
                    <span className="text-[10px] font-bold text-temple-600 mt-2 text-center">Scan at Mandir Gate for Priority Darshan & Prasad</span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="relative z-10 pt-4 border-t border-temple-800 flex flex-wrap items-center justify-between text-xs text-temple-400 gap-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographically Signed by Sanatani Bandhan Registry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrintCard}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Pass
                    </button>
                    <button
                      onClick={() => handleCopy(profileData.sanataniId, 'Sanatani ID')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-saffron-500 hover:bg-saffron-600 text-temple-950 rounded-lg font-black text-xs transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy ID
                    </button>
                  </div>
                </div>
              </div>

              {/* Devotee Bio & Personal Details Card */}
              <div className="bg-white rounded-2xl p-6 border border-temple-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-temple-900 flex items-center gap-2">
                    <UserCircle className="w-5 h-5 text-saffron-600" />
                    Personal & Spiritual Profile Details
                  </h3>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs font-bold text-saffron-600 hover:text-saffron-700 hover:underline"
                  >
                    Edit Info
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-temple-50 rounded-xl border border-temple-100">
                    <span className="text-temple-500 font-medium">Registered Email</span>
                    <p className="font-bold text-temple-800 mt-1">{profileData.email}</p>
                  </div>
                  <div className="p-3 bg-temple-50 rounded-xl border border-temple-100">
                    <span className="text-temple-500 font-medium">Phone / WhatsApp</span>
                    <p className="font-bold text-temple-800 mt-1">{profileData.phone}</p>
                  </div>
                  <div className="p-3 bg-temple-50 rounded-xl border border-temple-100">
                    <span className="text-temple-500 font-medium">City & State</span>
                    <p className="font-bold text-temple-800 mt-1">{profileData.city}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL AI ASSISTANT (WITH API KEY MANAGER & QUICK GUIDE) */}
          {activeTab === 'assistant' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* API Key Configuration Card */}
              <div className="bg-gradient-to-br from-saffron-50 to-saffron-50 rounded-2xl p-5 border border-saffron-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-saffron-200/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-saffron-500 text-white flex items-center justify-center font-black shadow-xs">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-saffron-950">
                        Custom Gemini API Key (Optional Personal Engine)
                      </h3>
                      <p className="text-xs text-saffron-800 font-medium">
                        Devotees, Managers, and Admins can connect their personal Google Gemini key for unlimited AI interactions.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowApiKeyGuide(!showApiKeyGuide)}
                    className="flex items-center gap-1 text-xs font-bold text-saffron-900 bg-saffron-200/60 hover:bg-saffron-200 px-3 py-1.5 rounded-xl transition-colors shrink-0"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showApiKeyGuide ? 'Hide Guide' : 'How to get free key?'}</span>
                  </button>
                </div>

                {/* Quick Step-by-Step Guide Modal / Accordion */}
                {showApiKeyGuide && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-saffron-300 text-xs text-temple-700 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-temple-900 flex items-center gap-1.5 text-sm">
                        <Sparkles className="w-4 h-4 text-saffron-500" />
                        How to get your Free Gemini API Key in 3 Simple Steps
                      </h4>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">100% Free • No Credit Card Required</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 bg-temple-50 rounded-xl border border-temple-200">
                        <span className="w-6 h-6 rounded-full bg-saffron-500 text-white font-black text-xs inline-flex items-center justify-center mb-2">1</span>
                        <p className="font-bold text-temple-900 mb-1">Open Google AI Studio</p>
                        <p className="text-temple-500 text-[11px]">Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-saffron-600 font-bold underline inline-flex items-center gap-0.5">aistudio.google.com <ExternalLink className="w-2.5 h-2.5" /></a> and sign in with your Google account.</p>
                      </div>

                      <div className="p-3 bg-temple-50 rounded-xl border border-temple-200">
                        <span className="w-6 h-6 rounded-full bg-saffron-500 text-white font-black text-xs inline-flex items-center justify-center mb-2">2</span>
                        <p className="font-bold text-temple-900 mb-1">Click "Create API Key"</p>
                        <p className="text-temple-500 text-[11px]">Select "Create API key in new project". Google generates your secret key in 2 seconds.</p>
                      </div>

                      <div className="p-3 bg-temple-50 rounded-xl border border-temple-200">
                        <span className="w-6 h-6 rounded-full bg-saffron-500 text-white font-black text-xs inline-flex items-center justify-center mb-2">3</span>
                        <p className="font-bold text-temple-900 mb-1">Paste Key Below</p>
                        <p className="text-temple-500 text-[11px]">Paste the copied string (e.g. <code>AIzaSy...</code>) into the box below and click "Save & Test Key".</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Input & Test Controls */}
                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={isKeyVisible ? 'text' : 'password'}
                      value={geminiApiKey}
                      onChange={(e) => {
                        setGeminiApiKey(e.target.value);
                        setKeyValidationStatus('idle');
                      }}
                      placeholder="Paste your personal Gemini API key (AIzaSy...)"
                      className="w-full pl-3 pr-10 py-2.5 bg-white border border-saffron-300 rounded-xl text-xs font-mono text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsKeyVisible(!isKeyVisible)}
                      className="absolute right-2.5 top-2.5 text-temple-400 hover:text-temple-600"
                    >
                      {isKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    onClick={handleSaveApiKey}
                    disabled={isValidatingKey}
                    className="px-5 py-2.5 bg-gradient-to-r from-saffron-600 to-saffron-600 hover:from-saffron-700 hover:to-saffron-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isValidatingKey ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save & Test Key</span>
                      </>
                    )}
                  </button>
                </div>

                {keyValidationStatus === 'valid' && (
                  <p className="text-[11px] text-emerald-700 font-bold mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Custom API Key active & verified. Your requests use your personal Gemini quota directly.
                  </p>
                )}
              </div>

              {/* Interactive AI Chat Box */}
              <div className="bg-white rounded-3xl border border-temple-200 shadow-xs overflow-hidden flex flex-col h-[520px]">
                {/* Chat Header */}
                <div className="px-5 py-3.5 bg-temple-50 border-b border-temple-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-saffron-500 flex items-center justify-center text-white font-bold shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-temple-900">Personal Dharmic AI Assistant</h4>
                      <p className="text-[10px] text-temple-500">Grounded in Vedic Scriptures, Muhurat Astrology, and ERP Workflows</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-saffron-700 bg-saffron-100 px-2 py-0.5 rounded-full">
                      Model: Gemini 2.5 Flash
                    </span>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-temple-50/50">
                  {aiChatMessages.map((msg, idx) => (
                    <div
                      key={`${msg.id}-${idx}`}
                      className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-saffron-500 text-temple-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                          🕉️
                        </div>
                      )}

                      <div className={`max-w-lg rounded-2xl p-4 text-xs space-y-2 ${
                        msg.sender === 'user'
                          ? 'bg-saffron-600 text-white font-medium rounded-br-none shadow-xs'
                          : 'bg-white text-temple-800 border border-temple-200 rounded-bl-none shadow-xs'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>

                        {/* Shloka Card if included */}
                        {msg.shloka && (
                          <div className="p-3 bg-saffron-50 rounded-xl border border-saffron-200 text-temple-900 my-1">
                            <div className="text-[10px] font-black text-saffron-800 uppercase tracking-wider mb-1">
                              {msg.source || 'Scriptural Shloka'}
                            </div>
                            <p className="font-serif font-bold text-saffron-950 text-xs italic">{msg.shloka}</p>
                          </div>
                        )}

                        {/* Guidance Points */}
                        {msg.points && msg.points.length > 0 && (
                          <ul className="space-y-1 pt-1 border-t border-temple-100 text-temple-700 list-disc list-inside">
                            {msg.points.map((pt, idx) => (
                              <li key={idx} className="leading-normal">{pt}</li>
                            ))}
                          </ul>
                        )}

                        <div className={`text-[9px] pt-1 ${msg.sender === 'user' ? 'text-saffron-200 text-right' : 'text-temple-400'}`}>
                          {msg.time}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isAiLoading && (
                    <div className="flex gap-2 items-center text-xs text-temple-500 font-bold italic py-2">
                      <RefreshCw className="w-4 h-4 text-saffron-500 animate-spin" />
                      Consulting Vedic scriptures & neural reasoning...
                    </div>
                  )}
                </div>

                {/* Suggested Prompts */}
                <div className="px-4 py-2 bg-temple-100/70 border-t border-temple-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                  <span className="text-temple-400 font-bold shrink-0">Try asking:</span>
                  {[
                    'Samagri required for Satyanarayan Puja',
                    'How to download 80G tax receipt?',
                    'Rules for Gotra pravara compatibility',
                    'Auspicious Muhurat for Griha Pravesh'
                  ].map((prompt, idx) => (
                    <button
                      key={prompt}
                      onClick={() => handleSendAiMessage(prompt)}
                      className="px-2.5 py-1 bg-white hover:bg-saffron-100 text-temple-700 hover:text-saffron-900 rounded-lg whitespace-nowrap border border-temple-200 transition-colors font-medium shrink-0"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="p-3 bg-white border-t border-temple-200 flex items-center gap-2">
                  <input
                    type="text"
                    value={aiChatPrompt}
                    onChange={(e) => setAiChatPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendAiMessage();
                    }}
                    placeholder="Ask any Dharmic, Shastric, or Mandir ERP question..."
                    className="flex-1 px-4 py-2.5 bg-temple-50 border border-temple-200 rounded-xl text-xs text-temple-900 focus:outline-none focus:ring-2 focus:ring-saffron-500"
                  />
                  <button
                    onClick={() => handleSendAiMessage()}
                    disabled={isAiLoading || !aiChatPrompt.trim()}
                    className="p-2.5 bg-saffron-600 hover:bg-saffron-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NON-AI OFFLINE KNOWLEDGE & SOP CENTER */}
          {activeTab === 'non_ai_help' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-6 border border-temple-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-temple-900 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-indigo-600" />
                      Non-AI Classical Knowledge Base & SOP Center
                    </h3>
                    <p className="text-xs text-temple-500 mt-0.5">
                      100% Offline • Zero latency • Comprehensive operational rulebook for Devotees, Staff Managers, and Admins.
                    </p>
                  </div>

                  {/* Role filter */}
                  <div className="flex items-center gap-1.5 bg-temple-100 p-1 rounded-xl text-xs font-bold">
                    {[
                      { key: 'all', label: 'All SOPs' },
                      { key: 'DEVOTEE', label: 'Devotee' },
                      { key: 'MANAGER', label: 'Manager' },
                      { key: 'MANAGER', label: 'Admin/Trustee' }
                    ].map((f, idx) => (
                      <button
                        key={`${f.key}-${idx}`}
                        onClick={() => setNonAiCategory(f.key as any)}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          nonAiCategory === f.key
                            ? 'bg-white text-indigo-900 shadow-xs font-black'
                            : 'text-temple-600 hover:text-temple-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-temple-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={nonAiSearch}
                    onChange={(e) => setNonAiSearch(e.target.value)}
                    placeholder="Search guides, 80G rules, Hundi procedures, Japa counter, kitchen recipes..."
                    className="w-full pl-10 pr-4 py-2.5 bg-temple-50 border border-temple-200 rounded-xl text-xs text-temple-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Accordion FAQ Items */}
                <div className="space-y-3">
                  {filteredFaqs.length === 0 ? (
                    <p className="text-xs text-temple-400 text-center py-6">No SOPs found matching your query.</p>
                  ) : (
                    filteredFaqs.map((item, idx) => {
                      const isExpanded = expandedFaqId === item.id;
                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            isExpanded
                              ? 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                              : 'bg-temple-50/70 border-temple-200 hover:border-temple-300'
                          }`}
                        >
                          <button
                            onClick={() => setExpandedFaqId(isExpanded ? null : item.id)}
                            className="w-full p-4 text-left flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                item.category === 'MANAGER'
                                  ? 'bg-purple-100 text-purple-800'
                                  : item.category === 'MANAGER'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {item.role}
                              </span>
                              <h4 className="text-sm font-bold text-temple-900">{item.title}</h4>
                            </div>
                            <span className="text-temple-400 font-bold text-lg">{isExpanded ? '−' : '+'}</span>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 border-t border-indigo-100 text-xs text-temple-700 space-y-3">
                              <ol className="space-y-2 list-decimal list-inside leading-relaxed">
                                {item.steps.map((step, idx) => (
                                  <li key={idx} className="pl-1">
                                    <span className="font-medium">{step}</span>
                                  </li>
                                ))}
                              </ol>

                              {item.deskAction && onNavigateDesk && (
                                <div className="pt-2">
                                  <button
                                    onClick={() => onNavigateDesk(item.deskAction)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-all"
                                  >
                                    <span>{item.deskLabel}</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MY BOOKINGS & 80G TAX RECEIPTS */}
          {activeTab === 'bookings' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-6 border border-temple-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-temple-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-saffron-600" />
                      My Bookings, Expenses & Tax
                    </h3>
                    <p className="text-xs text-temple-500 mt-0.5">
                      View your registered Sankalpas, donations, and expense reimbursements.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-temple-200">
                  {[
                    {
                      id: 'REC-2083-0091',
                      title: 'Maha Rudrabhishek & Bilva Archana',
                      date: '15 Aug 2026',
                      amount: '₹2,500',
                      status: 'Completed 🙏',
                      purohit: 'Pandit Radheshyam Shastri',
                      is80G: true
                    },
                    {
                      id: 'REC-2083-0045',
                      title: 'Desi Gir Cow Green Grass Fodder Sponsorship',
                      date: '02 Aug 2026',
                      amount: '₹5,100',
                      status: 'Completed 🐄',
                      purohit: 'Goshala Seva Dal',
                      is80G: true
                    },
                    {
                      id: 'REC-2083-0012',
                      title: 'Maha Annadanam 100 Devotee Meal Seva',
                      date: '18 Jul 2026',
                      amount: '₹11,000',
                      status: 'Completed 🍲',
                      purohit: 'Annapurna Kitchen',
                      is80G: true
                    }
                  ].map((rec, idx) => (
                    <div key={`${rec.id}-${idx}`} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-temple-900">{rec.title}</h4>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-md border border-emerald-200">
                            {rec.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-temple-500 mt-1">
                          <span className="font-mono text-temple-700 font-bold">{rec.id}</span>
                          <span>•</span>
                          <span>Date: {rec.date}</span>
                          <span>•</span>
                          <span>Conducted by: {rec.purohit}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-saffron-900">{rec.amount}</span>
                        <button
                          onClick={() => {
                            showToast(`Downloaded 80G Certificate for ${rec.id}!`, 'success');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-temple-100 hover:bg-temple-200 text-temple-800 rounded-xl text-xs font-bold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> 80G PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SADHANA & SPIRITUAL STATS */}
          {activeTab === 'sadhana' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-6 border border-temple-200 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-black text-temple-900 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-saffron-600" />
                    Personal Sadhana, Japa & Karma Milestones
                  </h3>
                  <p className="text-xs text-temple-500 mt-0.5">
                    Your daily devotion and meditation history recorded for spiritual elevation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-saffron-50 rounded-2xl border border-saffron-200">
                    <span className="text-xs font-bold text-saffron-800">Total Japa Count</span>
                    <p className="text-2xl font-black text-saffron-950 mt-1">21,600 Beads</p>
                    <p className="text-[11px] text-saffron-700 mt-1">200 Malas completed</p>
                  </div>

                  <div className="p-4 bg-saffron-50 rounded-2xl border border-saffron-200">
                    <span className="text-xs font-bold text-saffron-800">Active Streak</span>
                    <p className="text-2xl font-black text-saffron-950 mt-1">24 Days 🔥</p>
                    <p className="text-[11px] text-saffron-700 mt-1">Top 5% devotee consistency</p>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-800">Seva Contribution</span>
                    <p className="text-2xl font-black text-emerald-950 mt-1">42 Hours</p>
                    <p className="text-[11px] text-emerald-700 mt-1">Goshala & Kitchen volunteer</p>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-temple-500 mb-3">Earned Dharmic Badges</h4>
                  <div className="flex flex-wrap gap-2.5">
                    <span className="px-3 py-1.5 bg-saffron-100 text-saffron-900 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-saffron-300">
                      🏆 108 Malas Master
                    </span>
                    <span className="px-3 py-1.5 bg-saffron-100 text-saffron-900 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-saffron-300">
                      🐄 Go-Seva Ratna
                    </span>
                    <span className="px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-300">
                      🍲 Annapurna Sevak
                    </span>
                    <span className="px-3 py-1.5 bg-purple-100 text-purple-900 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-purple-300">
                      📜 Gita Adhyayan Gold
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PREFERENCES & SECURITY */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-6 border border-temple-200 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-black text-temple-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-temple-700" />
                    Account Preferences & Security
                  </h3>
                  <p className="text-xs text-temple-500 mt-0.5">
                    Manage language, role switches, and security configurations.
                  </p>
                </div>

                {/* Language Switcher */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-temple-700 uppercase tracking-wider">
                    Preferred Language (भाषा)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { code: 'en', name: 'English' },
                      { code: 'hi', name: 'हिन्दी (Hindi)' },
                      { code: 'bn', name: 'বাংলা (Bengali)' },
                      { code: 'sa', name: 'संस्कृतम् (Sanskrit)' }
                    ].map((l, idx) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLanguage(l.code as any);
                          showToast(`Language set to ${l.name}`, 'success');
                        }}
                        className={`p-3 rounded-xl text-xs font-bold border text-center transition-all ${
                          language === l.code
                            ? 'bg-saffron-500 border-saffron-600 text-temple-950 shadow-xs'
                            : 'bg-temple-50 border-temple-200 text-temple-700 hover:bg-temple-100'
                        }`}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Role Switcher if authorized */}
                {((currentRole as string) === 'SuperAdmin' || (currentRole as string) === 'SUPER_ADMIN' || (currentRole as string) === 'Sevadar' || (currentRole as string) === 'MANAGER' || (currentRole as string) === 'Trustee' || (currentRole as string) === 'TRUSTEE') && (
                  <div className="pt-4 border-t border-temple-200 space-y-2">
                    <label className="text-xs font-bold text-temple-700 uppercase tracking-wider">
                      Switch Role Mode
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => switchRole('SuperAdmin')}
                        className="px-4 py-2 bg-temple-100 hover:bg-temple-200 text-temple-800 rounded-xl text-xs font-bold"
                      >
                        Trustee / Head Admin
                      </button>
                      <button
                        onClick={() => switchRole('Sevadar')}
                        className="px-4 py-2 bg-temple-100 hover:bg-temple-200 text-temple-800 rounded-xl text-xs font-bold"
                      >
                        Staff Manager
                      </button>
                      <button
                        onClick={() => switchRole('Devotee')}
                        className="px-4 py-2 bg-temple-100 hover:bg-temple-200 text-temple-800 rounded-xl text-xs font-bold"
                      >
                        Devotee View
                      </button>
                    </div>
                  </div>
                )}

                {/* Sign Out Button */}
                <div className="pt-6 border-t border-temple-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-temple-900">Sign Out of Sanatani Bandhan</h4>
                    <p className="text-[11px] text-temple-500">Securely sign out from this device</p>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-temple-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-temple-200 flex items-center justify-between bg-temple-50">
              <h3 className="font-black text-temple-900 text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-saffron-600" />
                Edit Devotee & Spiritual Profile
              </h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1 rounded-full text-temple-400 hover:text-temple-700 hover:bg-temple-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-temple-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-temple-50 border border-temple-200 rounded-xl focus:ring-2 focus:ring-saffron-500 text-temple-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-temple-700 mb-1">Gotra *</label>
                  <input
                    type="text"
                    required
                    value={profileData.gotra}
                    onChange={(e) => setProfileData({ ...profileData, gotra: e.target.value })}
                    className="w-full px-3 py-2 bg-temple-50 border border-temple-200 rounded-xl focus:ring-2 focus:ring-saffron-500 text-temple-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-temple-700 mb-1">Nakshatra</label>
                  <input
                    type="text"
                    value={profileData.nakshatra}
                    onChange={(e) => setProfileData({ ...profileData, nakshatra: e.target.value })}
                    className="w-full px-3 py-2 bg-temple-50 border border-temple-200 rounded-xl focus:ring-2 focus:ring-saffron-500 text-temple-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-temple-700 mb-1">Kula Daivam</label>
                  <input
                    type="text"
                    value={profileData.kulaDaivam}
                    onChange={(e) => setProfileData({ ...profileData, kulaDaivam: e.target.value })}
                    className="w-full px-3 py-2 bg-temple-50 border border-temple-200 rounded-xl focus:ring-2 focus:ring-saffron-500 text-temple-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-temple-700 mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-temple-50 border border-temple-200 rounded-xl focus:ring-2 focus:ring-saffron-500 text-temple-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-temple-700 mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={profileData.bloodGroup}
                    onChange={(e) => setProfileData({ ...profileData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 bg-temple-50 border border-temple-200 rounded-xl focus:ring-2 focus:ring-saffron-500 text-temple-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-temple-700 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={profileData.emergencyContact}
                  onChange={(e) => setProfileData({ ...profileData, emergencyContact: e.target.value })}
                  className="w-full px-3 py-2 bg-temple-50 border border-temple-200 rounded-xl focus:ring-2 focus:ring-saffron-500 text-temple-900 font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-temple-100">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 text-temple-600 font-bold hover:text-temple-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-saffron-500 hover:bg-saffron-600 text-temple-950 font-black rounded-xl shadow-md transition-all active:scale-95"
                >
                  Save Profile 🙏
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalAccountDesk;
