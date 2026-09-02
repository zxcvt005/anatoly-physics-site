type SimulationToolbarProps = {
  children: React.ReactNode;
};

export function SimulationToolbar({ children }: SimulationToolbarProps) {
  return <div className="flex items-center gap-2">{children}</div>;
}
