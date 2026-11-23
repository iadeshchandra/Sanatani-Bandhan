/**
 * ModeSwitch — TWO-MODE M1: THE Personal ⇄ Organisation switch.
 * =====================================================================
 * The owner's model (approved 2026-11-23): exactly two modes —
 * Personal (everyone) and Organisation (only with an enrolment:
 * org staff role, Purohit workspace, or Jyotishi workspace). This
 * component is the one switch for the org-session shells, rendered
 * in the same header slot in both: the member shell's header (light
 * tone) and the org-space console header (dark tone, MANAGER mode —
 * in MEMBER mode the member shell's own header carries it, so the
 * two never stack).
 *
 * The verdict is the SHARED one — lib/orgConsoleAccess, judged per
 * the ACTIVE workspace, the same evidence the portal toggle and the
 * landing law use. Three honest states, never a dead lock:
 *
 *   · Access open  → a segmented Personal | Organisation control;
 *     the current mode is the filled segment. Going to Organisation
 *     keeps MemberAppShell's P0-2 discipline: a demo sandbox is
 *     exited first, so the switch never lands a real session inside
 *     demo chrome.
 *   · No access (verdict settled) → the slot becomes the invitation:
 *     "Grow with Sanatani Bandhan", opening GrowSheet (the
 *     JoinUpgrade doors). No lock icon, no error toast.
 *   · Verdict still resolving → a quiet pill naming the current
 *     mode; the slot never guesses an org door open or shut.
 *
 * Hosts that own a GrowSheet of their own (MemberAppShell shares
 * one with its legacy switch doors) pass onGrowRequest and this
 * switch delegates instead of mounting a second sheet.
 *
 * Sandhya: the switch is built only from utility classes the dusk
 * remap already covers (temple/amber tokens on light, white/amber
 * washes on the already-evening dark header) — no new surface class
 * is introduced, so no new remap rule is needed.
 */

import React, { useState } from 'react';
import { Building2, Sprout, UserCircle } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useOrgConsoleAccess } from '../../lib/orgConsoleAccess';
import { useLanguage } from '../../context/LanguageContext';
import { GrowSheet } from './GrowSheet';

interface ModeSwitchProps {
  /** light = the member shell's white header; dark = the temple-950 console header. */
  tone: 'light' | 'dark';
  /** Delegate the Grow invitation to a host-owned GrowSheet. */
  onGrowRequest?: () => void;
  className?: string;
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({
  tone,
  onGrowRequest,
  className = '',
}) => {
  const { viewMode, setViewMode, activeWorkspace, exitDemo } = useAuthWorkspace();
  const { canOpenConsole, resolved } = useOrgConsoleAccess();
  const { t } = useLanguage();
  const [growOpen, setGrowOpen] = useState(false);

  const openGrow = () => {
    if (onGrowRequest) onGrowRequest();
    else setGrowOpen(true);
  };

  const goOrganisation = () => {
    if (!canOpenConsole) return;
    // P0-2 (MemberAppShell's discipline, kept): exit the demo
    // sandbox first — the switch must land in the real console.
    if (activeWorkspace?.id?.startsWith('DEMO_')) exitDemo();
    setViewMode('MANAGER');
  };

  const dark = tone === 'dark';

  if (canOpenConsole) {
    const track = dark
      ? 'bg-white/10 border-white/10'
      : 'bg-temple-100 border-temple-200';
    const activeCls = dark
      ? 'bg-amber-500 text-temple-950 shadow-sm'
      : 'bg-temple-950 text-amber-100 shadow-sm';
    const idleCls = dark
      ? 'text-amber-100/70 hover:text-amber-100'
      : 'text-temple-600 hover:text-temple-900';
    const segment = (
      mode: 'MEMBER' | 'MANAGER',
      icon: React.ReactNode,
      label: string,
      onTap: () => void,
    ) => {
      const isActive = viewMode === mode;
      return (
        <button
          type="button"
          onClick={onTap}
          aria-pressed={isActive}
          aria-label={label}
          title={label}
          className={`min-w-[44px] min-h-[44px] px-2.5 sm:px-3 rounded-full flex items-center justify-center gap-1.5 text-[11px] font-black transition-colors cursor-pointer ${
            isActive ? activeCls : idleCls
          }`}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      );
    };
    return (
      <div
        role="group"
        aria-label={t('surfaces.twoMode.modeLabel')}
        className={`inline-flex items-center gap-0.5 p-0.5 rounded-full border shrink-0 ${track} ${className}`}
      >
        {segment(
          'MEMBER',
          <UserCircle className="w-4 h-4 shrink-0" />,
          t('surfaces.twoMode.personal'),
          () => setViewMode('MEMBER'),
        )}
        {segment(
          'MANAGER',
          <Building2 className="w-4 h-4 shrink-0" />,
          t('surfaces.twoMode.organisation'),
          goOrganisation,
        )}
      </div>
    );
  }

  if (!resolved) {
    // The membership evidence is still landing — name the mode the
    // user is actually in, and hold the door judgement until it
    // settles (the orgConsoleAccess pending discipline).
    return (
      <span
        aria-label={t('surfaces.twoMode.modeLabel')}
        className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full border text-[11px] font-black shrink-0 ${
          dark
            ? 'bg-white/5 border-white/10 text-amber-100/60'
            : 'bg-temple-50 border-temple-200 text-temple-500'
        } ${className}`}
      >
        <UserCircle className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">
          {viewMode === 'MANAGER'
            ? t('surfaces.twoMode.organisation')
            : t('surfaces.twoMode.personal')}
        </span>
      </span>
    );
  }

  // No enrolment: the slot is an invitation, never a lock.
  return (
    <>
      <button
        type="button"
        onClick={openGrow}
        aria-label={t('surfaces.twoMode.grow')}
        title={t('surfaces.twoMode.grow')}
        className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full text-[11px] font-black shadow-sm transition-colors cursor-pointer shrink-0 ${
          dark
            ? 'bg-amber-500 hover:bg-amber-400 text-temple-950'
            : 'bg-cta hover:bg-cta-hover text-white'
        } ${className}`}
      >
        <Sprout className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">{t('surfaces.twoMode.grow')}</span>
        <span className="sm:hidden">{t('surfaces.twoMode.growShort')}</span>
      </button>
      {!onGrowRequest && (
        <GrowSheet open={growOpen} onClose={() => setGrowOpen(false)} />
      )}
    </>
  );
};
