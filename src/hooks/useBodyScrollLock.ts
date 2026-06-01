import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';

function lockBodyScroll() {
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow;
    originalOverflow = '';
  }
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [locked]);
}
