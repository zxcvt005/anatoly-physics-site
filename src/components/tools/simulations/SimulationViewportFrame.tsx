'use client';

import { useEffect, useRef, useState } from 'react';

type SimulationViewportFrameProps = {
  /** Width / height of the framed content. */
  aspectRatio: number;
  children: React.ReactNode;
  className?: string;
  /**
   * Fill the host completely; children are sized to the largest
   * aspect-preserving box and centered. The host itself always
   * spans the full scene area so no gap appears beside controls.
   */
  fillHost?: boolean;
};

/**
 * Sizes children to the largest box that fits both available width and height
 * while preserving aspectRatio.
 */
export function SimulationViewportFrame({
  aspectRatio,
  children,
  className = '',
  fillHost = true,
}: SimulationViewportFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const update = (width: number, height: number) => {
      if (width <= 0 || height <= 0 || aspectRatio <= 0) {
        setBox({ width: 0, height: 0 });
        return;
      }

      let nextWidth = width;
      let nextHeight = width / aspectRatio;
      if (nextHeight > height) {
        nextHeight = height;
        nextWidth = height * aspectRatio;
      }

      setBox((prev) =>
        Math.abs(prev.width - nextWidth) < 0.5 &&
        Math.abs(prev.height - nextHeight) < 0.5
          ? prev
          : { width: nextWidth, height: nextHeight },
      );
    };

    update(host.clientWidth, host.clientHeight);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      update(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, [aspectRatio]);

  return (
    <div
      ref={hostRef}
      className={`relative h-full min-h-0 w-full ${
        fillHost ? '' : 'flex items-center justify-center'
      } ${className}`.trim()}
    >
      <div
        className={
          fillHost
            ? 'absolute left-1/2 top-1/2 min-h-0 min-w-0 -translate-x-1/2 -translate-y-1/2 overflow-hidden'
            : 'relative min-h-0 min-w-0 overflow-hidden'
        }
        style={
          box.width > 0
            ? { width: box.width, height: box.height }
            : { width: '100%', height: '100%' }
        }
      >
        {children}
      </div>
    </div>
  );
}
