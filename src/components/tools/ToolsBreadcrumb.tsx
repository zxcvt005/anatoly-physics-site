import Link from 'next/link';
import type { ToolsBreadcrumbItem } from '@/lib/tools/navigation';

type ToolsBreadcrumbProps = {
  items: ToolsBreadcrumbItem[];
};

export function ToolsBreadcrumb({ items }: ToolsBreadcrumbProps) {
  return (
    <nav
      aria-label="Навигационная цепочка"
      className="mb-5 text-sm text-zinc-500 lg:mb-1.5 lg:text-xs"
    >
      <ol className="flex flex-wrap items-center gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.path} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-zinc-600" aria-hidden>
                  /
                </span>
              )}
              {isLast ? (
                <span className="text-zinc-300">{item.title}</span>
              ) : (
                <Link
                  href={item.path}
                  className="transition hover:text-white"
                >
                  {item.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
