/**
 * ConsultationChat — in-app chat for one consultation.
 * =====================================================================
 * Messages live at jyotishConsultations/{id}/messages, party-scoped by
 * Firestore rules (only the devotee and the assigned jyotishi can read or
 * write). Honest scope: this is text chat only — call/video happen through
 * the scheduled session link the parties arrange (see MyConsultationsTab).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useJyotish, useConsultationMessages } from '../context/JyotishContext';
import { Consultation } from '../types/jyotish';
import { PrescribeRemedy } from '../components/sevaPro/PrescribeRemedy';
import { RemedyToRitual } from '../components/sevaPro/RemedyToRitual';
export const ConsultationChat: React.FC<{ consultation: Consultation }> = ({ consultation }) => {
  const { firebaseUser } = useAuthWorkspace();
  const { sendMessage } = useJyotish();
  const messages = useConsultationMessages(consultation.id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendMessage(consultation, draft);
      setDraft('');
    } catch (err: any) {
      alert(err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const uid = firebaseUser?.uid;

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">
        💬 Consultation chat — {consultation.devoteeName} ⇄ {consultation.assignedJyotishName || 'Jyotishi'}
      </div>
      {/* Seva Pro Phase 4 — devotee sees prescribed remedies as warm booking cards */}
      <RemedyToRitual consultation={consultation} />
      <div className="max-h-64 overflow-y-auto space-y-2 mb-3 pr-1">        {messages.length === 0 && (
          <p className="text-xs text-stone-400 text-center py-4">
            No messages yet. Say namaste and agree on the consultation details.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderUid === uid;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white border border-stone-200 text-stone-800 rounded-bl-md'
                }`}
              >
                <div className={`text-[10px] font-bold mb-0.5 ${mine ? 'text-indigo-200' : 'text-stone-400'}`}>
                  {m.senderName} · {m.senderKind === 'jyotish' ? '🔮' : '🙏'}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 min-h-[44px]"
        >
          Send
        </button>
      </form>
      {/* Seva Pro Phase 4 — jyotish prescribes a sacred remedy (self-gated) */}
      <div className="mt-2 flex justify-end">
        <PrescribeRemedy consultation={consultation} />
      </div>
    </div>
  );
};