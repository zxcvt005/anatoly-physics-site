'use client';

import { useEffect, useRef, useState } from 'react';

type SimulationViewportFrameProps = {
  /** Width / height of the framed content. */
  aspectRatio: number;
  children: React.ReactNode;
  className?: string;
};

/**
 * Sizes children to the largest box that fits both available width and height
 * while preserving aspectRatio. Prevents wide workspaces from forcing a tall scene.
 */
export function SimulationViewportFrame({
  aspectRatio,
  children,
  className = '',
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
      className={`flex h-full min-h-0 w-full items-center justify-center ${className}`.trim()}
    >
      <div
        className="relative min-h-0 min-w-0 overflow-hidden"
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
