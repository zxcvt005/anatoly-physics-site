import { LANDING_NAV_SCROLL_OFFSET } from '@/hooks/useScrollSpy';

export function scrollToLandingSection(
  id: string,
  scrollOffset = LANDING_NAV_SCROLL_OFFSET,
) {
  const element = document.getElementById(id);
  if (!element) return false;

  const top =
    element.getBoundingClientRect().top + window.scrollY - scrollOffset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: 'smooth',
  });

  return true;
}
