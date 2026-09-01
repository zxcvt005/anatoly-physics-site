'use client';

import { useEffect, useRef, useState } from 'react';

type WinnerStage = 'idle' | 'number' | 'title' | 'identity' | 'prize';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useWinnerAnnouncement(nameRevealed: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const nameRevealedRef = useRef(nameRevealed);
  const [inView, setInView] = useState(false);
  const [stage, setStage] = useState<WinnerStage>('idle');

  nameRevealedRef.current = nameRevealed;

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.28, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) {
      return;
    }

    if (prefersReducedMotion()) {
      setStage(nameRevealedRef.current ? 'prize' : 'identity');
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(
          window.setTimeout(() => {
            resolve();
          }, ms),
        );
      });

    void (async () => {
      setStage('number');
      await wait(520);
      if (cancelled) {
        return;
      }

      setStage('title');
      await wait(820);
      if (cancelled) {
        return;
      }

      setStage('identity');

      if (nameRevealedRef.current) {
        await wait(980);
        if (cancelled) {
          return;
        }
        setStage('prize');
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [inView]);

  useEffect(() => {
    if (!nameRevealed || !inView) {
      return;
    }

    if (stage === 'idle' || stage === 'number' || stage === 'title') {
      return;
    }

    if (stage === 'prize') {
      return;
    }

    if (prefersReducedMotion()) {
      setStage('prize');
      return;
    }

    const timer = window.setTimeout(() => {
      setStage('prize');
    }, 980);

    return () => window.clearTimeout(timer);
  }, [inView, nameRevealed, stage]);

  const showNumber = stage !== 'idle';
  const showTitle = stage === 'title' || stage === 'identity' || stage === 'prize';
  const showIdentity = stage === 'identity' || stage === 'prize';
  const showPrize = stage === 'prize';
  const showName = showIdentity && nameRevealed;

  return {
    ref,
    inView,
    showNumber,
    showTitle,
    showIdentity,
    showName,
    showPrize,
  };
}
