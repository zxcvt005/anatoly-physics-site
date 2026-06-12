'use client';

interface CollapsiblePanelProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsiblePanel({
  open,
  children,
  className = '',
}: CollapsiblePanelProps) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      } ${className}`}
    >
      <div className="overflow-hidden">
        <div
          className={`transition-opacity duration-300 ease-in-out ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
