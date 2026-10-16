/**
 * Sanatani Bandhan — OrgLogo (Pillar 1)
 *
 * Shared org identity mark. Renders the uploaded logo when available,
 * otherwise a dignified SVG monogram (first letter of the org name inside
 * a lotus-petal frame, saffron on deep maroon). NEVER renders a broken
 * image — the monogram is the intentional fallback, not a placeholder.
 */
import React, { useState } from 'react';
import { monogramLetter } from '../../lib/orgBranding';

const MAROON_DARK = '#431407';
const MAROON = '#7c2d12';
const SAFFRON = '#fbbf24';
const GOLD = '#f59e0b';
const CREAM = '#fffbeb';

/**
 * Lotus/paisley-inspired monogram: 12 petals ring the initial letter,
 * with gold dots between petals — saffron on deep maroon.
 */
export const OrgMonogram: React.FC<{
  name: string;
  size?: number;
  className?: string;
  title?: string;
}> = ({ name, size = 40, className = '', title }) => {
  const letter = monogramLetter(name);
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title || `${name} monogram`}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <radialGradient id={`mono-bg-${size}`} cx="50%" cy="38%" r="72%">
          <stop offset="0%" stopColor={MAROON} />
          <stop offset="100%" stopColor={MAROON_DARK} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#mono-bg-${size})`} />
      {/* lotus petals */}
      {petals.map((deg) => (
        <g key={deg} transform={`rotate(${deg} 50 50)`}>
          <ellipse
            cx="50"
            cy="15"
            rx="6.5"
            ry="11"
            fill="none"
            stroke={GOLD}
            strokeWidth="1.6"
            opacity="0.85"
          />
          <circle cx="50" cy="27.5" r="1.4" fill={SAFFRON} opacity="0.9" />
        </g>
      ))}
      {/* inner gold ring */}
      <circle cx="50" cy="50" r="34" fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.7" />
      <circle cx="50" cy="50" r="31.5" fill="none" stroke={SAFFRON} strokeWidth="0.6" opacity="0.5" />
      {/* initial letter */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={letter.length > 1 ? 26 : 34}
        fontWeight="800"
        fill={letter === 'ॐ' ? SAFFRON : CREAM}
        fontFamily="'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Bengali', system-ui, sans-serif"
      >
        {letter}
      </text>
    </svg>
  );
};

interface OrgLogoProps {
  orgId?: string;
  name: string;
  logoUrl?: string | null;
  size?: number;
  rounded?: 'full' | 'xl' | 'none';
  className?: string;
  withRing?: boolean;
}

/**
 * OrgLogo — logo image with automatic monogram fallback.
 * If the image fails to load (offline, deleted), swaps to the monogram
 * instead of showing a broken image.
 */
export const OrgLogo: React.FC<OrgLogoProps> = ({
  name,
  logoUrl,
  size = 40,
  rounded = 'full',
  className = '',
  withRing = true,
}) => {
  const [failed, setFailed] = useState(false);
  const radius = rounded === 'full' ? '50%' : rounded === 'xl' ? '22%' : '0';
  const ring = withRing
    ? { boxShadow: '0 0 0 2px rgba(245,158,11,0.55), 0 2px 8px rgba(0,0,0,0.25)' }
    : {};

  if (!logoUrl || failed) {
    return (
      <span
        className={className}
        style={{ borderRadius: radius, overflow: 'hidden', display: 'inline-block', ...ring }}
      >
        <OrgMonogram name={name} size={size} />
      </span>
    );
  }
  return (
    <img
      src={logoUrl}
      alt={`${name} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: 'cover',
        background: '#fff',
        display: 'block',
        flexShrink: 0,
        ...ring,
      }}
    />
  );
};

export default OrgLogo;
