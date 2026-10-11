import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, Sparkles, HelpCircle } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';

export const TawkToWidget: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const [isOpen, setIsOpen] = useState(false);
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg, time: timeNow }]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/gemini/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `User Question: "${userMsg}". 
Context: You are the Vedic and administrative AI Helpdesk assistant for "${activeWorkspace.name}" (Type: ${activeWorkspace.type}, City: ${activeWorkspace.city}, Sampradaya: ${activeWorkspace.sampradaya || 'Sanatan Dharma'}).
Provide a helpful, culturally reverent, concise answer in 2-3 sentences.`,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: data.text || 'Hare Krishna. Our temple sevaks are here to assist with daily Darshan, Pujas, and Annadanam.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Namaste! For immediate assistance, please contact our Karyalaya office at ' + activeWorkspace.phone,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

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
                  <p className="text-[10px] text-saffron-200">AI Dharma Assistant & Sevadar Desk</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-saffron-200 hover:text-saffron-50 hover:bg-temple-950/20"
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
                className="p-2 rounded-xl bg-saffron-500 hover:bg-saffron-400 text-temple-950 font-bold transition-all"
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
