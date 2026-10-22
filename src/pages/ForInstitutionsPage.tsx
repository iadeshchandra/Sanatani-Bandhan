import React, { useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Clock,
  GraduationCap,
  Languages,
  Landmark,
  Receipt,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { captureOppref, initOpenAiAds, trackOpenAiEvent } from '../lib/openaiAds';

/**
 * ForInstitutionsPage — the public landing page for ChatGPT Ads
 * traffic (/for-institutions).
 *
 * This page exists for one conversation: a trustee, secretary or
 * school administrator who just asked an AI how to run their
 * institution's donations, accounts and members without paper
 * registers — and clicked the sponsored card. So it answers, above
 * the fold and in plain language: what this is (institution
 * management software), who it is for (trusts, schools, charities
 * and non-profits of every kind — never one institution type only),
 * what it costs, and the single next step.
 *
 * There is exactly ONE call to action on this page: the institution
 * inquiry at /contact. No demo, no marketplace, no second funnel —
 * ad traffic converts or it leaves, and measurement (src/lib/
 * openaiAds.ts) counts the inquiry as `lead_created` on /contact.
 *
 * On mount the page captures the OpenAI click reference (`oppref`)
 * and fires the standard `page_viewed` event. Both are no-ops until
 * a real Pixel ID is configured (see openaiAds.ts) — nothing here
 * fakes a signal.
 */

const CAPABILITIES: Array<{
  icon: React.ReactNode;
  title: string;
  body: string;
}> = [
  {
    icon: <Receipt className="w-6 h-6" />,
    title: 'Donations & receipts',
    body: 'Every donation recorded once, with a proper receipt — numbered, traceable, and ready to show any donor who asks.',
  },
  {
    icon: <Wallet className="w-6 h-6" />,
    title: 'Accounts with an audit trail',
    body: 'Income, expenses and bank deposits in one ledger. Cash collections reconcile against what actually reached the bank.',
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'Tamper-evident records',
    body: 'Audit entries are hash-chained: change one old record and the chain breaks visibly. Quiet edits are not possible.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Members & families',
    body: 'Member records, households and registrations in one register your whole committee can read — not one person\u2019s notebook.',
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: 'Fees for schools',
    body: 'For schools and educational institutions: student fees, attendance and accounts together, instead of three separate books.',
  },
  {
    icon: <WifiOff className="w-6 h-6" />,
    title: 'Offline-first',
    body: 'Built for courtyards with no signal. Work is saved on the device and syncs when a connection returns — nothing is lost.',
  },
  {
    icon: <Languages className="w-6 h-6" />,
    title: '10 languages',
    body: 'English, Hindi, Bangla, Sanskrit, Tamil, Telugu, Marathi, Gujarati, Kannada and Malayalam — your team works in its own language.',
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: 'Runs on the phones you have',
    body: 'Fully functional on 2GB RAM, Android 8+ and a 360px screen — and beautiful on a flagship. One system, every device.',
  },
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What does it cost?',
    a: 'The Seva plan is free (₹0). Standard is ₹499 / ৳700 / $6 per month, or ₹4,999 / ৳7,000 / $60 per year. Premium is ₹1,999 / ৳2,800 / $24 per month, or ₹19,999 / ৳28,000 / $240 per year. Annual plans include two months free. No per-donation commission on your own institution\u2019s accounts.',
  },
  {
    q: 'We have almost no internet. Will it still work?',
    a: 'Yes. Sanatani Bandhan is offline-first: donations, receipts and registers are recorded on the device and sync automatically when a connection is available. A courtyard with no signal is the normal case we designed for, not an exception.',
  },
  {
    q: 'Our records are in paper registers and spreadsheets. How do we move?',
    a: 'You do not have to move everything at once. Most institutions start with new donations and the current month\u2019s accounts, then bring member records over gradually. Tell us what you currently keep on paper in the inquiry form and we will suggest a starting point that fits your team.',
  },
  {
    q: 'How do donors and auditors trust the numbers?',
    a: 'Every financial entry joins a hash-chained audit trail, so a past record cannot be edited silently. Institutions can publish their accounts on a transparency board, and every donation carries a receipt a donor can verify. Trustees see who recorded what, and when.',
  },
  {
    q: 'Our staff are volunteers, not computer experts. Is it too much for us?',
    a: 'The system is role-based: a trustee, an accountant and a volunteer each see only their own work, in their own language, on their own phone. If your team can use a messaging app, they can use this — and onboarding help is part of the conversation when you write to us.',
  },
  {
    q: 'How do we start?',
    a: 'Send the inquiry on our contact page and tell us about your institution — its type, its size, and what you still keep on paper. We reply within one working day, usually much sooner, with an honest recommendation. There is no obligation and no sales pressure.',
  },
];

const ContactCta: React.FC<{ label?: string; dark?: boolean }> = ({
  label = 'Talk to us about your institution',
  dark = false,
}) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/contact')}
      className={`inline-flex items-center justify-center gap-2 min-h-[56px] px-8 rounded-2xl font-black text-sm sm:text-base tracking-wide transition-all cursor-pointer ${
        dark
          ? 'bg-white text-stone-900 hover:bg-orange-50'
          : 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-xl shadow-orange-500/30 hover:from-orange-500 hover:to-amber-400 active:scale-[0.98]'
      }`}
    >
      {label}
      <ArrowRight className="w-4 h-4" />
    </button>
  );
};

export const ForInstitutionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    document.title = 'For Institutions · Sanatani Bandhan';
    // ChatGPT Ads measurement: capture the click reference first so
    // the later /contact inquiry can be attributed, then count the view.
    captureOppref();
    initOpenAiAds();
    trackOpenAiEvent('page_viewed', { type: 'page', plan_id: 'for-institutions' });
    return () => {
      document.title = 'Sanatani Bandhan | Dharmic Institution Management Platform';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8F0] text-stone-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* HEADER — mirrors ContactPage chrome */}
      <header className="sticky top-0 z-40 bg-[#FFF8F0]/95 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer"
            aria-label="Sanatani Bandhan home"
          >
            <img
              src="/icon-96x96.png"
              alt="Sanatani Bandhan"
              className="w-10 h-10 rounded-2xl shadow-md shadow-orange-500/25"
              width={40}
              height={40}
            />
            <span className="text-lg sm:text-xl font-extrabold tracking-tight">
              Sanatani <span className="text-orange-600">Bandhan</span>
            </span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-xl px-2.5 py-1.5 text-xs">
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
              onClick={() => navigate('/login')}
              className="min-h-[44px] px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-extrabold tracking-wide transition-all cursor-pointer"
            >
              LOGIN
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO — what it is, who for, price, the one CTA. Above the fold. */}
        <section className="px-4 sm:px-6 pt-12 sm:pt-16 pb-12 text-center">
          <div className="max-w-3xl mx-auto">
            <p className="mb-6">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-stone-400 hover:text-orange-600 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </button>
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-orange-200 bg-orange-50 text-orange-700 text-[11px] sm:text-xs font-extrabold tracking-[0.18em] uppercase mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              सेवा · पारदर्शिता · विश्वास — Service, transparency, trust
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              Institution management software for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">
                trusts, schools, charities &amp; non-profits
              </span>
            </h1>
            <p className="mt-5 text-stone-500 leading-relaxed max-w-2xl mx-auto">
              Donations and receipts, accounts with a tamper-evident audit trail, members,
              fees and reports — one calm system for the whole institution, replacing the
              paper registers and spreadsheets your month-end depends on. Works offline,
              in 10 languages, on the phones your team already has.
            </p>
            <p className="mt-5 text-base sm:text-lg font-extrabold text-stone-800">
              Free plan available · Standard from ₹499 / ৳700 / $6 per month
            </p>
            <div className="mt-7">
              <ContactCta />
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-400">
              <Clock className="w-4 h-4 text-orange-500" />
              We reply within one working day — usually much sooner.
            </p>
          </div>
        </section>

        {/* THE MONTH-END PAIN */}
        <section className="px-4 sm:px-6 pb-14">
          <div className="max-w-4xl mx-auto bg-white rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-100/50 p-6 sm:p-10 text-left">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black leading-snug">The month-end problem every institution knows</h2>
                <p className="text-sm text-stone-500 mt-1">If this sounds familiar, this page was written for you.</p>
              </div>
            </div>
            <ul className="space-y-3.5 text-stone-600 leading-relaxed">
              <li className="flex gap-3">
                <span className="mt-1 w-5 h-5 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">!</span>
                Receipts issued at the desk, cash counted in a room, and deposits at the bank — three numbers that never quite match, and a whole evening spent finding out why.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 w-5 h-5 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">!</span>
                Member lists in one register, fees in a second book, accounts in a spreadsheet on one person&apos;s laptop — when that person travels, the institution waits.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 w-5 h-5 shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">!</span>
                A donor asks, with love, how their contribution was used — and the honest answer takes a week of searching through paper to give.
              </li>
            </ul>
            <p className="mt-6 text-stone-700 leading-relaxed">
              Sanatani Bandhan records each of these once, in one place, at the moment it
              happens — so month-end becomes a report you print, not a mystery you solve.
            </p>
          </div>
        </section>

        {/* WHAT IT REPLACES */}
        <section className="px-4 sm:px-6 pb-14 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-black tracking-tight">What it replaces</h2>
            <p className="mt-3 text-stone-500 leading-relaxed max-w-2xl mx-auto">
              Not your people, and never your traditions — just the fragile tools between them.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              {[
                { from: 'Paper registers', to: 'One register for donations, members, fees and accounts — readable by the whole committee, backed up, and impossible to lose in a flood or a cupboard clear-out.' },
                { from: 'Spreadsheets', to: 'Accounts that reconcile themselves: every receipt and expense joins the ledger and the audit trail as it is recorded, not when someone finds an evening to type it up.' },
                { from: 'Chat groups & memory', to: 'Decisions, duties and records live in the institution\u2019s own system with roles and history — not in one volunteer\u2019s phone, gone when they change their number.' },
              ].map((row) => (
                <div key={row.from} className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-stone-400 line-through decoration-orange-300 decoration-2">{row.from}</p>
                  <p className="mt-3 text-sm text-stone-600 leading-relaxed">{row.to}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section className="px-4 sm:px-6 pb-14">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-black tracking-tight text-center">What your institution gets</h2>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CAPABILITIES.map((cap) => (
                <div key={cap.title} className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm text-left">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                    {cap.icon}
                  </div>
                  <h3 className="font-black">{cap.title}</h3>
                  <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">{cap.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="px-4 sm:px-6 pb-14">
          <div className="max-w-4xl mx-auto rounded-[2rem] p-6 sm:p-10 shadow-xl bg-gradient-to-br from-stone-900 to-stone-800 text-white text-left">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black leading-snug">Built so trust does not depend on memory</h2>
                <p className="text-sm text-stone-300 mt-1">An institution runs on the trust of the people who give to it.</p>
              </div>
            </div>
            <ul className="space-y-3 text-stone-200 leading-relaxed">
              {[
                'Hash-chained audit trail: every financial entry is linked to the one before it, so editing history breaks the chain where everyone can see.',
                'Published accounts: choose to place your accounts on a public transparency board, and let your accounts answer donor questions for you.',
                'Roles, not shared passwords: trustees, accountants and volunteers each see and sign only their own work.',
                'Your data stays yours: records belong to your institution, exportable, never sold and never used for advertising.',
              ].map((line) => (
                <li key={line.slice(0, 24)} className="flex gap-3">
                  <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                  <span className="text-sm sm:text-base">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* PRICING STRIP */}
        <section className="px-4 sm:px-6 pb-14">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-black tracking-tight text-center">Honest pricing, in your currency</h2>
            <p className="mt-3 text-stone-500 text-center">Annual plans include two months free. Prices are the same ones published across our site.</p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-widest text-stone-400">Seva — Free</p>
                <p className="mt-2 text-3xl font-black">₹0 <span className="text-base font-bold text-stone-400">/ forever</span></p>
                <p className="mt-3 text-sm text-stone-500 leading-relaxed">Start free: donations, receipts and member records for a small institution, on up to 2 staff seats.</p>
              </div>
              <div className="bg-white rounded-3xl border-2 border-orange-400 p-6 shadow-xl shadow-orange-100/60 relative">
                <p className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Standard — for most institutions</p>
                <p className="mt-2 text-3xl font-black">₹499 <span className="text-base font-bold text-stone-400">/ month</span></p>
                <p className="mt-2 text-sm font-bold text-stone-600">৳700 / $6 per month · ₹4,999 / ৳7,000 / $60 per year</p>
                <p className="mt-3 text-sm text-stone-500 leading-relaxed">Full accounts and audit trail, fees, events and reports — for institutions that have outgrown paper.</p>
              </div>
              <div className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-widest text-stone-400">Premium — multi-branch</p>
                <p className="mt-2 text-3xl font-black">₹1,999 <span className="text-base font-bold text-stone-400">/ month</span></p>
                <p className="mt-2 text-sm font-bold text-stone-600">৳2,800 / $24 per month · ₹19,999 / ৳28,000 / $240 per year</p>
                <p className="mt-3 text-sm text-stone-500 leading-relaxed">Unlimited scale across branches, with the complete suite set and priority support.</p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <ContactCta label="Ask which plan fits your institution" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 sm:px-6 pb-14">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-black tracking-tight text-center">Questions institutions ask us</h2>
            <div className="mt-8 space-y-4">
              {FAQS.map((faq) => (
                <div key={faq.q} className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm text-left">
                  <h3 className="font-black">{faq.q}</h3>
                  <p className="text-sm text-stone-500 mt-2 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-4xl mx-auto rounded-[2rem] p-8 sm:p-12 shadow-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-white/15 text-white flex items-center justify-center mb-5">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">Tell us about your institution</h2>
            <p className="mt-3 text-orange-50 leading-relaxed max-w-xl mx-auto">
              Its type, its size, and what you still keep on paper. We will reply within one
              working day with an honest recommendation — including if paper is still right for you.
            </p>
            <div className="mt-7">
              <ContactCta label="Send an institution inquiry" dark />
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER — mirrors ContactPage chrome */}
      <footer className="bg-stone-950 text-stone-400 pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <img
                src="/icon-96x96.png"
                alt="Sanatani Bandhan"
                className="w-10 h-10 rounded-2xl"
                width={40}
                height={40}
              />
              <span className="text-xl font-extrabold text-white">
                Sanatani <span className="text-orange-500">Bandhan</span>
              </span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium" aria-label="Footer">
              <button type="button" onClick={() => navigate('/')} className="hover:text-orange-400 transition-colors cursor-pointer">Home</button>
              <button type="button" onClick={() => navigate('/contact')} className="hover:text-orange-400 transition-colors cursor-pointer">Contact</button>
              <button type="button" onClick={() => navigate('/login')} className="hover:text-orange-400 transition-colors cursor-pointer">Login</button>
              <button type="button" onClick={() => navigate('/signup')} className="hover:text-orange-400 transition-colors cursor-pointer">Create free account</button>
            </nav>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <span>© {new Date().getFullYear()} Sanatani Bandhan. Built with devotion for Sanatana Dharma.</span>
            <span className="font-bold tracking-widest uppercase text-[10px]">धर्मो रक्षति रक्षितः</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
