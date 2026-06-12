import type { Metadata } from 'next';
import { StudentPageClient } from '@/components/tutor/StudentPageClient';
import { getStudentByTokenForPage } from '@/lib/students/get-student-by-token';

interface StudentPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({
  params,
}: StudentPageProps): Promise<Metadata> {
  const { token } = await params;
  const student = await getStudentByTokenForPage(token);

  return {
    title: student
      ? `${student.name} — Личный кабинет`
      : 'Личный кабинет',
    robots: { index: false, follow: false },
  };
}

export default async function StudentPage({ params }: StudentPageProps) {
  const { token } = await params;
  return <StudentPageClient token={token} />;
}
