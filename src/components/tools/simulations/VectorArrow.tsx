import { clamp } from '@/lib/tools/simulations/math';

export const VECTOR_COLORS = {
  applied: '#5EEAD4',
  friction: '#F472B6',
  weight: '#FBBF24',
  normal: '#93C5FD',
  along: '#C4B5FD',
  perp: '#7DD3FC',
  acceleration: '#FB923C',
} as const;

export const VECTOR_MIN_LENGTH = 26;
export const VECTOR_MAX_LENGTH = 118;
export const FORCE_PIXELS_PER_NEWTON = 2.15;
export const ACCEL_PIXELS_PER_UNIT = 24;

export function magnitudeToLength(
  magnitude: number,
  scale: number,
  minLength = VECTOR_MIN_LENGTH,
  maxLength = VECTOR_MAX_LENGTH,
): number {
  if (!Number.isFinite(magnitude) || Math.abs(magnitude) < 0.05) {
    return 0;
  }

  return clamp(Math.abs(magnitude) * scale, minLength, maxLength);
}

export function forceVectorLength(newtons: number): number {
  return magnitudeToLength(newtons, FORCE_PIXELS_PER_NEWTON);
}

export function accelerationVectorLength(accel: number): number {
  return magnitudeToLength(accel, ACCEL_PIXELS_PER_UNIT, 22, 90);
}

type VectorArrowProps = {
  id: string;
  color: string;
  label: string;
};

export function VectorArrow({ id, color, label }: VectorArrowProps) {
  return (
    <g data-vector={id} visibility="hidden">
      <line
        data-vector-shaft="true"
        x1="0"
        y1="0"
        x2="40"
        y2="0"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <polygon
        data-vector-head="true"
        points="0,-5 12,0 0,5"
        fill={color}
      />
      <text
        data-vector-label="true"
        fill={color}
        fontSize="13"
        fontWeight="700"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </text>
    </g>
  );
}

export function setVectorArrow(
  root: SVGElement | null,
  id: string,
  options: {
    x: number;
    y: number;
    angleDeg: number;
    length: number;
    label?: string;
    labelSide?: 1 | -1;
  },
): void {
  if (!root) {
    return;
  }

  const group = root.querySelector(`[data-vector="${id}"]`);
  if (!(group instanceof SVGGElement)) {
    return;
  }

  const hidden = options.length <= 1;
  group.setAttribute('visibility', hidden ? 'hidden' : 'visible');
  if (hidden) {
    return;
  }

  const shaft = group.querySelector('[data-vector-shaft="true"]');
  const head = group.querySelector('[data-vector-head="true"]');
  const label = group.querySelector('[data-vector-label="true"]');

  const length = options.length;
  const angle = (options.angleDeg * Math.PI) / 180;
  const tipX = options.x + Math.cos(angle) * length;
  const tipY = options.y + Math.sin(angle) * length;
  const side = options.labelSide ?? 1;
  const labelX = options.x + Math.cos(angle) * (length * 0.58) - Math.sin(angle) * 16 * side;
  const labelY = options.y + Math.sin(angle) * (length * 0.58) + Math.cos(angle) * 16 * side;

  if (shaft instanceof SVGLineElement) {
    shaft.setAttribute('x1', String(options.x));
    shaft.setAttribute('y1', String(options.y));
    shaft.setAttribute('x2', String(tipX));
    shaft.setAttribute('y2', String(tipY));
  }

  if (head instanceof SVGPolygonElement) {
    head.setAttribute(
      'transform',
      `translate(${tipX} ${tipY}) rotate(${options.angleDeg})`,
    );
  }

  if (label instanceof SVGTextElement) {
    if (options.label) {
      label.textContent = options.label;
    }
    label.setAttribute('x', String(labelX));
    label.setAttribute('y', String(labelY));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
  }
}
