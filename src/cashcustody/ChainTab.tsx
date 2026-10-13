import React, { useMemo } from 'react';
import { useCashCustody, verifyChain } from './cashCustodyStore';
import { CustodyEventKind } from './types';
import { T, Card, Btn, fmtDateTime } from './ui';

/* ------------------------------------------------------------------ */
/* Tamper-evident custody log — every event hash-chained with SHA-256. */
/* Any edit to any event breaks every later link; the break is shown   */
/* visibly with the exact position.                                    */
/* ------------------------------------------------------------------ */

const KIND_ICON: Record<CustodyEventKind, string> = {
  box_registered: '📦', box_opened: '🔓', count_started: '🧮', count_verified: '✓',
  session_closed: '🔒', deposit_created: '🧾', deposit_confirmed: '💰',
  seal_changed: '🏷️', staff_checkin: '👷', staff_checkout: '👷',
};

export const ChainTab: React.FC = () => {
  const { state } = useCashCustody();
  const sorted = useMemo(
    () => [...state.events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)),
    [state.events]
  );
  const brokenAt = useMemo(() => verifyChain(state.events), [state.events]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800">
          <T en="Custody log" bn="হেফাজত লগ" hi="अभिरक्षा लॉग" /> ({sorted.length})
        </h2>
        {brokenAt === -1 ? (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            ⛓️ <T en="Chain intact — every link verified" bn="শৃঙ্খল অক্ষত" hi="श्रृंखला अक्षत" />
          </span>
        ) : (
          <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            🚨 <T en="CHAIN BROKEN" bn="শৃঙ্খল ভাঙা" hi="श्रृंखला टूटी" /> — <T en="link" bn="লিংক" hi="कड़ी" /> #{brokenAt + 1} <T en="fails verification. Investigate before proceeding." bn="যাচাই ব্যর্থ।" hi="सत्यापन विफल।" />
          </span>
        )}
      </div>

      <Card>
        <div className="text-xs text-stone-500 mb-3">
          <T en="Each event stores the SHA-256 hash of the previous event. Editing any record changes its hash and breaks every later link — tampering cannot hide."
            bn="প্রতিটি ইভেন্ট আগেরটির SHA-256 হ্যাশ রাখে। কোনো রেকর্ড বদলালে শৃঙ্খল ভাঙে।"
            hi="प्रत्येक घटना पिछली घटना का SHA-256 हैश रखती है। कोई बदलाव श्रृंखला तोड़ देता है।" />
        </div>
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {sorted.map((ev, i) => {
            const broken = brokenAt !== -1 && i >= brokenAt;
            return (
              <div key={ev.id} className={`rounded-xl border p-3 text-sm ${broken ? 'border-red-300 bg-red-50' : 'border-stone-100 bg-stone-50/60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-lg leading-none mt-0.5">{KIND_ICON[ev.kind] || '•'}</span>
                    <div>
                      <div className="font-bold text-stone-800">{ev.kind.replace(/_/g, ' ')}</div>
                      <div className="text-stone-600 text-xs mt-0.5">{ev.details}</div>
                      <div className="text-stone-400 text-[11px] mt-0.5">{ev.actor} · {fmtDateTime(ev.ts)}</div>
                    </div>
                  </div>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${broken ? 'bg-red-200 text-red-800' : 'bg-stone-200 text-stone-600'}`}>
                    #{i + 1}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-stone-400 mt-2 break-all">
                  hash {ev.hash.slice(0, 20)}… · prev {ev.prevHash.slice(0, 20)}…
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <p className="text-sm text-stone-500"><T en="No custody events yet." bn="এখনও কোনো ইভেন্ট নেই।" hi="अभी कोई घटना नहीं।" /></p>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-bold text-stone-700"><T en="Re-verify the full chain" bn="পূর্ণ শৃঙ্খল যাচাই" hi="पूर्ण श्रृंखला सत्यापित करें" /></div>
          <VerifyButton brokenAt={brokenAt} />
        </div>
      </Card>
    </div>
  );
};

const VerifyButton: React.FC<{ brokenAt: number }> = ({ brokenAt }) => {
  const [checked, setChecked] = React.useState(false);
  return (
    <div className="flex items-center gap-2">
      <Btn variant="ghost" onClick={() => setChecked(true)}>⛓️ <T en="Verify now" bn="যাচাই করুন" hi="सत्यापित करें" /></Btn>
      {checked && (
        <span className={`text-xs font-bold ${brokenAt === -1 ? 'text-emerald-700' : 'text-red-700'}`}>
          {brokenAt === -1 ? '✓ intact' : `✗ broken at #${brokenAt + 1}`}
        </span>
      )}
    </div>
  );
};
