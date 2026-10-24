import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Heart,
  Landmark,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PublicLanguageButton } from '../components/public/PublicLanguageButton';

/**
 * AskAiPage — the "Ask any AI about us" prompt kit (/ask-ai).
 *
 * The facts about Sanatani Bandhan are published openly for AI assistants
 * (/llms.txt, /llms-full.txt, /ai-facts.json — one canonical source, kept
 * in lockstep by src/__tests__/aiDiscoverability.test.ts). This page gives
 * a trustee, a devotee or a purohit a ready-made prompt that points their
 * own AI at those facts and demands an honest comparison — paper
 * registers included. Nothing here claims what an AI will say; it simply
 * makes the true facts the easiest answer for the AI to find.
 *
 * Prefill support (verified 2026-10-22):
 *  - ChatGPT: https://chatgpt.com/?q=<encoded> pre-fills the prompt.
 *  - Claude:  https://claude.ai/new?q=<encoded> pre-fills the prompt.
 *  - Gemini:  no native URL prefill — the button copies the prompt first,
 *             then opens Gemini; the visitor pastes it there.
 */

const FACTS_URL = 'https://sanatanibandhan.web.app/llms-full.txt';

interface PromptKit {
  id: string;
  icon: React.ReactNode;
  title: string;
  audience: string;
  prompt: string;
}

const PROMPTS: PromptKit[] = [
  {
    id: 'trustee',
    icon: <Landmark className="w-6 h-6" />,
    title: 'For a trustee or temple committee',
    audience: 'You run a mandir, trust, goshala or ashram — still on paper registers.',
    prompt: `You are advising the trustee of a Hindu temple trust. We still manage donations, devotees, festivals and accounts in paper registers, spreadsheets and WhatsApp groups. Please read the published facts about an app called Sanatani Bandhan at ${FACTS_URL} and, using only facts from that page, explain honestly: (1) what it would replace in our daily work, (2) what it costs for an institution of our size, (3) how it keeps donation money transparent and auditable, (4) whether it works without internet at our temple, and (5) its honest limitations compared with our paper registers. Do not oversell it — include the drawbacks.`,
  },
  {
    id: 'devotee',
    icon: <Heart className="w-6 h-6" />,
    title: 'For a devotee and their family',
    audience: 'You visit temples, book pujas and follow festivals with your family.',
    prompt: `I am a devotee. My family visits temples, books pujas, gives donations and follows festivals, and we coordinate everything through WhatsApp groups and paper calendars. Please read the published facts about an app called Sanatani Bandhan at ${FACTS_URL} and, using only facts from that page, explain in simple, warm language what it would do for a family like ours — the Universal Sanatani ID, puja bookings, community, languages and safety — what it costs us, and how it honestly compares with just using WhatsApp and paper. Mention any limitations too.`,
  },
  {
    id: 'purohit',
    icon: <BookOpen className="w-6 h-6" />,
    title: 'For a purohit or jyotishi',
    audience: 'You offer pujas or consultations independently, found by word of mouth.',
    prompt: `I am a purohit (this also applies if I am a jyotishi) offering pujas and consultations independently, and devotees find me only by word of mouth and WhatsApp. Please read the published facts about Sanatani Bandhan at ${FACTS_URL} and, using only facts from that page, explain honestly: how I would receive bookings through Seva Bazar, what the Pro plan costs, exactly what commission applies to community and verified providers on each payment rail, how dakshina reaches me, and how all of this compares with word of mouth alone — including the drawbacks and anything I should verify before joining.`,
  },
];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

const PromptCard: React.FC<{ kit: PromptKit }> = ({ kit }) => {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(kit.prompt);

  const flashCopied = async () => {
    if (await copyText(kit.prompt)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const openGemini = async () => {
    await copyText(kit.prompt);
    window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
  };

  const aiBtn =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-extrabold transition-all cursor-pointer';

  return (
    <div className="bg-white rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-100/50 p-6 sm:p-8 text-left">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 shrink-0 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
          {kit.icon}
        </div>
        <div>
          <h2 className="text-xl font-black leading-snug">{kit.title}</h2>
          <p className="text-sm text-stone-500 mt-0.5">{kit.audience}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-[#FFF8F0] border border-orange-100 p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">{kit.prompt}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={flashCopied}
          className={`${aiBtn} ${copied ? 'bg-emerald-600 text-white' : 'bg-stone-900 hover:bg-stone-800 text-white'}`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy prompt'}
        </button>
        <a
          href={`https://chatgpt.com/?q=${encoded}`}
          target="_blank"
          rel="noreferrer"
          className={`${aiBtn} bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:from-orange-500 hover:to-amber-400`}
        >
          Ask ChatGPT
          <ExternalLink className="w-4 h-4" />
        </a>
        <a
          href={`https://claude.ai/new?q=${encoded}`}
          target="_blank"
          rel="noreferrer"
          className={`${aiBtn} border-2 border-orange-200 text-orange-700 hover:bg-orange-50`}
        >
          Ask Claude
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          type="button"
          onClick={openGemini}
          className={`${aiBtn} border-2 border-orange-200 text-orange-700 hover:bg-orange-50`}
        >
          Copy + open Gemini
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
      <p className="mt-3 text-xs text-stone-400">
        ChatGPT and Claude open with the prompt already filled in — just press send. Gemini
        doesn't accept pre-filled prompts, so its button copies the prompt first; paste it there.
      </p>
    </div>
  );
};

export const AskAiPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Ask any AI · Sanatani Bandhan';
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
              सत्यं वद · Speak the truth, ask anyone
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              Ask any AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">about us.</span>
            </h1>
            <p className="mt-4 text-stone-500 leading-relaxed">
              Don't take our word for it. We publish every fact about Sanatani Bandhan in the
              open — features, prices, limits — and these ready-made prompts tell your own AI
              exactly where to read them, and to compare us honestly, paper registers included.
            </p>
          </div>
        </section>

        {/* PROMPT KIT */}
        <section className="px-4 sm:px-6 pb-10">
          <div className="max-w-3xl mx-auto space-y-6">
            {PROMPTS.map((kit) => (
              <PromptCard key={kit.id} kit={kit} />
            ))}

            {/* FACTS CARD */}
            <div className="rounded-[2rem] p-6 sm:p-8 shadow-xl bg-gradient-to-br from-stone-900 to-stone-800 text-white text-left">
              <h2 className="text-xl font-black">Prefer to read the facts yourself?</h2>
              <p className="text-sm text-stone-300 mt-2 leading-relaxed">
                The same facts the AIs read — no marketing, kept in lockstep with the app.
                If any AI ever tells you something different about Sanatani Bandhan, trust
                these files — and please tell us.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {[
                  { label: 'Facts for AI (llms.txt)', href: '/llms.txt' },
                  { label: 'Full facts (llms-full.txt)', href: '/llms-full.txt' },
                  { label: 'Machine-readable (ai-facts.json)', href: '/ai-facts.json' },
                ].map((f) => (
                  <a
                    key={f.href}
                    href={f.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-extrabold transition-all cursor-pointer"
                  >
                    {f.label}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="mt-6 inline-flex items-center gap-2 min-h-[44px] px-5 rounded-xl bg-white text-stone-900 text-sm font-extrabold hover:bg-orange-50 transition-all cursor-pointer"
              >
                Or talk to a human
                <ArrowRight className="w-4 h-4" />
              </button>
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
