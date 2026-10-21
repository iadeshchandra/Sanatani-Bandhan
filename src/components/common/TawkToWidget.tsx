import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, Sparkles, HelpCircle, WifiOff } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { callGeminiDirect } from '../../utils/geminiClient';

export const TawkToWidget: React.FC = () => {
  const { activeWorkspace, sessionKind } = useAuthWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [messages, setMessages] = useState<
    { sender: 'user' | 'bot'; text: string; time: string }[]
  >([
    {
      sender: 'bot',
      text: `Jai Sri Krishna! Welcome to ${activeWorkspace.name} Vedic Helpdesk. How may we assist your Seva or Darshan inquiries today?`,
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  /** Local FAQ fallback — served when the AI helpdesk API is unreachable. */
  const answerOffline = (question: string): string => {
    const q = question.toLowerCase();
    const faqs: { keys: string[]; answer: string }[] = [
      {
        keys: ['login', 'log in', 'sign in', 'password', 'pin', 'qr'],
        answer: 'To log in, use your Email/Password on the portal screen, or ask your temple office to show you a one-time QR pairing code (valid 5 minutes, single use). If you forgot your password, tap "Forgot Password?" on the login form.',
      },
      {
        keys: ['80g', 'receipt', 'tax', 'certificate', 'download'],
        answer: '80G tax receipts are in Treasury → Donation Receipts. Every donation above ₹2,000 auto-generates a receipt you can download or WhatsApp to the donor.',
      },
      {
        keys: ['darshan', 'pass', 'book', 'ticket', 'slot'],
        answer: 'Darshan passes can be booked from the Darshan / Gate desk. You will get a QR gate pass — show it at the turnstile. VIP and senior-citizen slots are marked separately.',
      },
      {
        keys: ['donat', 'chanda', 'upi', 'payment', 'pay'],
        answer: 'You can donate via UPI QR at the temple counter, the Quick Chanda POS desk, or the devotee portal. All donations post automatically to the temple treasury ledger.',
      },
      {
        keys: ['offline', 'internet', 'network', 'sync'],
        answer: 'The app works fully offline — collections, counts and check-ins are saved on your device and sync automatically when the internet returns. Nothing is lost.',
      },
      {
        keys: ['devotee id', 'member id', 'my id', 'id card'],
        answer: 'Your devotee ID is on your printed ID card and in Devotee → My Profile. The QR on the card is for identity verification at counters.',
      },
      {
        keys: ['hundi', 'collection', 'counting', 'audit'],
        answer: 'Hundi counting happens under dual custody with sealed bags. Timings are announced on the notice board and via Utsav broadcasts.',
      },
      {
        keys: ['contact', 'office', 'phone', 'karyalaya', 'help', 'support'],
        answer: `For immediate assistance, please contact the Karyalaya office${activeWorkspace.phone ? ' at ' + activeWorkspace.phone : ''}. Office hours are usually 9 AM – 8 PM.`,
      },
      {
        keys: ['language', 'hindi', 'bengali', 'bangla', 'english', 'bhasha'],
        answer: 'You can switch the app language (English / हिंदी / বাংলা) from the language selector in the header of the login screen and the sidebar.',
      },
      {
        keys: ['install', 'app', 'pwa', 'download', 'mobile'],
        answer: 'On your phone browser, open the site menu and tap "Add to Home Screen" / "Install App". The app then works offline like a native app and updates automatically.',
      },
    ];
    let best: { score: number; answer: string } | null = null;
    for (const faq of faqs) {
      let score = 0;
      for (const key of faq.keys) {
        if (q.includes(key)) score += key.length; // longer keyword matches weigh more
      }
      if (score > 0 && (!best || score > best.score)) best = { score, answer: faq.answer };
    }
    return best
      ? best.answer
      : 'Namaste! I am offline right now, but I can help with login, 80G receipts, darshan passes, donations, offline mode, your devotee ID, hundi timings, office contact, language, or app install — please ask about one of these.';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg, time: timeNow }]);
    setInputText('');
    setIsTyping(true);

    const botReply = (text: string, offline: boolean) => {
      setOfflineMode(offline);
      setMessages((prev) => [...prev, { sender: 'bot', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    };

    try {
      // Spark-plan path: call Gemini directly from the browser. No server.
      // Falls back to the local FAQ below when no key exists or the call fails.
      const systemInstruction =
        `You are the Vedic and administrative AI Helpdesk assistant for "${activeWorkspace.name}" ` +
        `(Type: ${activeWorkspace.type}, City: ${activeWorkspace.city}, Sampradaya: ${activeWorkspace.sampradaya || 'Sanatan Dharma'}). ` +
        `Provide a helpful, culturally reverent, concise answer in 2-3 sentences.`;
      const text = await callGeminiDirect(userMsg, systemInstruction);
      botReply(text, false);
    } catch (err) {
      // No key (GEMINI_KEY_MISSING) or network/upstream failure:
      // serve a local FAQ answer instead of a dead end.
      botReply(answerOffline(userMsg), true);
    } finally {
      setIsTyping(false);
    }
  };

  // QUEUED #61 (A3-4): an unregulated second floater must never float over
  // org work surfaces — the org view already carries its own chrome (Ask
  // FAB, SOS strip, Suchana) and this drawer even fired inside the
  // chromeless devotee preview. Suppressed for org sessions; behaviour on
  // non-org surfaces is unchanged.
  if (sessionKind === 'org') return null;

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        id="live-helpdesk-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-40 p-3.5 rounded-full bg-gradient-to-tr from-saffron-600 to-saffron-500 text-temple-950 font-bold shadow-2xl shadow-saffron-600/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-saffron-400/40"
        title="Vedic Support & Helpdesk"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-xs hidden md:inline font-extrabold tracking-wide">
          Vedic Helpdesk
        </span>
      </button>

      {/* Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 left-6 z-50 w-80 sm:w-96 rounded-2xl bg-temple-900 border border-temple-700/80 shadow-2xl flex flex-col overflow-hidden text-temple-100 max-h-[500px]"
          >
            {/* Header */}
            <div className="p-3.5 bg-gradient-to-r from-saffron-600 via-saffron-700 to-temple-900 border-b border-temple-800 flex items-center justify-between text-temple-950">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-saffron-200 flex items-center justify-center font-bold text-xs shadow">
                  ॐ
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-saffron-50 leading-tight">
                    {activeWorkspace.name} Helpdesk
                  </h4>
                  <p className="text-[10px] text-saffron-200 flex items-center gap-1.5">
                    AI Dharma Assistant & Sevadar Desk
                    {offlineMode && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-temple-950/60 border border-saffron-400/40 text-saffron-300 text-[8px] font-extrabold uppercase tracking-wider">
                        <WifiOff className="w-2.5 h-2.5" />
                        Offline answers
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close helpdesk"
                className="p-1 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-saffron-200 hover:text-saffron-50 hover:bg-temple-950/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-72 custom-scrollbar text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    m.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-saffron-600 text-temple-950 font-medium rounded-br-none'
                        : 'bg-temple-800 border border-temple-700/80 text-temple-200 rounded-bl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-temple-400 mt-0.5 px-1 font-mono">{m.time}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 text-xs text-saffron-400 bg-temple-800/80 px-3 py-2 rounded-xl w-fit">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[11px]">Consulting Shastras & Mandir Karyalaya...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-2 border-t border-temple-800 bg-temple-950/60 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about Pujas, Chanda, Tithis..."
                className="flex-1 bg-temple-800 border border-temple-700 rounded-xl px-3 py-1.5 text-xs text-temple-200 placeholder-temple-400 focus:outline-none focus:border-saffron-500"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-saffron-500 hover:bg-saffron-400 text-temple-950 font-bold transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
