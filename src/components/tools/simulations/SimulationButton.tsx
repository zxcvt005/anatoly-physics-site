import type { ButtonHTMLAttributes } from 'react';

type SimulationButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function SimulationButton({
  variant = 'ghost',
  className = '',
  type = 'button',
  children,
  ...props
}: SimulationButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'border-[#3166F0]/30 bg-[#3166F0]/15 text-white hover:bg-[#3166F0]/25'
      : 'border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700 hover:text-white';

  return (
    <button
      type={type}
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
