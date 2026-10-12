import React, { useState } from 'react';
import {
  Landmark,
  Globe,
  Menu,
  X,
  Play,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Receipt,
  Users,
  Repeat,
  WifiOff,
  Megaphone,
  CheckCircle2,
  Flame,
  ChevronRight,
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
  const { loginAsRole } = useAuthWorkspace();
  const { language, setLanguage } = useLanguage();
  const { showToast } = useToast();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [tosOpen, setTosOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

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

  const handleSignup = () => {
    if (onSignupClick) {
      onSignupClick();
      return;
    }
    setDemoModalOpen(true);
  };

  const features = [
    {
      icon: Receipt,
      tint: 'bg-emerald-100 text-emerald-600',
      title: 'Treasury & 80G Receipts',
      desc: 'Double-entry temple ledger with instant 80G tax certificates and Tally Prime sync for your CA.',
    },
    {
      icon: ShieldCheck,
      tint: 'bg-amber-100 text-amber-600',
      title: 'Blind Hundi Audit',
      desc: 'Dual-custodian sealed counting with variance alerts — end cash disputes forever.',
    },
    {
      icon: Repeat,
      tint: 'bg-orange-100 text-orange-600',
      title: 'Recurring Seva Mandates',
      desc: 'Monthly annadanam and gau-seva subscriptions with automatic dues tracking and reminders.',
    },
    {
      icon: Users,
      tint: 'bg-indigo-100 text-indigo-600',
      title: 'Devotee Family CRM',
      desc: 'Lifelong devotee records, family trees, and a Universal Sanatani ID across temples.',
    },
    {
      icon: WifiOff,
      tint: 'bg-rose-100 text-rose-600',
      title: 'Works With Zero Internet',
      desc: 'Full offline-first PWA. Counts, collections, and check-ins sync when you are back online.',
    },
    {
      icon: Megaphone,
      tint: 'bg-sky-100 text-sky-600',
      title: 'Utsav Broadcasts',
      desc: 'Broadcast festival alerts, darshan timings, and announcements to every devotee instantly.',
    },
  ];

  const steps = [
    {
      n: '1',
      title: 'Create your free account',
      desc: 'Pick your institution type — Mandir, Goshala, Ashram, or Sangha. No credit card, no salesman.',
    },
    {
      n: '2',
      title: 'Set up in minutes',
      desc: 'Add trustees, link your bank ledgers, and import devotees from your paper registers.',
    },
    {
      n: '3',
      title: 'Run your temple live',
      desc: 'Collect chanda at the counter, count hundis, and file 80G receipts — all from one dashboard.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF8] text-stone-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
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
                applicationCategory: 'BusinessApplication',
                description:
                  'Temple management software for Mandirs, Goshalas, and Ashrams — treasury, hundi audit, devotee CRM, and 80G receipts.',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
              },
              {
                '@type': 'Organization',
                name: 'Sanatani Bandhan',
                url: 'https://sanatanibandhan.web.app',
              },
            ],
          }),
        }}
      />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#FFFDF8]/95 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 cursor-pointer"
            aria-label="Sanatani Bandhan home"
          >
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white text-xl shadow-md shadow-orange-500/25">
              ॐ
            </span>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight">
              Sanatani <span className="text-orange-600">Bandhan</span>
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-xl px-2.5 py-1.5 text-xs">
              <Globe className="w-3.5 h-3.5 text-orange-600" />
              <select
                aria-label="Select language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent font-bold text-xs text-stone-700 focus:outline-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="bn">বাংলা</option>
                <option value="sa">संस्कृतम्</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleGoToLogin}
              className="hidden sm:inline-flex px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-extrabold tracking-wide transition-all cursor-pointer"
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="sm:hidden w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-stone-700 cursor-pointer"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-orange-100 bg-white px-4 py-4 space-y-3">
            <button
              type="button"
              onClick={() => { setIsMobileMenuOpen(false); handleGoToLogin(); }}
              className="w-full py-3 rounded-xl bg-stone-900 text-white text-sm font-extrabold cursor-pointer"
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => { setIsMobileMenuOpen(false); handleSignup(); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-sm font-extrabold cursor-pointer"
            >
              CREATE FREE ACCOUNT
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="px-4 sm:px-6 pt-12 sm:pt-20 pb-14 sm:pb-20 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-orange-200 bg-orange-50 text-orange-700 text-[11px] sm:text-xs font-extrabold tracking-[0.18em] uppercase mb-7">
            <Sparkles className="w-3.5 h-3.5" />
            The ultimate command center for Hindu communities
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-stone-900">
            From Paper Registers to a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">
              Digital Workspace.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
            Unite your Ashram, Sangha, or Mandir. Stop losing records and fighting over funds.
            Manage lifelong devotees, track Chanda securely, and broadcast Utsav alerts —
            all from one secure dashboard.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={handleSignup}
              className="w-full sm:w-auto px-9 py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm sm:text-base tracking-wide shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              CREATE FREE ACCOUNT
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDemoModalOpen(true)}
              className="w-full sm:w-auto px-9 py-4 rounded-2xl bg-white hover:bg-orange-50 border-2 border-stone-200 hover:border-orange-300 text-stone-800 font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center">
                <Play className="w-3 h-3 fill-white ml-0.5" />
              </span>
              WATCH SYSTEM DEMO
            </button>
          </div>

          <p className="mt-6 text-xs text-stone-400 font-medium flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Trusted by 140+ Mandirs, Mathas &amp; Dharmada Kshetra Trusts across Bharat
          </p>
        </section>

        {/* TRUST STRIP */}
        <section className="border-y border-orange-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              ['49', 'Temple desks in one app'],
              ['100%', 'Offline-first, zero internet needed'],
              ['80G', 'Instant tax receipts, Tally-ready'],
              ['256-bit', 'Bank-grade encrypted records'],
            ].map(([big, small]) => (
              <div key={small} className="py-2">
                <div className="text-2xl sm:text-3xl font-black text-orange-600">{big}</div>
                <div className="text-xs text-stone-500 font-medium mt-1">{small}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              Everything your temple runs on,{' '}
              <span className="text-orange-600">in one place.</span>
            </h2>
            <p className="mt-4 text-stone-500 leading-relaxed">
              No more scattered registers, WhatsApp chaos, or year-end CA panic.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-3xl border border-orange-100 p-7 shadow-sm hover:shadow-xl hover:shadow-orange-100 hover:-translate-y-1 transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl ${f.tint} flex items-center justify-center mb-5`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-extrabold text-stone-900 mb-2">{f.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-24 max-w-5xl mx-auto">
          <div className="rounded-[2rem] bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-8 sm:p-14 text-white shadow-2xl shadow-orange-500/25">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-center">
              Live in 60 seconds.
            </h2>
            <p className="text-center text-orange-100 mt-3 max-w-xl mx-auto">
              No hardware to buy. No consultant to hire. If you can use WhatsApp, you can run Sanatani Bandhan.
            </p>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {steps.map((s) => (
                <div key={s.n} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                  <div className="w-10 h-10 rounded-full bg-white text-orange-600 font-black flex items-center justify-center text-lg mb-4">
                    {s.n}
                  </div>
                  <h3 className="font-extrabold text-lg mb-1.5">{s.title}</h3>
                  <p className="text-sm text-orange-100 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={handleSignup}
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-white text-orange-700 font-black text-base tracking-wide shadow-xl hover:bg-orange-50 transition-all active:scale-[0.98] cursor-pointer"
              >
                CREATE FREE ACCOUNT
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* SECURITY NOTE */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-stone-500 text-sm">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-stone-700">धर्मो रक्षति रक्षितः</span>
            <span>— your records are encrypted, audited, and yours alone.</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-stone-400 font-medium">
            {['Deny-by-default data security', 'Dual-custody hundi counts', 'Append-only audit ledger', 'Role-based access'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {t}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-stone-950 text-stone-400 pt-14 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center gap-5 pb-10 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white text-2xl shadow-lg">
                ॐ
              </span>
              <span className="text-2xl font-extrabold text-white">
                Sanatani <span className="text-orange-500">Bandhan</span>
              </span>
            </div>
            <p className="text-sm tracking-[0.2em] uppercase text-stone-500 font-bold">
              "Dharmo Rakshati Rakshitah"
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-bold tracking-widest uppercase">
              <button type="button" onClick={() => setPrivacyOpen(true)} className="hover:text-orange-400 transition-colors cursor-pointer">
                Privacy Policy
              </button>
              <button type="button" onClick={() => setTosOpen(true)} className="hover:text-orange-400 transition-colors cursor-pointer">
                Terms of Service
              </button>
              <button type="button" onClick={() => setSecurityOpen(true)} className="hover:text-orange-400 transition-colors cursor-pointer">
                Security
              </button>
              <button type="button" onClick={handleGoToLogin} className="hover:text-orange-400 transition-colors cursor-pointer">
                Contact Support
              </button>
            </div>
          </div>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <span>© {new Date().getFullYear()} Sanatani Bandhan. Built with devotion for Sanatana Dharma.</span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-stone-800 font-bold tracking-widest uppercase text-[10px]">
              <Landmark className="w-3.5 h-3.5 text-orange-500" />
              Empowering the global Sanatani family
            </span>
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
