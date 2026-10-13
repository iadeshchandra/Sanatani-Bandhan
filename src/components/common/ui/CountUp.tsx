import React, { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';

interface CountUpProps {
  /** Target numeric value. */
  value: number;
  /** Format the in-flight number. Defaults to Indian digit grouping. */
  format?: (n: number) => string;
  /** Tween duration in ms. */
  duration?: number;
  className?: string;
}

/**
 * CountUp — eased number tween for KPI cards (transform/opacity-only motion
 * system companion). Respects `prefers-reduced-motion` by rendering the
 * final value instantly. Re-tweens from the current displayed value when
 * `value` changes. Cleans up its rAF on unmount.
 */
export const CountUp: React.FC<CountUpProps> = ({
  value,
  format = (n: number) => Math.round(n).toLocaleString('en-IN'),
  duration = 700,
  className,
}) => {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState<number>(() => (reduced ? value : 0));
  const fromRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (reduced) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    if (from === value) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic — calm, no overshoot
      const current = from + (value - from) * eased;
      fromRef.current = current;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, reduced]);

  return <span className={className}>{format(display)}</span>;
};

export default CountUp;
