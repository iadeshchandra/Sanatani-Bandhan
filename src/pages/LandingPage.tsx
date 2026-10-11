import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Calculator,
  FileCode2,
  Globe,
  Building2,
  ArrowRight,
  Lock,
  CheckCircle2,
  Sparkles,
  Landmark,
  TrendingDown,
  Layers,
  Utensils,
  Receipt,
  WifiOff,
  Flame,
  Siren,
  Scan,
  Boxes,
  Radio,
  MonitorPlay,
  Sun,
  Coins,
  Award,
  Check,
  Eye,
  Zap,
  Users,
  AlertTriangle,
  Menu,
  X,
  Volume2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { PrivacyPolicy } from '../components/public/PrivacyPolicy';
import { TermsOfService } from '../components/public/TermsOfService';
import { SecurityWhitepaper } from '../components/public/SecurityWhitepaper';
import { DemoSelectionModal } from '../components/public/DemoSelectionModal';
import { WorkspaceType } from '../types';

interface LandingPageProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onDemoStart?: (type: WorkspaceType) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSignupClick,
  onDemoStart,
}) => {
  const navigate = useNavigate();
  const { loginAsRole, addWorkspace, switchWorkspace } = useAuthWorkspace();
  const { language, setLanguage, safeTranslate } = useLanguage();
  const { showToast } = useToast();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [tosOpen, setTosOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  // Fiduciary ROI Calculator State
  const [hundiCollection, setHundiCollection] = useState<number>(25000000); // ₹2.5 Crore default
  const [dailyMeals, setDailyMeals] = useState<number>(3500); // 3,500 meals default

  // Computed ROI Metrics
  const leakagePrevented = useMemo(() => {
    return Math.round(hundiCollection * 0.042); // 4.2% estimated leakage prevention
  }, [hundiCollection]);

  const groceryWasteReduced = useMemo(() => {
    return Math.round(dailyMeals * 16 * 365 * 0.125); // ₹16/meal, 12.5% spoilage prevention
  }, [dailyMeals]);

  const auditHoursSaved = useMemo(() => {
    return Math.round(120 + (dailyMeals / 500) * 10);
  }, [dailyMeals]);

  const handleStartDemo = (type: WorkspaceType = 'Mandir') => {
    if (onDemoStart) {
      onDemoStart(type);
      return;
    }
    loginAsRole('Trustee', 'Sri Kashi Vishwanath Mandir Trust');
    showToast('Sandbox Demo initialized with sample records & double-entry ledger.', 'success', 'Demo Sandbox');
    navigate('/admin');
  };

  const handleGoToLogin = () => {
    if (onLoginClick) {
      onLoginClick();
      return;
    }
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* Schema.org Structured Metadata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'SoftwareApplication',
                name: 'Sanatani Bandhan',
                operatingSystem: 'Web browser, Progressive Web App',
                applicationCategory: 'BusinessApplication, ERP',
                description:
                  'Enterprise-grade Sovereign Spiritual ERP for Mandirs, Mathas, Goshalas, and Dharmic Trusts with biometric turnstiles, blind hundi audit, sanctum teleprompter, and kinetic BOM.',
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'INR',
                },
              },
              {
                '@type': 'Organization',
                name: 'Sanatani Bandhan',
                url: 'https://sanatanibandhan.com',
                description: 'Provider of Sovereign Dharmic Administration and Temple Management Software.',
              },
            ],
          }),
        }}
      />

      {/* STICKY INSTITUTIONAL NAVBAR */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight">
                  SANATANI BANDHAN
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  ENTERPRISE v4.0
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                {safeTranslate('tagline', 'Sovereign Spiritual ERP', 'সার্বভৌম আধ্যাত্মিক ইআরপি', 'संप्रभु आध्यात्मिक ईआरपी')}
              </span>
            </div>
          </div>

          {/* Navigation Links & Action Cluster */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <select
                aria-label="Select Interface Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent text-slate-300 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-slate-900 text-white">English</option>
                <option value="hi" className="bg-slate-900 text-white">हिंदी</option>
                <option value="bn" className="bg-slate-900 text-white">বাংলা</option>
                <option value="sa" className="bg-slate-900 text-white">संस्कृतम्</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setDemoModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Explore Sandbox Demo</span>
            </button>

            <button
              type="button"
              onClick={handleGoToLogin}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Tenant Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN BODY CONTENT */}
      <main className="flex-1">
        {/* SECTION 1: HERO SECTION */}
        <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-24 px-4 sm:px-6 max-w-6xl mx-auto text-center bg-temple-950 text-white">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

          {/* Shastric Shloka & Tag Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase bg-amber-500/15 border border-amber-500/35 text-amber-300 mb-6 shadow-xs">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>धर्मो रक्षति रक्षितः &bull; Military-Grade Sovereign Operating System</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.1]">
            The Sovereign Spiritual ERP for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
              Modern Dharmic Administration
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Eliminate cash disputes, digitize treasuries with native Tally Prime XML sync, automate 80G tax certificates, command biometric turnstiles at sub-400ms speed, and synchronize kitchen BOM logistics with Vedic Tithis.
          </p>

          {/* Dual Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto sm:max-w-none">
            <button
              type="button"
              onClick={() => (onSignupClick ? onSignupClick() : setDemoModalOpen(true))}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base shadow-2xl shadow-amber-500/30 flex items-center justify-center gap-3 transition-all active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-slate-950 fill-slate-950" />
              <span>Explore Sandbox Demo</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>

            <button
              type="button"
              onClick={onSignupClick ? onSignupClick : handleGoToLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 text-white font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>Tenant Login</span>
            </button>
          </div>

          <div className="mt-6 text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Trusted by 140+ Mandirs, Mathas, and Dharmada Kshetra Trusts Across Bharat</span>
          </div>
        </section>

        {/* SECTION 2: INSTITUTIONAL TRUST & COMPLIANCE BADGE STRIP */}
        <section className="border-y border-slate-800 bg-slate-950/80 py-7 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-[11px] font-mono font-extrabold text-center text-amber-400/90 uppercase tracking-widest mb-4">
              Institutional Trust, Statutory Compliance & Enterprise Security Seals
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-black text-white">SOC2 Type II Ready</div>
                  <div className="text-[10px] text-slate-400">Tenant Data Isolation</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <Receipt className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-black text-white">CBDT Form 10BD Sync</div>
                  <div className="text-[10px] text-slate-400">80G Direct IT E-Filing</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <FileCode2 className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-black text-white">Tally Prime Native</div>
                  <div className="text-[10px] text-slate-400">Direct Statutory CA Sync</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <Lock className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <div className="text-xs font-black text-white">AES-256 Vault</div>
                  <div className="text-[10px] text-slate-400">Cryptographic Audit Seal</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 col-span-2 sm:col-span-1">
                <WifiOff className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="text-xs font-black text-white">True Offline PWA</div>
                  <div className="text-[10px] text-slate-400">IndexedDB Bi-Directional Sync</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: THE ENTERPRISE ARCHITECTURE BENTO BOX */}
        <section className="py-20 px-4 sm:px-6 max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto">
            <span className="px-3.5 py-1 rounded-full text-[11px] font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              5 Core Architectural Engines
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-3">
              The Enterprise Engine Bento Box
            </h2>
            <p className="text-xs sm:text-base text-slate-400 mt-3 leading-relaxed">
              Every critical dimension of heritage temple governance—from biometric queue control and blind hundi counts to Garbhagriha teleprompters and military-grade perimeter lockdowns.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cell 1: Biometric Gate Command & Tatkal Kiosk (Domain 1) */}
            <div className="lg:col-span-6 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-mono font-extrabold uppercase text-amber-400 flex items-center gap-1.5">
                    <Scan className="w-4 h-4 text-amber-400" />
                    Domain 1: Crowd & Biometrics
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    &lt;400ms Scan Latency
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Biometric Gate Command & Tatkal Kiosk
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  Sub-400ms QR turnstile verification with physical anti-passback controls. Self-service thermal pass issuance with automated surge throttling during Mahotsav festivals.
                </p>

                {/* Visual Mockup */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>TURNSTILE #02 (VIP CORRIDOR): PASS VERIFIED</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px]">SUCCESS</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Devotee: Sri Somnath Shastri</span>
                    <span>Throughput: 142 pilgrims/min</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-800/80 mt-5 flex items-center justify-between text-xs font-mono text-amber-400 font-bold">
                <span>Anti-Passback Active</span>
                <span className="text-slate-400">Kiosk Thermal Ready ✓</span>
              </div>
            </div>

            {/* Cell 2: Maker-Checker Blind Hundi Audit (Domain 2) */}
            <div className="lg:col-span-6 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-mono font-extrabold uppercase text-amber-400 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-400" />
                    Domain 2: Treasury Governance
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    Zero Leakage Seal
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  True Maker-Checker Blind Hundi Audit
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  Dual-custodian blind physical count reconciliation. Discrepancy flagging (&gt;₹500) prevents cash diversion, while auto-generating Tally Prime XML journals and Section 80G Form 10BD records.
                </p>

                {/* Visual Mockup */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span>HUNDI BATCH #HB-9810 (SANCTUM MAIN)</span>
                    <span className="text-emerald-400">VARIANCE: ₹0.00</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Counter A: ₹4,82,500</span>
                    <span>Counter B: ₹4,82,500 &bull; Dual-Key Sealed ✓</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-800/80 mt-5 flex items-center justify-between text-xs font-mono text-amber-400 font-bold">
                <span>Instant Form 10BD Export</span>
                <span className="text-slate-400">Tally XML Compliant ✓</span>
              </div>
            </div>

            {/* Cell 3: Sanctum Maha-Sankalpa Teleprompter & Panchang Radar (Domain 3) - WIDE HERO CELL */}
            <div className="lg:col-span-12 bg-black border-2 border-amber-600/40 rounded-3xl p-6 sm:p-9 shadow-2xl relative overflow-hidden text-amber-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      Domain 3: Garbhagriha HUD & Ephemeris
                    </span>
                    <span className="text-xs font-mono text-amber-400/80">
                      Garbhagriha Terminal: ARCHAKA-SCREEN-01
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    Sanctum Maha-Sankalpa HUD &amp; Panchang Radar
                  </h3>

                  <p className="text-xs sm:text-sm text-amber-200/80 leading-relaxed font-sans">
                    Engineered in high-contrast dark mode to be visible through incense smoke and dim oil-lamp lighting. Features dynamic Sanskrit Desha-Kala invocations, hands-free devotee Gotra scrolling, 1-tap &ldquo;उच्चारित (Recited)&rdquo; WhatsApp confirmation, and live Abhijit Muhurat booking gatekeeping.
                  </p>
                </div>

                {/* Mini Preview Box */}
                <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-center space-y-2.5 shrink-0 lg:w-96">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-extrabold block">
                    LIVE GARBHAGRIHA CHANTING PROMPTER
                  </span>
                  <div className="text-lg sm:text-xl font-serif font-black text-white">
                    Sri Rajeshwar Sharma &amp; Parivar
                  </div>
                  <div className="flex justify-center gap-3 text-xs font-mono text-amber-300">
                    <span>गोत्र: <strong>Kashyapa</strong></span>
                    <span>&bull;</span>
                    <span>नक्षत्र: <strong>Rohini</strong></span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>MARK RECITED (उच्चारित)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cell 4: Kinetic BOM Simulator & Mega-Kitchen Logistics (Domain 4/5) */}
            <div className="lg:col-span-6 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-mono font-extrabold uppercase text-amber-400 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-amber-400" />
                    Domain 4 &amp; 5: Annadanam Scale
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    Industrial BOM
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Kinetic BOM Simulator &amp; Mega-Kitchen Logistics
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  Calculate raw material draws for 100,000-portion Prasadam batches with real-time decanting progress bars. Tithi-synchronized algorithms forecast Ghee and Rice burn-rate horizons before festivals.
                </p>

                {/* Visual Mockup */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span>Maha Annadanam Khichdi (10,000 Portions)</span>
                    <span className="text-emerald-400">₹14.25 / portion</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="w-3/4 h-full bg-gradient-to-r from-amber-400 to-orange-500" />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Basmati Rice: 1,500kg &minus; 1,350kg = 150kg remaining
                  </span>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-800/80 mt-5 flex items-center justify-between text-xs font-mono text-amber-400 font-bold">
                <span>Auto-PO Requisition</span>
                <span className="text-slate-400">Zero Spoilage Engine ✓</span>
              </div>
            </div>

            {/* Cell 5: Tactical Perimeter Radar with Emergency Perimeter Lockdown (Domain 6) */}
            <div className="lg:col-span-6 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-mono font-extrabold uppercase text-rose-400 flex items-center gap-1.5">
                    <Siren className="w-4 h-4 text-rose-400" />
                    Domain 6: Tactical Defense
                  </span>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
                    Emergency Perimeter Lockdown
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Tactical Perimeter Radar with Emergency Perimeter Lockdown
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  Architectural micro-perimeter vector blueprint tracking live choke-point velocities. Features two-stage emergency kill switch instantly freezing turnstiles and halting kiosk sales in &lt;500ms.
                </p>

                {/* Visual Mockup */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between text-rose-400 font-bold">
                    <span>GATE 2 SUGAM CORRIDOR: CRITICAL CHOKE POINT</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] animate-pulse">
                      ALERT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Velocity: 138 pilgrims/min</span>
                    <span>QRT Alpha Dispatched ✓</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-800/80 mt-5 flex items-center justify-between text-xs font-mono text-rose-400 font-bold">
                <span>Dual-Key CSO Override</span>
                <span className="text-slate-400">Meshnet Ready ✓</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: INTERACTIVE FIDUCIARY ROI & LEAKAGE CALCULATOR */}
        <section className="py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-800">
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-950 border-2 border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="max-w-3xl mb-10">
              <span className="px-3.5 py-1 rounded-full text-[11px] font-mono font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Fiduciary Impact Modeling
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-3">
                Interactive Fiduciary ROI &amp; Leakage Calculator
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                Simulate the direct financial recovery and waste reduction achieved by deploying Sanatani Bandhan&apos;s Maker-Checker Hundi Audit and Kinetic Kitchen BOM.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Sliders Block */}
              <div className="lg:col-span-6 space-y-7">
                {/* Slider 1: Annual Hundi Inflow */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 font-bold uppercase">
                      Annual Hundi Collection
                    </span>
                    <span className="text-base font-black text-amber-400">
                      ₹{(hundiCollection / 10000000).toFixed(2)} Crores
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1000000}
                    max={500000000}
                    step={1000000}
                    value={hundiCollection}
                    onChange={(e) => setHundiCollection(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-800 rounded-lg accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>₹10 Lakhs (Local Mandir)</span>
                    <span>₹25 Cr (Heritage Shrine)</span>
                    <span>₹50 Cr (Mahakshetra)</span>
                  </div>
                </div>

                {/* Slider 2: Daily Annadanam Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 font-bold uppercase">
                      Daily Annadanam Volume
                    </span>
                    <span className="text-base font-black text-orange-400">
                      {dailyMeals.toLocaleString('en-IN')} Meals / Day
                    </span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={50000}
                    step={100}
                    value={dailyMeals}
                    onChange={(e) => setDailyMeals(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-800 rounded-lg accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>200 Meals</span>
                    <span>10,000 Meals</span>
                    <span>50,000 Meals</span>
                  </div>
                </div>
              </div>

              {/* Dynamic ROI Metrics Display */}
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                    Estimated Cash Leakage Prevented
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    ₹{leakagePrevented.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dual-custodian blind count with CCTV reconciliation tags (4.2% recovery).
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-orange-500/30 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-orange-400 font-bold block">
                    Grocery Waste Prevented
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    ₹{groceryWasteReduced.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Kinetic recipe explosion with zero inventory decay (12.5% savings).
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                    Statutory CA Audit Labor Saved
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {auditHoursSaved} Hours / Year
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Direct XML journal export to Tally Prime &amp; instant Form 10BD generation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: FINAL CONVERSION CALL TO ACTION */}
        <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-tr from-amber-600/20 via-slate-900 to-orange-600/20 border-2 border-amber-500/40 shadow-2xl space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Bring Sovereign Transparency &amp; Physical Command to Your Kshetra
            </h2>
            <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Join leading temple trusts and pilgrimage boards across Bharat. Launch a pre-seeded sandbox demo in 60 seconds with zero credit card required.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => handleStartDemo('Mandir')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2.5"
              >
                <Sparkles className="w-5 h-5 text-slate-950 fill-slate-950" />
                <span>Launch Live Sandbox Demo</span>
              </button>

              <button
                type="button"
                onClick={handleGoToLogin}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-base shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>Sign In to Existing Mandir Tenant</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* COMPREHENSIVE ENTERPRISE FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-slate-300 font-bold">
              SANATANI BANDHAN &bull; Sovereign Spiritual ERP
            </div>
            <div>
              &copy; {new Date().getFullYear()} Sanatani Bandhan. Engineered for Mandirs, Mathas, Goshalas, and Dharmada Kshetra Trusts.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-slate-400">
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setTosOpen(true)}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setSecurityOpen(true)}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Security Whitepaper
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <DemoSelectionModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onSelect={(type) => {
          setDemoModalOpen(false);
          handleStartDemo(type);
        }}
      />

      {privacyOpen && <PrivacyPolicy onClose={() => setPrivacyOpen(false)} />}
      {tosOpen && <TermsOfService onClose={() => setTosOpen(false)} />}
      {securityOpen && <SecurityWhitepaper onClose={() => setSecurityOpen(false)} />}
    </div>
  );
};

export default LandingPage;
