/**
 * jyotish/ConsultationAnswerComposer.tsx — Public wisdom sharing (Phase 4).
 * ============================================================================
 * After a consultation completes, the jyotishi may share an ANONYMIZED
 * public follow-up: general guidance framed as "A devotee asked…".
 *
 * Privacy is structural:
 * - The devotee's identity is NEVER passed to this component.
 * - The devotee must explicitly opt in (toggle, defaults OFF).
 * - The validator blocks identity-leaking patterns.
 * - The post button stays disabled until consent is ON and text is valid.
 */
import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useJyotish } from '../context/JyotishContext';
import { useToast } from '../context/ToastContext';
import {
  validateConsultationAnswer,
  consultationAnswerPost,
  type ConsultationAnswerDraft,
} from '../sangam/consultationAnswer';
import { Card, Btn, SectionTitle } from './ui';

function rid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const ConsultationAnswerComposer: React.FC<{ consultationId: string }> = ({
  consultationId,
}) => {
  const { profile } = useJyotish();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);

  if (!profile) return null;

  const draft: ConsultationAnswerDraft = {
    answerText: text,
    devoteeConsented: consented,
    authorUid: profile.uid,
    authorName: profile.displayName,
    authorSanId: profile.id,
  };
  const violations = validateConsultationAnswer(draft);
  const canPublish = consented && violations.length === 0 && !busy && !shared;

  const publish = async () => {
    if (!canPublish) return;
    setBusy(true);
    try {
      const id = rid('post');
      const fields = consultationAnswerPost({ draft, createdAt: Date.now() });
      await setDoc(doc(db, 'sangamPosts', id), { ...fields, id });
      setShared(true);
      showToast('Your wisdom is now public — framed anonymously. 🙏', 'success');
    } catch {
      showToast('Could not share. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (shared) {
    return (
      <div className="mt-2 ml-1 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
        🙏 Shared publicly — the devotee remains anonymous.
      </div>
    );
  }

  return (
    <div className="mt-2 ml-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="min-h-[44px] px-4 rounded-xl bg-white border border-indigo-200 text-indigo-800 font-bold text-sm hover:bg-indigo-50 active:scale-[0.98] transition flex items-center gap-2"
      >
        {open ? '▾' : '▸'} 🪔 Share wisdom publicly
      </button>
      {open && (
        <Card>
          <SectionTitle>Public follow-up</SectionTitle>
          <p className="text-[12px] text-stone-500 mb-3">
            Share general guidance from this consultation as a public post. It will appear as{' '}
            <em>"A devotee asked…"</em> — the devotee's identity is never revealed.
          </p>

          {/* Consent toggle — REQUIRED, defaults OFF */}
          <label className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-1 w-5 h-5 accent-amber-700"
            />
            <span className="text-sm text-stone-800">
              <strong>The devotee explicitly agreed</strong> to a public follow-up from this
              consultation. <span className="text-stone-500">(Required — ask them first.)</span>
            </span>
          </label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share the general wisdom — what would help any devotee with a similar question? (30+ characters, no names or identifying details)"
            rows={5}
            maxLength={2000}
            className="w-full p-3 rounded-2xl border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-2"
          />
          <p className="text-[11px] text-stone-400 mb-3 text-right">{text.trim().length}/2000</p>

          {/* Preview */}
          {text.trim().length >= 30 && (
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 mb-3">
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">Preview</p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">
                A devotee asked…{'\n\n'}
                {text.trim()}
                {'\n\n'}🙏 Ask your own question — book a consultation.
              </p>
            </div>
          )}

          {violations.length > 0 && (
            <ul className="mb-3 space-y-1">
              {violations.map((v, i) => (
                <li key={i} className="text-[12px] text-red-700 bg-red-50 rounded-xl px-3 py-2">
                  ⚠️ {v}
                </li>
              ))}
            </ul>
          )}

          <Btn
            variant="primary"
            onClick={publish}
            disabled={!canPublish}
          >
            {busy ? 'Sharing…' : '🙏 Share publicly'}
          </Btn>
          {!consented && (
            <p className="text-[11px] text-stone-400 mt-2">
              The devotee's consent is required before sharing.
            </p>
          )}
        </Card>
      )}
    </div>
  );
};
