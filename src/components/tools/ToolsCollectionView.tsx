import { ToolCard } from '@/components/tools/ToolCard';
import { ToolsBreadcrumb } from '@/components/tools/ToolsBreadcrumb';
import { ToolsEmptyState } from '@/components/tools/ToolsEmptyState';
import {
  getBreadcrumbs,
  getEmptyStateDescription,
  type ToolsNavItem,
} from '@/lib/tools/navigation';

type ToolsCollectionViewProps = {
  item: ToolsNavItem;
};

export function ToolsCollectionView({ item }: ToolsCollectionViewProps) {
  const breadcrumbs = getBreadcrumbs(item.path);
  const children = item.children ?? [];

  return (
    <div className="space-y-8">
      <header>
        <ToolsBreadcrumb items={breadcrumbs} />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {item.title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          {item.subtitle}
        </p>
      </header>

      {children.length > 0 ? (
        <section>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {children.map((child) => (
              <ToolCard key={child.id} item={child} variant="child" />
            ))}
          </div>
        </section>
      ) : (
        <ToolsEmptyState
          sectionLabel={item.title}
          description={getEmptyStateDescription(item)}
        />
      )}
    </div>
  );
}
