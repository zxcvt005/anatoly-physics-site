import type { LucideIcon } from 'lucide-react';
import {
  Aperture,
  Atom,
  CircleDot,
  Cog,
  Dices,
  Droplets,
  Gauge,
  Home,
  Infinity,
  Magnet,
  Move,
  Orbit,
  RotateCw,
  Scale,
  Sparkles,
  Thermometer,
  Trophy,
  Waves,
  Zap,
} from 'lucide-react';
import type { ToolsIconName } from '@/lib/tools/navigation';

const ICONS: Record<ToolsIconName, LucideIcon> = {
  home: Home,
  mechanics: Cog,
  kinematics: Move,
  dynamics: Gauge,
  statics: Scale,
  hydrostatics: Droplets,
  conservation: Infinity,
  molecular: Atom,
  mkt: CircleDot,
  thermodynamics: Thermometer,
  electrodynamics: Zap,
  electrostatics: Sparkles,
  dcCurrent: Zap,
  magneticField: Magnet,
  optics: Aperture,
  oscillations: Waves,
  quantum: Orbit,
  nonPhysics: Dices,
  fortuneWheel: RotateCw,
  summerSchool: Trophy,
};

type ToolsIconProps = {
  name: ToolsIconName;
  className?: string;
};

export function ToolsIcon({ name, className }: ToolsIconProps) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden />;
}
