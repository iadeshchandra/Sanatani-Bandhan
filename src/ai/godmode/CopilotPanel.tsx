/**
 * ai/godmode/CopilotPanel.tsx — GodMode Copilot chat panel.
 * =====================================================================
 * "🪔 Ask your copilot" — a floating button + side drawer inside GodMode.
 *
 * SAFETY: the copilot advises; the human decides. Recommendation buttons
 * navigate to the existing admin tabs (Moderation, Verification) where
 * the REAL actions live — this panel performs zero consequential
 * actions itself. Acting on a recommendation logs to audit_logs with
 * the 'copilot' marker (via logCopilotAction, called by the tab that
 * performs the action — see ModerationTab integration notes).
 *
 * RBAC: renders only when role === 'owner'. The ask() pipeline's
 * canOffer() gate is the second layer; canUseCopilot() in the
 * executors is the third.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  X, Send, Sparkles, Loader2, ShieldAlert, TrendingUp, Bell, PenLine, Sun,
  Coins, History, Calculator, Compass, BookOpen,
} from 'lucide-react';
import { ask } from '../assistant';
import type { AnswerSource, AssistantCtx, VerificationMeta } from '../types';
import { formatSourcesFooter } from './accuracy';
import { logCopilotAction } from './copilotTasks';
import { briefSummaryLines } from './ownerBrief';
import { marketingSummaryLines } from './marketingBrief';
import { writeTermsDraft, type TermsDraft } from './termsDraftHandoff';

interface Props {
  uid: string;
  lang: string;
  /** Navigate the GodMode console to a tab (e.g. 'moderation'). */
  onNavigateToTab?: (tabId: string) => void;
  /** Close handler from the host. */
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'copilot';
  text: string;
  createdAt: number;
  /** Structured moderation items (from admin_moderation_help). */
  moderationItems?: ModerationItem[];
  /** Structured terms-change proposal (from admin_draft_change, QUEUED #32). */
  proposal?: TermsDraft & { field: string } | null;
  /** QUEUED #36 — answer provenance (which reads produced the figures). */
  sources?: AnswerSource[];
  /** QUEUED #36 — self-verification outcome for this answer. */
  verification?: VerificationMeta;
}

interface ModerationItem {
  id: string;
  preview: string;
  authorName: string;
  reportCount: number;
  reasons: string[];
  recommendation: string;
  reasoning: string;
  actionLabel: string;
}

const QUICK_ACTIONS = [
  { id: 'briefing', label: 'Morning briefing', icon: Sun, query: 'What needs my attention?' },
  { id: 'moderation', label: 'Flagged posts', icon: ShieldAlert, query: 'Review flagged posts' },
  { id: 'stats', label: "This week's numbers", icon: TrendingUp, query: "How many bookings this week?" },
  { id: 'anomaly', label: 'Anything unusual?', icon: Bell, query: 'Anything unusual?' },
  // QUEUED #32 — terms, history, simulation, counsel.
  { id: 'terms', label: '💰 Terms today', icon: Coins, query: 'What are our terms?' },
  { id: 'history', label: '🕰 What changed?', icon: History, query: 'What changed?' },
  { id: 'simulate', label: '🧮 Simulate a change', icon: Calculator, query: 'Simulate a change' },
  { id: 'advise', label: '🧭 Advise me', icon: Compass, query: 'Advise me' },
  // QUEUED #37 — marketing counsel: funnel facts, festival beats, plays.
  { id: 'growth', label: '📈 Growth plan', icon: TrendingUp, query: 'Give me a growth plan' },
];

let msgSeq = 0;
const nextId = () => `copilot_${Date.now()}_${msgSeq++}`;

export const CopilotPanel: React.FC<Props> = ({ uid, lang, onNavigateToTab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const ctx: AssistantCtx = useMemo(
    () => ({ uid, lang, role: 'owner' as const }),
    [uid, lang]
  );

  const scrollDown = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || sending) return;
    setSending(true);
    const userMsg: ChatMessage = { id: nextId(), role: 'user', text: q, createdAt: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    scrollDown();
    try {
      const res = await ask(q, ctx);
      const copilotMsg: ChatMessage = {
        id: nextId(),
        role: 'copilot',
        text: res.text,
        createdAt: Date.now(),
        moderationItems: extractModerationItems(res.data),
        proposal: extractProposal(res.data),
        sources: res.sources,
        verification: res.verification,
      };
      setMessages((m) => [...m, copilotMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: 'copilot',
          text: '🪔 Forgive me — something went wrong on my side. Please try again. 🌼',
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
      scrollDown();
    }
  };

  /**
   * QUEUED #32: hand a drafted change to the Plans & Terms editor.
   * The Copilot NEVER writes config — the draft travels via
   * sessionStorage, the editor prefills, and the owner's save there
   * (diff-confirm + audit) is the only write. This tap is audit-marked
   * as copilot-assisted, like every other copilot handoff.
   */
  const reviewDraft = (proposal: TermsDraft & { field: string }) => {
    writeTermsDraft(proposal);
    void logCopilotAction(
      uid,
      'copilot.terms_draft',
      proposal.planId || proposal.kind,
      `${proposal.fieldLabel}: ${proposal.oldValue} → ${proposal.newValue}`
    );
    onNavigateToTab?.('settings');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800">
        <div className="w-10 h-10 rounded-full bg-saffron-500/15 border border-saffron-500/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-saffron-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">🪔 Your Copilot</div>
          <div className="text-xs text-slate-500">I advise — you decide. I never act alone.</div>
        </div>
        <button
          type="button"
          onClick={() => setShowBrief((b) => !b)}
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 shrink-0"
          aria-expanded={showBrief}
        >
          <BookOpen className="w-4 h-4 text-saffron-300" />
          My brief
        </button>
      </div>

      {/* My brief — the owner's goals/laws/heuristics, read-only. */}
      {showBrief && (
        <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/60 max-h-64 overflow-y-auto">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
            The brief I think with — yours, always
          </div>
          <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
            {[...briefSummaryLines(), ...marketingSummaryLines()].map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500 italic">
            Standing laws and pricing baseline live in my Owner Brief — I cite them when I advise, and I flag it when an ask conflicts with them.
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-slate-800/60">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => send(a.query)}
            disabled={sending}
            className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <a.icon className="w-4 h-4 text-saffron-300" />
            {a.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => send('Write an announcement about the coming festival')}
          disabled={sending}
          className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 whitespace-nowrap shrink-0 disabled:opacity-50"
        >
          <PenLine className="w-4 h-4 text-saffron-300" />
          Draft announcement
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            <div className="text-3xl mb-2">🪔</div>
            <p>Ask me anything about your platform.</p>
            <p className="mt-1 text-xs">Briefings, numbers, flagged posts, anomalies — and now your terms, their history, change simulations and counsel.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-saffron-500/20 border border-saffron-500/30 text-saffron-100 rounded-br-md'
                  : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-bl-md'
              }`}
            >
              {m.text}
              {m.role === 'copilot' && m.sources && m.sources.length > 0 && (
                <div className="mt-2 text-[11px] text-slate-500">
                  {formatSourcesFooter(m.sources, Date.now())}
                  {m.verification?.status === 'verified' && (
                    <span className="text-emerald-500/80"> · figures verified ✓</span>
                  )}
                  {m.verification?.status === 'auto-corrected' && (
                    <span className="text-amber-500/90"> · figures auto-corrected ✓</span>
                  )}
                </div>
              )}
              {m.moderationItems && m.moderationItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  {m.moderationItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-slate-900/80 border border-slate-700 p-3"
                    >
                      <div className="text-xs text-slate-400 mb-1">
                        {item.authorName} · {item.reportCount} report{item.reportCount === 1 ? '' : 's'}
                      </div>
                      <div className="text-xs text-slate-300 italic mb-2 line-clamp-2">
                        “{item.preview || '(no preview)'}”
                      </div>
                      <div className="text-xs mb-2">
                        <span
                          className={`font-bold ${
                            item.recommendation === 'remove'
                              ? 'text-red-400'
                              : item.recommendation === 'escalate'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }`}
                        >
                          → {item.recommendation.toUpperCase()}
                        </span>
                        <span className="text-slate-400"> — {item.reasoning}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateToTab?.('moderation')}
                        className="w-full min-h-[44px] rounded-lg bg-saffron-500/15 hover:bg-saffron-500/25 border border-saffron-500/30 text-saffron-200 text-xs font-bold"
                      >
                        {item.actionLabel} — in Moderation tab
                      </button>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-500 italic">
                    I recommend — you decide. Actions happen in the Moderation tab, never here.
                  </p>
                </div>
              )}
              {m.proposal && (
                <div className="mt-3 rounded-xl bg-slate-900/80 border border-saffron-500/30 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    📝 Drafted change — not saved
                  </div>
                  <div className="text-sm text-slate-200 font-semibold">{m.proposal.fieldLabel}</div>
                  <div className="text-sm text-slate-300 mb-3">
                    {m.proposal.oldValue} <span className="text-saffron-300">→</span> {m.proposal.newValue}
                  </div>
                  <button
                    type="button"
                    onClick={() => m.proposal && reviewDraft(m.proposal)}
                    className="w-full min-h-[44px] rounded-lg bg-saffron-500/15 hover:bg-saffron-500/25 border border-saffron-500/30 text-saffron-200 text-xs font-bold"
                  >
                    Review in Plans &amp; Terms →
                  </button>
                  <p className="mt-2 text-[11px] text-slate-500 italic">
                    The editor opens prefilled — check the diff and the warnings, then save there. Nothing changes until your tap.
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-slate-800/80 border border-slate-700/60 px-4 py-3">
              <Loader2 className="w-4 h-4 text-saffron-300 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 px-4 py-3 border-t border-slate-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your platform…"
          className="flex-1 min-h-[44px] rounded-xl bg-slate-800/80 border border-slate-700 px-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-saffron-500/50"
          aria-label="Ask your copilot"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-saffron-500 hover:bg-saffron-400 text-slate-950 flex items-center justify-center disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

/**
 * Read a structured terms-change proposal from the executor's data
 * payload (admin_draft_change). Returns null when absent or malformed —
 * the message text always carries the summary either way.
 */
function extractProposal(
  data: Record<string, unknown> | undefined
): (TermsDraft & { field: string }) | null {
  if (!data) return null;
  const raw = data['proposal'] as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') return null;
  if (raw['kind'] !== 'plan' && raw['kind'] !== 'commission') return null;
  if (typeof raw['fieldLabel'] !== 'string' || typeof raw['patch'] !== 'object' || !raw['patch']) return null;
  return {
    kind: raw['kind'] as 'plan' | 'commission',
    planId: typeof raw['planId'] === 'string' ? (raw['planId'] as string) : undefined,
    field: String(raw['field'] || ''),
    fieldLabel: String(raw['fieldLabel']),
    oldValue: typeof raw['oldValue'] === 'number' ? (raw['oldValue'] as number) : 0,
    newValue: typeof raw['newValue'] === 'number' ? (raw['newValue'] as number) : 0,
    patch: raw['patch'] as Record<string, number>,
    limitsPatch:
      raw['limitsPatch'] && typeof raw['limitsPatch'] === 'object'
        ? (raw['limitsPatch'] as Record<string, number>)
        : undefined,
  };
}

/**
 * Read structured moderation items from the executor's data payload.
 * Returns null when absent — the text always carries the recommendations.
 */
function extractModerationItems(data: Record<string, unknown> | undefined): ModerationItem[] | null {
  if (!data || !Array.isArray(data['items'])) return null;
  const raw = data['items'] as Array<Record<string, unknown>>;
  const items: ModerationItem[] = raw
    .filter((r) => r && typeof r['id'] === 'string')
    .map((r) => ({
      id: String(r['id']),
      preview: String(r['preview'] || ''),
      authorName: String(r['authorName'] || 'Unknown'),
      reportCount: typeof r['reportCount'] === 'number' ? (r['reportCount'] as number) : 0,
      reasons: Array.isArray(r['reasons']) ? (r['reasons'] as string[]) : [],
      recommendation: String(r['recommendation'] || 'review'),
      reasoning: String(r['reasoning'] || ''),
      actionLabel: String(r['actionLabel'] || 'Review'),
    }));
  return items.length ? items : null;
}

/** Floating launcher — mount inside GodModeConsole2's console body. */
export const CopilotLauncher: React.FC<{
  uid: string;
  lang: string;
  onNavigateToTab?: (tabId: string) => void;
}> = ({ uid, lang, onNavigateToTab }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 md:bottom-6 right-4 z-[9990] flex items-center gap-2 pl-4 pr-5 py-3 min-h-[52px] rounded-full bg-saffron-500 hover:bg-saffron-400 text-slate-950 font-bold text-sm shadow-2xl shadow-saffron-500/30"
        aria-label={open ? 'Close copilot' : 'Ask your copilot'}
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        {open ? 'Close' : '🪔 Ask Copilot'}
      </button>
      {open && (
        <div className="fixed inset-y-0 right-0 z-[9989] w-full sm:w-[420px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
          <CopilotPanel uid={uid} lang={lang} onNavigateToTab={onNavigateToTab} />
        </div>
      )}
    </>
  );
};
