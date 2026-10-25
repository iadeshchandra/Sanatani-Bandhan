/**
 * MalaThread.tsx — VIBE B3: trust made visible as an unbroken mala.
 * ============================================================================
 * The north-star's trust signature: a hash-chained event stream drawn
 * as beads on a thread — one bead per event, a vertical brass thread
 * running through them all. Continuity IS the meaning: where chain
 * verification reports a break, the thread itself breaks — the bead
 * at the break hollows to a kumkum ring, the thread segment below it
 * gaps, and a calm label names the bead. A break cannot hide.
 *
 * PRESENTATION ONLY: this component renders the verification result
 * it is handed (`broken` per bead, computed by the caller from the
 * existing verifyChain / verifyAuditChain). It contains no chain
 * math of its own and changes no verification logic.
 *
 * Pure CSS/SVG-free markup; glow steps down under .sanctum-lite
 * (see index.css .mala-* rules) — structure, colours and order are
 * identical on a 2 GB phone.
 */

import React, { useState } from 'react';

export interface MalaBead {
  id: string;
  /** Bead number chip content, e.g. "#3" — the event's own seq label. */
  seqLabel: string;
  title: React.ReactNode;
  detail?: React.ReactNode;
  meta?: React.ReactNode;
  /** Short hash, shown beside the bead (mono). */
  hashShort?: string;
  /** True when chain verification places this bead at/after the break. */
  broken?: boolean;
  /** Optional expandable forensic content (full hash / prev / actor). */
  expandedContent?: React.ReactNode;
}

export const MalaThread: React.FC<{
  beads: MalaBead[];
  tone?: 'light' | 'dark';
  /** Label rendered once, at the first broken bead. */
  breakLabel: string;
  emptyState?: React.ReactNode;
}> = ({ beads, tone = 'light', breakLabel, emptyState }) => {
  const dark = tone === 'dark';
  const [openId, setOpenId] = useState<string | null>(null);
  const firstBroken = beads.findIndex((b) => b.broken);

  if (beads.length === 0) return <>{emptyState ?? null}</>;

  return (
    <ol className="mala-thread" aria-label="Chain of events">
      {beads.map((bead, i) => {
        const isLast = i === beads.length - 1;
        const open = openId === bead.id;
        return (
          <li key={bead.id} className="mala-item">
            {/* rail: thread segment + bead */}
            <div className="mala-rail" aria-hidden="true">
              {!isLast && (
                <span
                  className={`mala-segment ${bead.broken ? 'mala-segment-broken' : ''}`}
                />
              )}
              <span className={`mala-bead ${bead.broken ? 'mala-bead-broken' : ''}`}>
                <span className="mala-bead-seq">{bead.seqLabel.replace('#', '')}</span>
              </span>
            </div>

            {/* content */}
            <div
              className={`mala-body ${dark ? 'mala-body-dark' : ''} ${bead.broken ? 'mala-body-broken' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-bold ${dark ? 'text-amber-100' : 'text-stone-800'}`}
                  >
                    {bead.title}
                  </div>
                  {bead.detail && (
                    <div
                      className={`text-xs mt-0.5 ${dark ? 'text-temple-300' : 'text-stone-600'}`}
                    >
                      {bead.detail}
                    </div>
                  )}
                  {bead.meta && (
                    <div
                      className={`text-[11px] mt-0.5 ${dark ? 'text-temple-400' : 'text-stone-400'}`}
                    >
                      {bead.meta}
                    </div>
                  )}
                  {bead.broken && i === firstBroken && (
                    <div className="mala-break-label" role="status">
                      {breakLabel}
                    </div>
                  )}
                </div>
                {bead.hashShort && (
                  <span
                    className={`font-mono text-[10px] tabular-nums shrink-0 ${
                      bead.broken
                        ? 'text-red-700'
                        : dark
                          ? 'text-emerald-300'
                          : 'text-stone-500'
                    }`}
                  >
                    {bead.hashShort}
                  </span>
                )}
              </div>

              {bead.expandedContent && (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : bead.id)}
                    aria-expanded={open}
                    className={`min-h-[44px] text-[11px] font-bold underline underline-offset-2 cursor-pointer ${
                      dark ? 'text-amber-300' : 'text-amber-700'
                    }`}
                  >
                    {bead.seqLabel} · hash / prev
                  </button>
                  {open && <div className="pb-1">{bead.expandedContent}</div>}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

/**
 * MalaStrip — the compact horizontal mala for verification banners:
 * one small bead per verified event (windowed around the break when
 * the chain is long), so a trustee SEES the thread the verify just
 * walked. Presentation of the caller's ChainVerification only.
 */
export const MalaStrip: React.FC<{
  total: number;
  /** Index of the first broken bead; -1 when the chain is intact. */
  brokenAt: number;
  maxBeads?: number;
}> = ({ total, brokenAt, maxBeads = 48 }) => {
  if (total <= 0) return null;
  let start = 0;
  if (total > maxBeads) {
    start =
      brokenAt >= 0
        ? Math.max(0, Math.min(brokenAt - Math.floor(maxBeads / 2), total - maxBeads))
        : 0;
  }
  const shown = Math.min(total - start, maxBeads);
  return (
    <div className="mala-strip" aria-hidden="true">
      {start > 0 && <span className="mala-strip-gap">···</span>}
      {Array.from({ length: shown }, (_, k) => {
        const idx = start + k;
        const broken = brokenAt >= 0 && idx >= brokenAt;
        return (
          <span
            key={idx}
            className={`mala-strip-bead ${broken ? 'mala-strip-bead-broken' : ''} ${
              idx === brokenAt ? 'mala-strip-bead-break' : ''
            }`}
          />
        );
      })}
      {start + shown < total && <span className="mala-strip-gap">···</span>}
    </div>
  );
};

export default MalaThread;
