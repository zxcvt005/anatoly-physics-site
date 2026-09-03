export type LabelPoint = {
  x: number;
  y: number;
};

export type LabelRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type VectorLabelRequest = {
  id: string;
  text: string;
  originX: number;
  originY: number;
  tipX: number;
  tipY: number;
  angleDeg: number;
  length: number;
  /** Lower number = higher priority (placed first). */
  priority: number;
  preferredSide: 1 | -1;
  /** Preferred fraction along the shaft (0 origin → 1 tip). */
  preferredAlongFrac?: number;
};

export type VectorLabelLayoutInput = {
  requests: VectorLabelRequest[];
  obstacles: LabelRect[];
  bounds: LabelRect;
  previous: Record<string, LabelPoint | undefined>;
  /** Used for surface checks via localFromWorld (0 when packing in plane-local space). */
  planeAngleDeg: number;
};

type SizedPlacement = {
  id: string;
  point: LabelPoint;
  size: { width: number; height: number };
  priority: number;
  request: VectorLabelRequest;
};

type Candidate = {
  point: LabelPoint;
  side: 1 | -1;
  gapScale: number;
  alongFrac: number;
};

const LABEL_FONT_SIZE = 24;
const LABEL_CHAR_WIDTH = 0.68;
const LABEL_PAD_X = 16;
const LABEL_PAD_Y = 14;
const LABEL_LINE_HEIGHT = 1.4;
const OVERLAP_COST = 12_000;
const OUT_OF_BOUNDS_COST = 4_000;
const SURFACE_COST = 2_200;
const DISTANCE_COST = 1.1;
const SIDE_SWITCH_COST = 28;
const PREVIOUS_COST = 0.2;
const ALONG_BIAS_COST = 55;
const GAP_SCALES = [0.55, 0.75, 1, 1.25, 1.55, 1.9, 2.3];
const ALONG_FRACS = [0.28, 0.4, 0.52, 0.64, 0.76, 0.88, 1.02, 1.14];
const TIP_ALONGS = [6, 16, 28, 42, 58];
const TIP_GAPS = [14, 26, 40, 56, 72];
const TIP_POLAR_RADII = [22, 38, 54, 72];
const TIP_POLAR_BEARINGS = [-90, -60, -30, 0, 30, 60, 90, 120, 150, 180, -120, -150];

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function estimateLabelSize(text: string): { width: number; height: number } {
  const lines = text.split('\n');
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    width: longest * LABEL_FONT_SIZE * LABEL_CHAR_WIDTH + LABEL_PAD_X * 2,
    height: lines.length * LABEL_FONT_SIZE * LABEL_LINE_HEIGHT + LABEL_PAD_Y * 2,
  };
}

export function rectFromCenter(
  center: LabelPoint,
  size: { width: number; height: number },
): LabelRect {
  return {
    left: center.x - size.width / 2,
    right: center.x + size.width / 2,
    top: center.y - size.height / 2,
    bottom: center.y + size.height / 2,
  };
}

export function rectsOverlap(a: LabelRect, b: LabelRect, margin = 6): boolean {
  return !(
    a.right + margin <= b.left ||
    b.right + margin <= a.left ||
    a.bottom + margin <= b.top ||
    b.bottom + margin <= a.top
  );
}

function rectFullyInside(inner: LabelRect, outer: LabelRect): boolean {
  return (
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.top >= outer.top &&
    inner.bottom <= outer.bottom
  );
}

function distance(a: LabelPoint, b: LabelPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function localFromWorld(
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

function candidatePoint(
  request: VectorLabelRequest,
  alongFrac: number,
  gap: number,
  side: 1 | -1,
): LabelPoint {
  const angle = degToRad(request.angleDeg);
  const along = request.length * alongFrac;
  return {
    x: request.originX + Math.cos(angle) * along - Math.sin(angle) * gap * side,
    y: request.originY + Math.sin(angle) * along + Math.cos(angle) * gap * side,
  };
}

function tipCandidate(
  request: VectorLabelRequest,
  tipAlong: number,
  tipGap: number,
  side: 1 | -1,
): LabelPoint {
  const angle = degToRad(request.angleDeg);
  return {
    x: request.tipX + Math.cos(angle) * tipAlong - Math.sin(angle) * tipGap * side,
    y: request.tipY + Math.sin(angle) * tipAlong + Math.cos(angle) * tipGap * side,
  };
}

function tipPolarCandidate(
  request: VectorLabelRequest,
  radius: number,
  bearingDeg: number,
): LabelPoint {
  const angle = degToRad(request.angleDeg + bearingDeg);
  return {
    x: request.tipX + Math.cos(angle) * radius,
    y: request.tipY + Math.sin(angle) * radius,
  };
}

function preferredPoint(request: VectorLabelRequest): LabelPoint {
  return candidatePoint(
    request,
    request.preferredAlongFrac ?? 0.72,
    28,
    request.preferredSide,
  );
}

function hasHardCollision(
  rect: LabelRect,
  occupied: LabelRect[],
  obstacles: LabelRect[],
): boolean {
  for (const other of occupied) {
    if (rectsOverlap(rect, other)) {
      return true;
    }
  }
  for (const obstacle of obstacles) {
    if (rectsOverlap(rect, obstacle)) {
      return true;
    }
  }
  return false;
}

function scoreCandidate(
  request: VectorLabelRequest,
  point: LabelPoint,
  side: 1 | -1,
  gapScale: number,
  alongFrac: number,
  rect: LabelRect,
  occupied: LabelRect[],
  obstacles: LabelRect[],
  bounds: LabelRect,
  previous: LabelPoint | undefined,
  planeOrigin: LabelPoint,
  planeAngleDeg: number,
): number {
  let score = 0;
  const preferred = preferredPoint(request);
  score += distance(point, preferred) * DISTANCE_COST;
  score += Math.abs(gapScale - 1) * 18;
  score += Math.abs(alongFrac - (request.preferredAlongFrac ?? 0.72)) * ALONG_BIAS_COST;

  if (side !== request.preferredSide) {
    score += SIDE_SWITCH_COST;
  }

  if (previous) {
    score += distance(point, previous) * PREVIOUS_COST;
  }

  const local = localFromWorld(point, planeOrigin, planeAngleDeg);
  // Keep non-weight labels above the plane surface (local y≈0).
  if (request.id !== 'weight' && local.y > -14) {
    score += OVERLAP_COST;
  } else if (local.y > -16) {
    score += SURFACE_COST + (local.y + 16) * 35;
  }

  if (!rectFullyInside(rect, bounds)) {
    score += OUT_OF_BOUNDS_COST;
  }

  if (hasHardCollision(rect, occupied, obstacles)) {
    score += OVERLAP_COST;
  }

  // Strongly discourage stacking parallel-force labels on the same horizontal/vertical band.
  for (const other of occupied) {
    const cx = (other.left + other.right) / 2;
    const cy = (other.top + other.bottom) / 2;
    const dx = Math.abs(point.x - cx);
    const dy = Math.abs(point.y - cy);
    if (dx < 160 && dy < 34) {
      score += 1_800 + (34 - dy) * 40;
    }
  }

  return score;
}

function collectCandidates(request: VectorLabelRequest): Candidate[] {
  const sides: Array<1 | -1> = [
    request.preferredSide,
    request.preferredSide === 1 ? -1 : 1,
  ];
  const out: Candidate[] = [];
  const allowBelowSurface = request.id === 'weight';

  const pushCandidate = (candidate: Candidate) => {
    if (!allowBelowSurface && candidate.point.y > -14) {
      return;
    }
    out.push(candidate);
  };

  for (const side of sides) {
    for (const gapScale of GAP_SCALES) {
      const gap = 26 * gapScale;
      for (const alongFrac of ALONG_FRACS) {
        pushCandidate({
          point: candidatePoint(request, alongFrac, gap, side),
          side,
          gapScale,
          alongFrac,
        });
      }
    }

    for (const tipAlong of TIP_ALONGS) {
      for (const tipGap of TIP_GAPS) {
        pushCandidate({
          point: tipCandidate(request, tipAlong, tipGap, side),
          side,
          gapScale: 1.4,
          alongFrac: 1.1,
        });
      }
    }
  }

  for (const radius of TIP_POLAR_RADII) {
    for (const bearing of TIP_POLAR_BEARINGS) {
      const side: 1 | -1 =
        bearing >= 0 ? request.preferredSide : request.preferredSide === 1 ? -1 : 1;
      pushCandidate({
        point: tipPolarCandidate(request, radius, bearing),
        side,
        gapScale: 1.6,
        alongFrac: 1.05,
      });
    }
  }

  // Guaranteed above-surface fan around the origin for crowded incline diagrams.
  if (!allowBelowSurface) {
    for (const radius of [48, 72, 96, 120, 150]) {
      for (const bearing of [-160, -130, -100, -70, -40, -20, 20, 40, 70, 100, 130, 160]) {
        pushCandidate({
          point: {
            x: request.originX + Math.cos(degToRad(bearing)) * radius,
            y: request.originY + Math.sin(degToRad(bearing)) * radius,
          },
          side: bearing >= 0 ? 1 : -1,
          gapScale: 1.8,
          alongFrac: 0.5,
        });
      }
    }
  }

  return out;
}

function overlapPush(
  movable: LabelRect,
  fixed: LabelRect,
): { dx: number; dy: number } {
  const overlapX =
    Math.min(movable.right, fixed.right) - Math.max(movable.left, fixed.left);
  const overlapY =
    Math.min(movable.bottom, fixed.bottom) - Math.max(movable.top, fixed.top);
  if (!(overlapX > 0 && overlapY > 0)) {
    return { dx: 0, dy: 0 };
  }

  const cxM = (movable.left + movable.right) / 2;
  const cyM = (movable.top + movable.bottom) / 2;
  const cxF = (fixed.left + fixed.right) / 2;
  const cyF = (fixed.top + fixed.bottom) / 2;

  if (overlapX <= overlapY) {
    const dir = cxM >= cxF ? 1 : -1;
    return { dx: (overlapX + 6) * dir, dy: 0 };
  }
  const dir = cyM >= cyF ? 1 : -1;
  return { dx: 0, dy: (overlapY + 6) * dir };
}

function angleDeltaDeg(a: number, b: number) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) {
    d = 360 - d;
  }
  return d;
}

function pushAlongPerpendicular(
  placement: SizedPlacement,
  side: 1 | -1,
  distancePx: number,
  bounds: LabelRect,
) {
  const angle = degToRad(placement.request.angleDeg);
  placement.point = {
    x: clamp(
      placement.point.x - Math.sin(angle) * distancePx * side,
      bounds.left + 24,
      bounds.right - 24,
    ),
    y: clamp(
      placement.point.y + Math.cos(angle) * distancePx * side,
      bounds.top + 20,
      bounds.bottom - 20,
    ),
  };
}

function separateOverlaps(
  placements: SizedPlacement[],
  obstacles: LabelRect[],
  bounds: LabelRect,
) {
  for (let iter = 0; iter < 36; iter += 1) {
    let moved = false;

    for (let i = 0; i < placements.length; i += 1) {
      for (let j = i + 1; j < placements.length; j += 1) {
        const a = placements[i];
        const b = placements[j];
        if (!rectsOverlap(rectFromCenter(a.point, a.size), rectFromCenter(b.point, b.size), 4)) {
          continue;
        }

        const movable = a.priority <= b.priority ? b : a;
        const fixed = movable === a ? b : a;
        const before = { ...movable.point };
        const push = overlapPush(
          rectFromCenter(movable.point, movable.size),
          rectFromCenter(fixed.point, fixed.size),
        );
        movable.point = {
          x: clamp(movable.point.x + push.dx, bounds.left + 24, bounds.right - 24),
          y: clamp(movable.point.y + push.dy, bounds.top + 20, bounds.bottom - 20),
        };

        // If still overlapping (or axis push was clamped), escape along vector normal.
        if (
          rectsOverlap(
            rectFromCenter(movable.point, movable.size),
            rectFromCenter(fixed.point, fixed.size),
            4,
          )
        ) {
          const parallel =
            angleDeltaDeg(movable.request.angleDeg, fixed.request.angleDeg) < 18 ||
            Math.abs(angleDeltaDeg(movable.request.angleDeg, fixed.request.angleDeg) - 180) < 18;
          const side =
            movable.request.preferredSide === fixed.request.preferredSide
              ? ((-movable.request.preferredSide) as 1 | -1)
              : movable.request.preferredSide;
          pushAlongPerpendicular(movable, side, parallel ? 22 : 14, bounds);
        }

        if (
          Math.hypot(movable.point.x - before.x, movable.point.y - before.y) > 0.2
        ) {
          moved = true;
        }
      }
    }

    for (const placement of placements) {
      const rect = rectFromCenter(placement.point, placement.size);
      for (const obstacle of obstacles) {
        if (!rectsOverlap(rect, obstacle, 2)) {
          continue;
        }
        const push = overlapPush(rect, obstacle);
        placement.point = {
          x: clamp(placement.point.x + push.dx, bounds.left + 24, bounds.right - 24),
          y: clamp(placement.point.y + push.dy, bounds.top + 20, bounds.bottom - 20),
        };
        moved = true;
      }
    }

    if (!moved) {
      break;
    }
  }
}

function clearRemainingLabelOverlaps(
  placements: SizedPlacement[],
  bounds: LabelRect,
  obstacles: LabelRect[],
) {
  const origin = placements[0]?.request
    ? { x: placements[0].request.originX, y: placements[0].request.originY }
    : { x: 0, y: -54 };

  for (let iter = 0; iter < 8; iter += 1) {
    let moved = false;
    const ordered = [...placements].sort((a, b) => b.priority - a.priority);

    for (const movable of ordered) {
      const locked = placements
        .filter((item) => item.id !== movable.id)
        .map((item) => rectFromCenter(item.point, item.size));

      const underSurface =
        movable.request.id !== 'weight' && movable.point.y > -20;
      const colliding = hasHardCollision(
        rectFromCenter(movable.point, movable.size),
        locked,
        obstacles,
      );

      if (!underSurface && !colliding) {
        continue;
      }

      let best: { point: LabelPoint; score: number } | null = null;
      const radii = [78, 102, 128, 156, 186, 220, 255, 295];
      const bearings = [
        -170, -150, -130, -110, -90, -70, -50, -30, -15, 15, 30, 50, 70, 90, 110, 130, 150, 170,
      ];

      for (const radius of radii) {
        for (const bearing of bearings) {
          const point = {
            x: origin.x + Math.cos(degToRad(bearing)) * radius,
            y: origin.y + Math.sin(degToRad(bearing)) * radius,
          };
          if (movable.request.id !== 'weight' && point.y > -20) {
            continue;
          }
          const rect = rectFromCenter(point, movable.size);
          if (!rectFullyInside(rect, bounds)) {
            continue;
          }
          if (hasHardCollision(rect, locked, obstacles)) {
            continue;
          }
          const preferred = preferredPoint(movable.request);
          const score =
            distance(point, preferred) +
            distance(point, movable.point) * 0.35 +
            Math.abs(bearing) * 0.08;
          if (!best || score < best.score) {
            best = { point, score };
          }
        }
      }

      // Tip-linked slots as secondary options.
      if (!best) {
        for (const candidate of collectCandidates(movable.request)) {
          const rect = rectFromCenter(candidate.point, movable.size);
          if (hasHardCollision(rect, locked, obstacles)) {
            continue;
          }
          if (!rectFullyInside(rect, bounds)) {
            continue;
          }
          const score = distance(candidate.point, preferredPoint(movable.request));
          if (!best || score < best.score) {
            best = { point: candidate.point, score };
          }
        }
      }

      if (best) {
        movable.point = { ...best.point };
        moved = true;
      } else {
        // Last resort: walk upward/outward until the box is free.
        let placed = false;
        for (let step = 0; step < 16 && !placed; step += 1) {
          const point = {
            x: clamp(
              origin.x + (movable.priority - 3.5) * 78 + step * 36 * (movable.priority % 2 === 0 ? 1 : -1),
              bounds.left + 30,
              bounds.right - 30,
            ),
            y: clamp(
              origin.y - 82 - movable.priority * 30 - step * 26,
              bounds.top + 24,
              -28,
            ),
          };
          const rect = rectFromCenter(point, movable.size);
          if (hasHardCollision(rect, locked, obstacles)) {
            continue;
          }
          movable.point = point;
          placed = true;
          moved = true;
        }
        if (!placed) {
          movable.point = {
            x: clamp(origin.x + (movable.priority - 3.5) * 90, bounds.left + 30, bounds.right - 30),
            y: clamp(origin.y - 100 - movable.priority * 36, bounds.top + 24, -28),
          };
          moved = true;
        }
      }
    }

    if (!moved) {
      break;
    }
  }
}

function resolveByReplacing(
  placements: SizedPlacement[],
  obstacles: LabelRect[],
  bounds: LabelRect,
  planeOrigin: LabelPoint,
  planeAngleDeg: number,
  previous: Record<string, LabelPoint | undefined>,
) {
  // Lowest priority first: try to find a free candidate given higher-priority locks.
  const byPriorityDesc = [...placements].sort((a, b) => b.priority - a.priority);

  for (const movable of byPriorityDesc) {
    const locked = placements
      .filter((item) => item.id !== movable.id)
      .map((item) => rectFromCenter(item.point, item.size));

    if (!hasHardCollision(rectFromCenter(movable.point, movable.size), locked, obstacles)) {
      continue;
    }

    let bestFree: { point: LabelPoint; score: number } | null = null;
    for (const candidate of collectCandidates(movable.request)) {
      const rect = rectFromCenter(candidate.point, movable.size);
      const score = scoreCandidate(
        movable.request,
        candidate.point,
        candidate.side,
        candidate.gapScale,
        candidate.alongFrac,
        rect,
        locked,
        obstacles,
        bounds,
        previous[movable.id],
        planeOrigin,
        planeAngleDeg,
      );
      if (score < OVERLAP_COST && (!bestFree || score < bestFree.score)) {
        bestFree = { point: candidate.point, score };
      }
    }

    if (bestFree) {
      movable.point = { ...bestFree.point };
    }
  }
}

export function layoutVectorLabels(
  input: VectorLabelLayoutInput,
  planeOrigin: LabelPoint,
): Record<string, LabelPoint> {
  const ordered = [...input.requests].sort((a, b) => a.priority - b.priority);
  const sized: SizedPlacement[] = [];
  const occupied: LabelRect[] = [];

  for (const request of ordered) {
    if (!(request.length > 1) || request.text.length === 0) {
      continue;
    }

    const size = estimateLabelSize(request.text);
    const previous = input.previous[request.id];
    const candidates = collectCandidates(request);

    let bestFree: { point: LabelPoint; score: number } | null = null;
    let bestAny: { point: LabelPoint; score: number } | null = null;

    for (const candidate of candidates) {
      const rect = rectFromCenter(candidate.point, size);
      const score = scoreCandidate(
        request,
        candidate.point,
        candidate.side,
        candidate.gapScale,
        candidate.alongFrac,
        rect,
        occupied,
        input.obstacles,
        input.bounds,
        previous,
        planeOrigin,
        input.planeAngleDeg,
      );

      if (!bestAny || score < bestAny.score) {
        bestAny = { point: candidate.point, score };
      }

      if (score < OVERLAP_COST && (!bestFree || score < bestFree.score)) {
        bestFree = { point: candidate.point, score };
      }
    }

    const chosen = bestFree?.point ?? bestAny?.point ?? preferredPoint(request);
    sized.push({
      id: request.id,
      point: { ...chosen },
      size,
      priority: request.priority,
      request,
    });
    occupied.push(rectFromCenter(chosen, size));
  }

  separateOverlaps(sized, input.obstacles, input.bounds);
  resolveByReplacing(
    sized,
    input.obstacles,
    input.bounds,
    planeOrigin,
    input.planeAngleDeg,
    input.previous,
  );
  separateOverlaps(sized, input.obstacles, input.bounds);
  clearRemainingLabelOverlaps(sized, input.bounds, input.obstacles);

  const placements: Record<string, LabelPoint> = {};
  for (const item of sized) {
    placements[item.id] = item.point;
  }
  return placements;
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

export function localLabelFromWorld(
  world: LabelPoint,
  planeOrigin: LabelPoint,
  planeAngleDeg: number,
): LabelPoint {
  return localFromWorld(world, planeOrigin, planeAngleDeg);
}
