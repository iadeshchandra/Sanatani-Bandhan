import { useEffect, useState } from 'react';

/**
 * usePrefersReducedMotion — returns true when the user (or OS) asks for
 * reduced motion. Every JS-driven animation in the app must consult this
 * hook and render its final state immediately when true. CSS animations are
 * additionally covered by the kill-switch in `src/styles/motion.css`.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Keep in sync if the user toggles the OS setting mid-session.
    setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export default usePrefersReducedMotion;
