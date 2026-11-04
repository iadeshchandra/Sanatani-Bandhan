import type { ReactNode } from 'react';
import { useSanctumLite } from '../PanchangHeader';
import { festivalDressingToday } from '../../../lib/festivalDressing';

/** The three-petal lotus — the sanctum eyebrow mark, drawn once in
 *  PanchangHeader and shared by every sanctum hero (DESIGN-NORTH-STAR:
 *  pan-Sanatani symbols only; one mark, never per-desk variants). */
const LotusMark = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
    <path d="M12 3c1.6 2.1 2.4 4.2 2.4 6.3 0 2-.8 3.6-2.4 4.7-1.6-1.1-2.4-2.7-2.4-4.7C9.6 7.2 10.4 5.1 12 3Z" />
    <path d="M4.6 8.6c2.5.3 4.5 1.3 5.9 2.9.6 1.9.2 3.7-1 5.2-2-.3-3.6-1.2-4.7-2.8-1-1.6-1.1-3.4-.2-5.3Z" opacity=".75" />
    <path d="M19.4 8.6c.9 1.9.8 3.7-.2 5.3-1.1 1.6-2.7 2.5-4.7 2.8-1.2-1.5-1.6-3.3-1-5.2 1.4-1.6 3.4-2.6 5.9-2.9Z" opacity=".75" />
    <path d="M4 17.6c2.4 1.5 5.1 2.2 8 2.2s5.6-.7 8-2.2c-.8 2-3.4 3.4-8 3.4s-7.2-1.4-8-3.4Z" opacity=".55" />
  </svg>
);

interface DeskHeroProps {
  /** Small brass label above the title (domain / desk line). Optional —
   *  desks without an honest eyebrow line omit it rather than invent one. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Treasury's hero historically renders an h2 under the page h1;
   *  full-page desks render the h1. Same face, same scale either way. */
  titleAs?: 'h1' | 'h2';
  subtitle?: ReactNode;
  /** Brass / house-Chip context chips under the subtitle. */
  chips?: ReactNode;
  /** One primary (house Button) + secondary/ghost actions, top-right. */
  actions?: ReactNode;
  /** Festival dressing key; defaults to today's dressing. Pass null to
   *  pin the plain sanctum ground (the dressing layer CSS reads the
   *  data-dressing attribute exactly as PanchangHeader sets it). */
  dressing?: string | null;
  /** Extra hero content under the title block (disclaimers, stat lines). */
  children?: ReactNode;
  className?: string;
}

/**
 * DeskHero — THE desk hero (Design Elevation E3, DE-01). The sanctum
 * hero of PanchangHeader / Role Home, formalised for desks: ivory-sandal
 * ground, lamplight wash, alpana watermark, display-serif title, brass
 * context chips, one primary action, lotus-petal rule at the foot.
 * Festival dressing still applies over it (data-dressing); Sandhya's
 * dusk register deepens it through the shared .sanctum-header CSS.
 * A desk may not ship a private hero theme again — extend this
 * component instead. Presentation only: every slot renders exactly the
 * nodes the desk passes; handlers, ids and data stay with the desk.
 */
export const DeskHero: React.FC<DeskHeroProps> = ({
  eyebrow,
  title,
  titleAs = 'h1',
  subtitle,
  chips,
  actions,
  dressing,
  children,
  className = '',
}) => {
  const lite = useSanctumLite();
  const activeDressing =
    dressing === undefined ? festivalDressingToday().key : dressing;
  const Title = titleAs;
  return (
    <section
      data-dressing={
        activeDressing && activeDressing !== 'none' ? activeDressing : undefined
      }
      className={`sanctum-header lamplight alpana-watermark relative overflow-hidden rounded-3xl border border-brass-200 px-5 py-5 sm:px-6 ${lite ? 'sanctum-lite' : ''} ${className}`.trim()}
    >
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="flex items-center gap-1.5 text-brass-600">
                <LotusMark />
                <span className="text-[10px] uppercase font-bold tracking-wider">
                  {eyebrow}
                </span>
              </div>
            ) : null}
            <Title className="font-display text-2xl font-semibold text-temple-900 tracking-tight mt-1">
              {title}
            </Title>
            {subtitle ? (
              <p className="text-xs text-temple-500 mt-1 font-medium max-w-2xl">
                {subtitle}
              </p>
            ) : null}
            {chips ? (
              <div className="flex flex-wrap items-center gap-2 mt-3">{chips}</div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2 max-w-full">
              {actions}
            </div>
          ) : null}
        </div>
        {children}
        <div className="lotus-divider mt-4" aria-hidden="true" />
      </div>
    </section>
  );
};
