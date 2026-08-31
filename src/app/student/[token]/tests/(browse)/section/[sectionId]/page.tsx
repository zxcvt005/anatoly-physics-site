import { TestsSectionPage } from '@/components/student-tests/TestsSectionPage';

interface SectionPageProps {
  params: Promise<{ token: string; sectionId: string }>;
}

export default async function StudentTestsSectionPage({ params }: SectionPageProps) {
  const { sectionId } = await params;
  return <TestsSectionPage sectionSlug={sectionId} />;
}
