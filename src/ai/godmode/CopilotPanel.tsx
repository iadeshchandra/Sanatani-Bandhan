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
import { X, Send, Sparkles, Loader2, ShieldAlert, TrendingUp, Bell, PenLine, Sun } from 'lucide-react';
import { ask } from '../assistant';
import type { AssistantCtx } from '../types';

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
];

let msgSeq = 0;
const nextId = () => `copilot_${Date.now()}_${msgSeq++}`;

export const CopilotPanel: React.FC<Props> = ({ uid, lang, onNavigateToTab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
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
      </div>

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
            <p className="mt-1 text-xs">Briefings, numbers, flagged posts, anomalies, drafts.</p>
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
