import { useEffect, useRef, useState } from 'react';

export function useScrollSpy(sectionIds: string[], scrollOffset = 96) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? '');
  const tickingRef = useRef(false);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const updateActiveSection = () => {
      const probe = window.scrollY + scrollOffset;
      let current = sectionIds[0];

      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (element && element.offsetTop <= probe) {
          current = id;
        }
      }

      setActiveId((prev) => (prev === current ? prev : current));
      tickingRef.current = false;
    };

    const onScrollOrResize = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [sectionIds, scrollOffset]);

  return activeId;
}
