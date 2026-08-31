import { ToolsLayout } from '@/components/tools/ToolsLayout';

export default function ToolsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToolsLayout>{children}</ToolsLayout>;
}
