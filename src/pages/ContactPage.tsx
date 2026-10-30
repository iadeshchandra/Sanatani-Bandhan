import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  MessageCircle,
  Play,
  CheckCircle2,
  Send,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseClient';
import { useDemoStarter } from '../hooks/useDemoStarter';
import { DemoSelectionModal } from '../components/public/DemoSelectionModal';
import { PublicLanguageButton } from '../components/public/PublicLanguageButton';
import { PrivacyPolicy } from '../components/public/PrivacyPolicy';
import { TermsOfService } from '../components/public/TermsOfService';
import { WorkspaceType } from '../types';
import { WHATSAPP_URL, SUPPORT_EMAIL } from '../config/contact';
import { trackOpenAiEvent } from '../lib/openaiAds';
import { useLanguage } from '../context/LanguageContext';

// SUPPORT_EMAIL is still the placeholder inbox — the owner has not provided
// the real one yet. WhatsApp is live (owner-provided +8801608533529).

const ORG_OPTIONS: WorkspaceType[] = ['Mandir', 'Goshala', 'Ashram', 'Gurukul', 'Sangha'];

type SubmitState = 'idle' | 'sending' | 'sent' | 'failed';

export const ContactPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const startDemo = useDemoStarter();

  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [tosOpen, setTosOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [orgType, setOrgType] = useState<WorkspaceType>('Mandir');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  // Honeypot — bots fill it, humans never see it.
  const [company, setCompany] = useState('');

  useEffect(() => {
    document.title = 'Contact · Sanatani Bandhan';
    return () => {
      document.title = 'Sanatani Bandhan | Dharmic Institution Management Platform';
    };
  }, []);

  const isValid =
    name.trim().length >= 2 &&
    institution.trim().length >= 2 &&
    /.+@.+\..+/.test(email.trim()) &&
    message.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitState === 'sending') return;
    if (company) {
      // Honeypot tripped — pretend success, store nothing.
      setSubmitState('sent');
      return;
    }
    setSubmitState('sending');
    setError('');
    try {
      const leadRef = await addDoc(collection(db, 'platform_leads'), {
        name: name.trim(),
        institution: institution.trim(),
        orgType,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        message: message.trim(),
        source: 'contact-page',
        status: 'new',
        createdAt: serverTimestamp(),
      });
      // ChatGPT Ads measurement: count the inquiry as the standard
      // lead_created event, keyed by the Firestore document id so a
      // later server-side Conversions API copy of this same lead can
      // deduplicate against it (same Pixel ID + event name + event_id).
      // No-op when no OpenAI Ads Pixel ID is configured.
      trackOpenAiEvent('lead_created', { type: 'lead' }, leadRef.id);
      setSubmitState('sent');
    } catch (err) {
      console.error('Contact form failed:', err);
      setSubmitState('failed');
      setError(
        'We could not reach our servers just now. Please email us directly — we reply within one working day.'
      );
    }
  };

  const inputCls =
    'w-full min-h-[52px] px-4 rounded-2xl bg-white border-2 border-orange-100 focus:border-orange-400 focus:outline-none text-sm font-medium text-stone-900 placeholder-stone-400 transition-colors';
  const labelCls = 'block text-xs font-extrabold uppercase tracking-widest text-stone-500 mb-2';

  return (
    <div className="min-h-screen bg-[#FFF8F0] text-stone-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* HEADER */}
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
            {/* WORLD-READY (Axis B): canonical 10-language switcher — the
                old <select> offered only 4 languages, was hidden on
                phones and stood ~28px tall (below the 44px floor). */}
            <PublicLanguageButton />
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
        {/* HERO */}
        <section className="px-4 sm:px-6 pt-12 sm:pt-16 pb-10 text-center">
          <div className="max-w-2xl mx-auto">
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
              ॥ संवादः सेतुः ॥ · Conversation is the bridge
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              Talk to <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">us.</span>
            </h1>
            <p className="mt-4 text-stone-500 leading-relaxed">
              Questions about the platform, onboarding help, or a partnership —
              write to us and we reply within one working day.
            </p>
          </div>
        </section>

        <section className="px-4 sm:px-6 pb-16 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* FORM CARD */}
            <div className="lg:col-span-3 bg-white rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-100/50 p-6 sm:p-10">
              {submitState === 'sent' ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-black">Dhanyavaad, {name.split(' ')[0] || 'friend'}!</h2>
                  <p className="mt-3 text-stone-500 leading-relaxed max-w-md mx-auto">
                    Your message is with our seva team. We will reach out within
                    one working day — usually much sooner.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="mt-8 inline-flex items-center gap-2 min-h-[52px] px-8 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black text-sm tracking-wide shadow-lg shadow-orange-500/30 cursor-pointer"
                  >
                    Back to home
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <h2 className="text-2xl font-black mb-1">{t('surfaces.contact.sendAMessage')}</h2>
                  <p className="text-sm text-stone-500 mb-8">
                    Tell us about your institution and what you need.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="cp-name" className={labelCls}>{t('surfaces.contact.yourName')}</label>
                      <input
                        id="cp-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('surfaces.contact.eGRameshSharma')}
                        className={inputCls}
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label htmlFor="cp-institution" className={labelCls}>{t('surfaces.contact.institutionName')}</label>
                      <input
                        id="cp-institution"
                        type="text"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder={t('surfaces.contact.eGKashiVishwanathTrust')}
                        className={inputCls}
                        autoComplete="organization"
                      />
                    </div>
                    <div>
                      <label htmlFor="cp-orgtype" className={labelCls}>{t('surfaces.contact.institutionType')}</label>
                      <select
                        id="cp-orgtype"
                        value={orgType}
                        onChange={(e) => setOrgType(e.target.value as WorkspaceType)}
                        className={`${inputCls} cursor-pointer`}
                      >
                        {ORG_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="cp-phone" className={labelCls}>Phone <span className="normal-case font-medium text-stone-400">(optional)</span></label>
                      <input
                        id="cp-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 …"
                        className={inputCls}
                        autoComplete="tel"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="cp-email" className={labelCls}>{t('surfaces.contact.email')}</label>
                      <input
                        id="cp-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@yourinstitution.org"
                        className={inputCls}
                        autoComplete="email"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="cp-message" className={labelCls}>{t('surfaces.contact.message')}</label>
                      <textarea
                        id="cp-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('surfaces.contact.howCanWeHelpOnboardingMigration')}
                        rows={5}
                        className={`${inputCls} py-4 resize-y min-h-[120px]`}
                      />
                    </div>
                    {/* Honeypot */}
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="hidden"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                    />
                  </div>

                  {submitState === 'failed' && (
                    <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
                      <X className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        {error}{' '}
                        <a
                          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Enquiry from ' + institution)}`}
                          className="font-extrabold underline"
                        >
                          Email us directly
                        </a>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isValid || submitState === 'sending'}
                    className={`mt-7 w-full min-h-[56px] rounded-2xl font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 transition-all ${
                      isValid && submitState !== 'sending'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-xl shadow-orange-500/30 hover:from-orange-500 hover:to-amber-400 active:scale-[0.98] cursor-pointer'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    {submitState === 'sending' ? (
                      <>
                        <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        SEND MESSAGE
                      </>
                    )}
                  </button>
                  <p className="mt-4 text-xs text-stone-400 text-center">
                    We never share your details. Read our{' '}
                    <button type="button" onClick={() => setPrivacyOpen(true)} className="underline font-bold cursor-pointer">
                      Privacy Policy
                    </button>
                    .
                  </p>
                </form>
              )}
            </div>

            {/* INFO CARDS */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg">{t('surfaces.contact.emailUs')}</h3>
                <p className="text-sm text-stone-500 mt-1 mb-3">
                  For anything — support, onboarding, press.
                </p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-sm font-extrabold text-orange-700 underline break-all"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>

              <div className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg">{t('surfaces.contact.whatsappChannel')}</h3>
                <p className="text-sm text-stone-500 mt-1 mb-3">
                  Festival alerts & platform updates, straight to your phone.
                </p>
                {/* G-D4 (World-Readiness register): the WhatsApp number is
                    configured in the single source of truth
                    (src/config/contact.ts) — the old "support coming soon"
                    fallback branch was unreachable dead copy that could
                    only ever surface stale. Removed; the live door stands
                    unconditionally. */}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold transition-all cursor-pointer"
                >
                  Chat on WhatsApp
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              <div className="rounded-3xl p-6 shadow-xl bg-gradient-to-br from-stone-900 to-stone-800 text-white">
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center mb-4">
                  <Play className="w-6 h-6 fill-amber-400" />
                </div>
                <h3 className="font-black text-lg">{t('surfaces.contact.preferToExploreYourself')}</h3>
                <p className="text-sm text-stone-300 mt-1 mb-4">
                  Launch a live sandbox demo — no signup, sample data included.
                </p>
                <button
                  type="button"
                  onClick={() => setDemoModalOpen(true)}
                  className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-2xl bg-white text-stone-900 text-sm font-extrabold hover:bg-orange-50 transition-all cursor-pointer"
                >
                  Launch live demo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-orange-100 p-6 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg">{t('surfaces.contact.askAnyAiAboutUs')}</h3>
                <p className="text-sm text-stone-500 mt-1 mb-4">
                  ChatGPT, Claude or Gemini — ask them anything about Sanatani Bandhan.
                  We publish our facts openly, with ready-made prompts that point your
                  AI straight at them.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/ask-ai')}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-sm font-extrabold transition-all cursor-pointer"
                >
                  Get the prompts
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-sm text-stone-500 px-1">
                <Clock className="w-5 h-5 text-orange-500 shrink-0" />
                <span>
                  <strong className="text-stone-700">{t('surfaces.contact.responseTime')}</strong> within one
                  working day, usually within hours.
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
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
              <button type="button" onClick={() => navigate('/login')} className="hover:text-orange-400 transition-colors cursor-pointer">Login</button>
              <button type="button" onClick={() => navigate('/signup')} className="hover:text-orange-400 transition-colors cursor-pointer">{t('surfaces.contact.createFreeAccount')}</button>
              <button type="button" onClick={() => setPrivacyOpen(true)} className="hover:text-orange-400 transition-colors cursor-pointer">Privacy</button>
              <button type="button" onClick={() => setTosOpen(true)} className="hover:text-orange-400 transition-colors cursor-pointer">Terms</button>
            </nav>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <span>© {new Date().getFullYear()} Sanatani Bandhan. Built with devotion for Sanatana Dharma.</span>
            <span className="font-bold tracking-widest uppercase text-[10px]">धर्मो रक्षति रक्षितः</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <DemoSelectionModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onSelect={(type, view) => {
          setDemoModalOpen(false);
          startDemo(type, view);
        }}
      />
      {privacyOpen && <PrivacyPolicy onClose={() => setPrivacyOpen(false)} />}
      {tosOpen && <TermsOfService onClose={() => setTosOpen(false)} />}
    </div>
  );
};
