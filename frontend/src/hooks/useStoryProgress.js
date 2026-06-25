import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useStoryProgress(containerRef, enabled, onProgress) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return undefined;

    const state = { progress: 0 };
    const tween = gsap.to(state, {
      progress: 1,
      ease: 'none',
      onUpdate: () => onProgress(state.progress),
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.55,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [containerRef, enabled, onProgress]);
}
