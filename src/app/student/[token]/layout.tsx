import { StudentTokenLayoutClient } from './StudentTokenLayoutClient';

export default async function StudentTokenLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <StudentTokenLayoutClient token={token}>{children}</StudentTokenLayoutClient>
  );
}
