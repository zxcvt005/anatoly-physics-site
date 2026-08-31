import { groupHomeworkBySection } from '@/lib/tests/topic-sections';
import type { StudentHomeworkListItem } from '@/types/tests';

export const UNSECTIONED_SECTION_SLUG = '__unsectioned__';

export function sectionIdToSlug(sectionId: string | null): string {
  return sectionId ?? UNSECTIONED_SECTION_SLUG;
}

export function slugToSectionId(slug: string): string | null {
  return slug === UNSECTIONED_SECTION_SLUG ? null : slug;
}

export function testsHomePath(token: string): string {
  return `/student/${token}/tests`;
}

export function testsSectionPath(token: string, sectionId: string | null): string {
  return `/student/${token}/tests/section/${sectionIdToSlug(sectionId)}`;
}

export function testsSessionPath(token: string): string {
  return `/student/${token}/tests/session`;
}

export interface TestsNavItem {
  id: string;
  label: string;
  href: string;
  children?: TestsNavItem[];
}

export function buildTestsNavigation(
  token: string,
  homework: StudentHomeworkListItem[],
): TestsNavItem[] {
  const home: TestsNavItem = {
    id: 'home',
    label: 'Главная',
    href: testsHomePath(token),
  };

  const groups = groupHomeworkBySection(homework);

  const sections: TestsNavItem[] = groups.map((group) => {
    const sectionSlug = sectionIdToSlug(group.sectionId);
    const sectionHref = testsSectionPath(token, group.sectionId);

    const children: TestsNavItem[] = group.items.map((item) => ({
      id: item.topicId,
      label: item.topicTitle,
      href: `${sectionHref}#topic-${item.topicId}`,
    }));

    return {
      id: sectionSlug,
      label: group.sectionTitle,
      href: sectionHref,
      children: children.length > 0 ? children : undefined,
    };
  });

  return [home, ...sections];
}

export function normalizeTestsPath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}

export function isTestsNavItemActive(href: string, pathname: string): boolean {
  const normalizedHref = normalizeTestsPath(href.split('#')[0] ?? href);
  const normalizedPath = normalizeTestsPath(pathname);

  if (normalizedHref.endsWith('/tests')) {
    return normalizedPath === normalizedHref;
  }

  return (
    normalizedPath === normalizedHref ||
    normalizedPath.startsWith(`${normalizedHref}/`)
  );
}
