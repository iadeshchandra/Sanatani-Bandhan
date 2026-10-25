import React, { useMemo } from 'react';
import { useCashCustody, verifyChain } from './cashCustodyStore';
import { CustodyEventKind } from './types';
import { T, Card, Btn, fmtDateTime, useLocaleText } from './ui';
import { MalaThread } from '../components/common/MalaThread';

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
  const { tr } = useLocaleText();
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
            📿 {tr('vibe.malaIntact', 'The mala is unbroken — every bead verified', 'মালা অখণ্ড — প্রতিটি পুঁতি যাচাই করা', 'माला अखंड है — हर मनका सत्यापित')}
          </span>
        ) : (
          <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            📿 {tr('vibe.malaBroken', 'The mala is broken at bead {n} — please look into it before going further', 'মালা {n} নম্বর পুঁতিতে ছিন্ন — এগোনোর আগে অনুগ্রহ করে দেখুন', 'माला मनके {n} पर टूटी है — आगे बढ़ने से पहले कृपया जाँच करें').replace('{n}', String(brokenAt + 1))}
          </span>
        )}
      </div>

      <Card>
        <div className="text-xs text-stone-500 mb-3">
          {tr('vibe.malaThreadNote', 'Each bead is an event, sealed with the seal of the one before it. On an unbroken thread, a break cannot hide.', 'প্রতিটি পুঁতি একটি ঘটনা, আগেরটির সিলমোহরে মোহরিত। অখণ্ড সুতোয় ছিন্নতা লুকোতে পারে না।', 'हर मनका एक घटना है, पिछले की मुहर से मुहरबंद। अखंड धागे पर टूट छिप नहीं सकती।')}
        </div>
        <div className="max-h-[480px] overflow-y-auto pr-1">
          {/* VIBE B3 — the custody timeline as an unbroken mala: one
              bead per event on a brass thread; beads at/after the
              verified break hollow out and the thread gaps. The
              verifyChain result above is the only source of "broken"
              — presentation changes, verification does not. */}
          <MalaThread
            tone="light"
            breakLabel={tr('vibe.malaBreakHere', 'The thread breaks here', 'সুতো এখানে ছিন্ন', 'धागा यहाँ टूटता है')}
            beads={sorted.map((ev, i) => ({
              id: ev.id,
              seqLabel: `#${i + 1}`,
              title: (
                <>
                  <span aria-hidden>{KIND_ICON[ev.kind] || '•'}</span>{' '}
                  {ev.kind.replace(/_/g, ' ')}
                </>
              ),
              detail: ev.details,
              meta: `${ev.actor} · ${fmtDateTime(ev.ts)}`,
              hashShort: `${ev.hash.slice(0, 10)}…`,
              broken: brokenAt !== -1 && i >= brokenAt,
              expandedContent: (
                <div className="font-mono text-[10px] text-stone-400 break-all">
                  hash {ev.hash} · prev {ev.prevHash}
                </div>
              ),
            }))}
            emptyState={(
              <p className="text-sm text-stone-500"><T en="No custody events yet." bn="এখনও কোনো ইভেন্ট নেই।" hi="अभी कोई घटना नहीं।" /></p>
            )}
          />
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
