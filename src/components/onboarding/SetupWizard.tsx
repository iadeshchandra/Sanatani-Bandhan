import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, Sparkles, ShieldCheck, ChevronRight, Sprout } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { enableModule } from '../../suggestions/store';
import { setPinnedDesks } from '../common/ui/deskHistory';
import {
  WIZARD_ORG_TYPES,
  ORG_TYPE_META,
  PAINS,
  SIZES,
  STAFF_SIZES,
  getEssentialDesks,
  deskName,
  tierNoteForDesk,
  markSetupDone,
  wizardWelcomeHeading,
} from './wizardDeskMap';

interface SetupWizardProps {
  workspaceId: string;
  workspaceName: string;
  /** Org type chosen at signup — preselected in step 1. */
  signupOrgType?: string | null;
  planId?: string | null;
  onComplete: () => void;
  /** Deep-link to the compliance checklist (Settings). */
  onOpenCompliance: () => void;
}

const STEPS = [
  { sanskrit: 'Parichay', english: 'Your organisation' },
  { sanskrit: 'Parivar', english: 'Your size' },
  { sanskrit: 'Peeda', english: 'What hurts most' },
  { sanskrit: 'Sajja', english: 'Your workspace is ready' },
];

/**
 * SetupWizard — the first-run onboarding flow.
 *
 * Shows exactly once per fresh (non-demo) workspace, right after signup.
 * Warm Sanatani first impression: 4 steps, 60 seconds, skippable everywhere.
 * Ends with THEIR ~8 essential desks enabled on the workspace and set as
 * its sidebar favorites — the desks named in step 4 are really there.
 */
export const SetupWizard: React.FC<SetupWizardProps> = ({
  workspaceId,
  workspaceName,
  signupOrgType,
  planId,
  onComplete,
  onOpenCompliance,
}) => {
  const { seedDemoData } = useData();
  const { activeWorkspace, updateWorkspaceDetails } = useAuthWorkspace();
  const [step, setStep] = useState(0);
  const [orgType, setOrgType] = useState<string>(
    signupOrgType && WIZARD_ORG_TYPES.includes(signupOrgType as never) ? signupOrgType : 'Mandir'
  );
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [pains, setPains] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState(true);
  // Blueprint D — the gentle first-run practice suggestion. Default
  // OFF: practice mode is the owner's own choice, never a default
  // that could make a real first donation land as pretend.
  const [practiceMode, setPracticeMode] = useState(false);
  const [displayName, setDisplayName] = useState(workspaceName);
  const [editingName, setEditingName] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const essentialDesks = useMemo(
    () => getEssentialDesks(orgType, pains, sizeId),
    [orgType, pains, sizeId]
  );

  const togglePain = (id: string) => {
    setPains((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length >= 3 ? prev : [...prev, id]
    );
  };

  const skip = () => {
    markSetupDone(workspaceId);
    onComplete();
  };

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      // 1. Their ~8 essential desks become sidebar favorites (existing system).
      // QUEUED #50 (D11b): pinned desks are scoped to THIS workspace.
      await setPinnedDesks(essentialDesks, workspaceId);
      // 1b. QUEUED #57 (audit A1-D06): pinning alone silently dropped
      // every non-native pick — the Sidebar intersects pins with the
      // org taxonomy, so desks the wizard just named ("these desks
      // will greet you first") never appeared. Enable the picks for
      // real: canonical ids via enableModule, accumulated locally and
      // written once. Guarded to the workspace being set up.
      if (activeWorkspace && activeWorkspace.id === workspaceId) {
        let enabled = activeWorkspace.enabledModules || [];
        for (const id of essentialDesks) {
          enabled = enableModule(enabled, id, () => undefined, workspaceId);
        }
        updateWorkspaceDetails({ enabledModules: enabled });
      }
      // 1c. Blueprint D — optional practice mode for the first tour:
      // written through the same audited settings choke point, and
      // only for the workspace being set up.
      if (practiceMode && activeWorkspace && activeWorkspace.id === workspaceId) {
        updateWorkspaceDetails({ practiceMode: true });
      }
      // 2. Optional sample records, clearly marked as sample by the seeder.
      if (sampleData) {
        try {
          seedDemoData(workspaceId, orgType);
        } catch {
          /* seeding is best-effort */
        }
      }
    } finally {
      markSetupDone(workspaceId);
      onComplete();
    }
  };

  const picked80G = pains.includes('compliance');
  const isTrustLike = ['Trust', 'Mandir', 'MahotsavSamiti'].includes(orgType);

  /* sb-sos-clear (QUEUED #52, audit D12): this overlay is its own inner
     scroller, so the body-level FAB clearance cannot reach its cards —
     the class reserves the SOS mini's footprint at the scroll end and
     the wizard's last card never rests underneath it. */
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-gradient-to-b from-amber-100 via-orange-50 to-stone-100 overflow-y-auto sb-sos-clear"
      role="dialog"
      aria-modal="true"
      aria-label="Workspace setup wizard"
    >
      {/* soft mandala glow backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 20%, rgba(251,191,36,0.35), transparent 55%), radial-gradient(circle at 85% 90%, rgba(249,115,22,0.18), transparent 50%)',
        }}
      />
      <div className="relative w-full max-w-2xl my-8 bg-white rounded-3xl shadow-2xl border border-amber-200/60 overflow-hidden">
        {/* header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl" aria-hidden="true">🪔</p>
              <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-stone-900">
                {wizardWelcomeHeading(orgType)}
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                60 seconds, 4 steps — then your workspace feels like <em>yours</em>.
              </p>
            </div>
            <button
              type="button"
              onClick={skip}
              className="shrink-0 min-h-[44px] px-3 text-xs font-bold text-stone-400 hover:text-stone-700 underline underline-offset-2"
            >
              I'll explore myself
            </button>
          </div>
          {/* progress */}
          <ol className="mt-4 flex items-center gap-1.5" aria-label="Setup progress">
            {STEPS.map((s, i) => (
              <li key={s.sanskrit} className="flex-1">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  disabled={i >= step}
                  className="w-full text-left group"
                  aria-current={i === step ? 'step' : undefined}
                >
                  <div
                    className={`h-1.5 rounded-full transition-colors ${
                      i < step ? 'bg-amber-500' : i === step ? 'bg-amber-400' : 'bg-stone-200'
                    }`}
                  />
                  <p className={`mt-1.5 text-[10px] sm:text-xs font-bold leading-tight ${i === step ? 'text-amber-700' : 'text-stone-400'}`}>
                    {s.sanskrit}
                    <span className="block font-medium">{s.english}</span>
                  </p>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="px-6 sm:px-8 py-6 min-h-[320px]">
          {step === 0 && (
            <div>
              <h3 className="text-lg font-extrabold text-stone-900">What best describes your organisation?</h3>
              <p className="text-sm text-stone-500 mb-4">We'll shape your workspace around it.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ORG_TYPE_META.map((o) => (
                  <button
                    key={o.type}
                    type="button"
                    onClick={() => setOrgType(o.type)}
                    aria-pressed={orgType === o.type}
                    className={`min-h-[88px] p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                      orgType === o.type
                        ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-500/10'
                        : 'border-stone-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">{o.icon}</span>
                    <span className="block mt-1 text-sm font-extrabold text-stone-900">{o.label}</span>
                    <span className="block mt-0.5 text-[11px] leading-snug text-stone-500">{o.hook}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="text-lg font-extrabold text-stone-900">How big is your parivar?</h3>
              <p className="text-sm text-stone-500 mb-4">One tap each — this tunes your workspace.</p>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Devotees / members</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSizeId(s.id)}
                    aria-pressed={sizeId === s.id}
                    className={`min-h-[64px] p-3 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                      sizeId === s.id ? 'border-amber-500 bg-amber-50' : 'border-stone-200 hover:border-amber-300'
                    }`}
                  >
                    <span className="block text-base font-extrabold text-stone-900">{s.label}</span>
                    <span className="block text-[11px] text-stone-500">{s.sub}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                Team running it <span className="normal-case font-medium">(optional)</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {STAFF_SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStaffId(staffId === s.id ? null : s.id)}
                    aria-pressed={staffId === s.id}
                    className={`min-h-[48px] px-3 rounded-2xl border-2 text-sm font-bold transition-all active:scale-[0.98] ${
                      staffId === s.id ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-stone-200 text-stone-600 hover:border-amber-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-stone-500">Setting up:</span>
                {editingName ? (
                  <input
                    autoFocus
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                    className="min-h-[44px] px-3 rounded-xl border-2 border-amber-400 font-bold text-stone-900 outline-none"
                    aria-label="Organisation name"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="min-h-[44px] font-extrabold text-stone-900 underline decoration-amber-400 decoration-2 underline-offset-4"
                  >
                    {displayName || 'My Organisation'} ✏️
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-lg font-extrabold text-stone-900">What hurts the most right now?</h3>
              <p className="text-sm text-stone-500 mb-4">
                Pick up to <strong>3</strong> — we'll put the right desks front and center.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAINS.map((p) => {
                  const active = pains.includes(p.id);
                  const disabled = !active && pains.length >= 3;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePain(p.id)}
                      disabled={disabled}
                      aria-pressed={active}
                      className={`min-h-[64px] p-3 rounded-2xl border-2 flex items-center gap-3 text-left transition-all active:scale-[0.98] ${
                        active
                          ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-500/10'
                          : disabled
                            ? 'border-stone-100 bg-stone-50 opacity-50'
                            : 'border-stone-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      <span className="text-2xl shrink-0" aria-hidden="true">{p.icon}</span>
                      <span>
                        <span className="flex items-center gap-1.5 text-sm font-extrabold text-stone-900">
                          {p.label}
                          {active && <Check className="w-4 h-4 text-amber-600" aria-hidden="true" />}
                        </span>
                        <span className="block text-[11px] text-stone-500">{p.line}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-lg font-extrabold text-stone-900">
                Your workspace is ready 🎉
              </h3>
              <p className="text-sm text-stone-500 mb-4">
                Based on your answers, these desks will greet you first:
              </p>
              <ul className="space-y-2 mb-5">
                {essentialDesks.map((id) => {
                  const note = tierNoteForDesk(id, planId);
                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50/70 border border-amber-100"
                    >
                      <span className="text-sm font-bold text-stone-800">
                        <span className="text-amber-600 mr-2" aria-hidden="true">✦</span>
                        {deskName(id)}
                      </span>
                      {note && (
                        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-purple-700 bg-purple-100 border border-purple-200 rounded-full px-2 py-0.5">
                          {note.tier} · {note.price}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <label className="flex items-start gap-3 p-4 rounded-2xl border-2 border-stone-200 cursor-pointer hover:border-amber-300 transition-colors mb-3">
                <input
                  type="checkbox"
                  checked={sampleData}
                  onChange={(e) => setSampleData(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-amber-600"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-extrabold text-stone-900">
                    <Sparkles className="w-4 h-4 text-amber-600" aria-hidden="true" />
                    Load sample records so I can explore
                  </span>
                  <span className="block text-xs text-stone-500 mt-0.5">
                    Clearly marked as sample — delete them anytime. Recommended for your first tour.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 p-4 rounded-2xl border-2 border-stone-200 cursor-pointer hover:border-violet-300 transition-colors mb-3">
                <input
                  type="checkbox"
                  checked={practiceMode}
                  onChange={(e) => setPracticeMode(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-violet-600"
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-extrabold text-stone-900">
                    <Sprout className="w-4 h-4 text-violet-600" aria-hidden="true" />
                    Start in practice mode — nothing will be real
                  </span>
                  <span className="block text-xs text-stone-500 mt-0.5">
                    Practising — nothing here is real. Try every desk freely; practice entries are clearly marked, never counted, and clear in one tap from Settings. Turn it off whenever you are ready for the real books.
                  </span>
                </span>
              </label>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-bold text-stone-800">80G tip</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {picked80G
                      ? 'You flagged tax compliance — add your 80G registration when ready, and your receipts become statutory.'
                      : 'Add your 80G registration later in Settings → Compliance to issue statutory receipts.'}
                  </p>
                  {isTrustLike && (
                    <button
                      type="button"
                      onClick={onOpenCompliance}
                      className="mt-2 inline-flex items-center gap-1 min-h-[44px] text-xs font-extrabold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                    >
                      Open the compliance checklist <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* footer nav */}
        <div className="px-6 sm:px-8 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (step === 0 ? skip() : setStep(step - 1))}
            className="min-h-[48px] inline-flex items-center gap-1.5 px-4 rounded-xl text-sm font-bold text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {step === 0 ? 'Skip setup' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="min-h-[48px] inline-flex items-center gap-2 px-8 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-sm font-extrabold shadow-lg shadow-amber-500/25 transition-all active:scale-[0.97]"
            >
              Continue <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={finishing}
              className="min-h-[48px] inline-flex items-center gap-2 px-8 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-sm font-extrabold shadow-lg shadow-amber-500/25 transition-all active:scale-[0.97] disabled:opacity-70"
            >
              {finishing ? 'Preparing…' : 'Enter my workspace 🛕'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SetupWizard;
