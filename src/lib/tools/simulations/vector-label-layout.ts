export type LabelPoint = { x: number; y: number };

export type TipLabelRequest = {
  id: string;
  text: string;
  tipX: number;
  tipY: number;
  angleDeg: number;
  /** Preferred side of the arrow (perp to shaft). */
  side: 1 | -1;
  /** Preferred shift past/before the tip along the shaft (px). */
  preferredAlong?: number;
};

type Sized = {
  point: LabelPoint;
  width: number;
  height: number;
};

const FONT = 24;
const TIP_GAP = 28;
const PERP_OFFSETS = [0, 8, -8, 14, -14, 20, -20, 28, -28];
const ALONG_OFFSETS = [0, 12, -12, 22, -22, 32, -32, 42, -42, 52, -52];

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function estimateSize(text: string): { width: number; height: number } {
  return {
    width: text.length * FONT * 0.42 + 12,
    height: 22,
  };
}

function boxesOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  margin = 3,
): boolean {
  return !(
    ax + aw / 2 + margin <= bx - bw / 2 ||
    bx + bw / 2 + margin <= ax - aw / 2 ||
    ay + ah / 2 + margin <= by - bh / 2 ||
    by + bh / 2 + margin <= ay - ah / 2
  );
}

/** Natural label anchor: just beside the arrow tip. */
export function tipLabelPoint(
  tipX: number,
  tipY: number,
  angleDeg: number,
  side: 1 | -1,
  perpExtra = 0,
  alongExtra = 0,
): LabelPoint {
  const angle = degToRad(angleDeg);
  const gap = TIP_GAP + perpExtra;
  return {
    x: tipX + Math.cos(angle) * alongExtra - Math.sin(angle) * gap * side,
    y: tipY + Math.sin(angle) * alongExtra + Math.cos(angle) * gap * side,
  };
}

/**
 * Place each label near its own vector tip.
 * On conflict, try small perp/along nudges (and the other side) — never far away.
 */
export function placeLabelsNearTips(
  requests: TipLabelRequest[],
): Record<string, LabelPoint> {
  const occupied: Sized[] = [];
  const result: Record<string, LabelPoint> = {};

  for (const request of requests) {
    if (!request.text) {
      continue;
    }

    const { width, height } = estimateSize(request.text);
    const preferAlong = request.preferredAlong ?? 0;
    const sides: Array<1 | -1> = [
      request.side,
      request.side === 1 ? -1 : 1,
    ];
    const alongs = [preferAlong, ...ALONG_OFFSETS.filter((v) => v !== preferAlong)];

    let bestFree: { point: LabelPoint; cost: number } | null = null;
    let bestBusy: { point: LabelPoint; cost: number } | null = null;

    for (const side of sides) {
      for (const along of alongs) {
        for (const perp of PERP_OFFSETS) {
          const point = tipLabelPoint(
            request.tipX,
            request.tipY,
            request.angleDeg,
            side,
            perp,
            along,
          );
          const base =
            Math.abs(perp) +
            Math.abs(along - preferAlong) * 0.9 +
            Math.abs(along) * 0.25 +
            (side === request.side ? 0 : 10);

          let overlap = 0;
          for (const other of occupied) {
            if (
              boxesOverlap(
                point.x,
                point.y,
                width,
                height,
                other.point.x,
                other.point.y,
                other.width,
                other.height,
              )
            ) {
              overlap += 1;
            }
          }

          if (overlap === 0) {
            if (!bestFree || base < bestFree.cost) {
              bestFree = { point, cost: base };
            }
          } else if (!bestBusy || base + overlap * 80 < bestBusy.cost) {
            bestBusy = { point, cost: base + overlap * 80 };
          }
        }
      }
    }

    const point =
      bestFree?.point ??
      bestBusy?.point ??
      tipLabelPoint(
        request.tipX,
        request.tipY,
        request.angleDeg,
        request.side,
        0,
        preferAlong,
      );

    result[request.id] = point;
    occupied.push({ point, width, height });
  }

  return result;
}

export function worldFromLocal(
  local: LabelPoint,
  origin: LabelPoint,
  planeAngleDeg: number,
): LabelPoint {
  const angle = degToRad(planeAngleDeg);
  return {
    x: origin.x + local.x * Math.cos(angle) - local.y * Math.sin(angle),
    y: origin.y + local.x * Math.sin(angle) + local.y * Math.cos(angle),
  };
}

export function localFromWorld(
  world: LabelPoint,
  origin: LabelPoint,
  planeAngleDeg: number,
): LabelPoint {
  const angle = degToRad(planeAngleDeg);
  const dx = world.x - origin.x;
  const dy = world.y - origin.y;
  return {
    x: dx * Math.cos(angle) + dy * Math.sin(angle),
    y: -dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}
