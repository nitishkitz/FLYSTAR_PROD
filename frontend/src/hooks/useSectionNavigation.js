import { useCallback } from 'react';

export function useSectionNavigation() {
  return useCallback((id, options = {}) => {
    const target = document.getElementById(id);
    if (!target) return false;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: reducedMotion || options.instant ? 'auto' : 'smooth',
      block: 'start',
    });

    if (window.history?.replaceState) {
      window.history.replaceState(null, '', `#${id}`);
    }
    return true;
  }, []);
}
