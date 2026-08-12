import { useCallback, useEffect, useState } from 'react';

/** Matches `scroll-mt-20` (5rem) and fixed navbar clearance. */
export const LANDING_NAV_SCROLL_OFFSET = 80;

export function useScrollSpy(
  sectionIds: readonly string[],
  scrollOffset = LANDING_NAV_SCROLL_OFFSET,
) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? '');

  const setActiveSection = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? prev : id));
  }, []);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const visibleRatios = new Map<string, number>();

    const resolveActiveSection = () => {
      let nextId = sectionIds[0];
      let bestRatio = -1;

      for (const id of sectionIds) {
        const ratio = visibleRatios.get(id) ?? 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          nextId = id;
        }
      }

      if (bestRatio <= 0) {
        for (const id of sectionIds) {
          const element = document.getElementById(id);
          if (!element) continue;

          if (element.getBoundingClientRect().top - scrollOffset <= 0) {
            nextId = id;
          }
        }
      }

      setActiveId((prev) => (prev === nextId ? prev : nextId));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleRatios.set(entry.target.id, entry.intersectionRatio);
        }
        resolveActiveSection();
      },
      {
        root: null,
        rootMargin: `-${scrollOffset}px 0px -55% 0px`,
        threshold: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    const observedElements: HTMLElement[] = [];

    for (const id of sectionIds) {
      const element = document.getElementById(id);
      if (!element) continue;

      observedElements.push(element);
      observer.observe(element);
    }

    if (observedElements.length === 0) {
      return;
    }

    const onScrollOrResize = () => resolveActiveSection();

    resolveActiveSection();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [sectionIds, scrollOffset]);

  return { activeId, setActiveSection };
}
