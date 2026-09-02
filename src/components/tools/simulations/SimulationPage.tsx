import { ToolsBreadcrumb } from '@/components/tools/ToolsBreadcrumb';
import type { ToolsBreadcrumbItem } from '@/lib/tools/navigation';

type SimulationPageProps = {
  title: string;
  subtitle: string;
  breadcrumbs: ToolsBreadcrumbItem[];
  children: React.ReactNode;
};

export function SimulationPage({
  title,
  subtitle,
  breadcrumbs,
  children,
}: SimulationPageProps) {
  return (
    <div className="space-y-6 overflow-x-hidden sm:space-y-7">
      <header>
        <ToolsBreadcrumb items={breadcrumbs} />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          {subtitle}
        </p>
      </header>
      {children}
    </div>
  );
}
