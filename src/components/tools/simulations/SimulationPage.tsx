import { ToolsBreadcrumb } from '@/components/tools/ToolsBreadcrumb';
import type { ToolsBreadcrumbItem } from '@/lib/tools/navigation';

type SimulationPageProps = {
  title: string;
  subtitle: string;
  breadcrumbs: ToolsBreadcrumbItem[];
  children: React.ReactNode;
  /**
   * Desktop: fill the tools workspace viewport and avoid page scroll.
   * Mobile: keep natural document flow and allow scrolling.
   */
  fitViewport?: boolean;
};

export function SimulationPage({
  title,
  subtitle,
  breadcrumbs,
  children,
  fitViewport = false,
}: SimulationPageProps) {
  if (!fitViewport) {
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

  return (
    <div className="flex min-h-0 flex-col overflow-x-hidden max-lg:space-y-5 lg:absolute lg:inset-0 lg:overflow-hidden">
      <header className="shrink-0">
        <ToolsBreadcrumb items={breadcrumbs} />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-xl lg:leading-tight">
          {title}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:hidden">
          {subtitle}
        </p>
      </header>
      <div className="mt-2 min-h-0 max-lg:mt-4 lg:mt-2 lg:flex-1 lg:overflow-hidden">
        {children}
      </div>
    </div>
  );
}
