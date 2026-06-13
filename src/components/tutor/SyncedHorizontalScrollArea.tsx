'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface SyncedHorizontalScrollAreaProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SyncedHorizontalScrollArea({
  children,
  className = '',
  contentClassName = '',
}: SyncedHorizontalScrollAreaProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackInnerWidth, setTrackInnerWidth] = useState(0);
  const [showTrack, setShowTrack] = useState(false);

  const updateMetrics = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const scrollWidth = content.scrollWidth;
    const clientWidth = content.clientWidth;
    setTrackInnerWidth(scrollWidth);
    setShowTrack(scrollWidth > clientWidth + 1);
  }, []);

  useEffect(() => {
    updateMetrics();

    const content = contentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(content);

    for (const child of content.children) {
      observer.observe(child);
    }

    return () => observer.disconnect();
  }, [updateMetrics, children]);

  const syncFromContent = useCallback(() => {
    const content = contentRef.current;
    const track = trackRef.current;
    if (!content || !track || track.scrollLeft === content.scrollLeft) return;
    track.scrollLeft = content.scrollLeft;
  }, []);

  const syncFromTrack = useCallback(() => {
    const content = contentRef.current;
    const track = trackRef.current;
    if (!content || !track || content.scrollLeft === track.scrollLeft) return;
    content.scrollLeft = track.scrollLeft;
  }, []);

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div
          ref={contentRef}
          onScroll={syncFromContent}
          className={`overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${contentClassName}`}
        >
          {children}
        </div>
      </div>

      {showTrack && (
        <div
          ref={trackRef}
          onScroll={syncFromTrack}
          className="shrink-0 overflow-x-auto overflow-y-hidden border-t border-zinc-800 bg-zinc-950"
          aria-hidden
        >
          <div style={{ width: trackInnerWidth, height: 1 }} />
        </div>
      )}
    </div>
  );
}
