'use client';

import {
  calculateWheelSegments,
  describeWheelSectorPath,
  polarToCartesian,
  type FortuneWheelParticipant,
  type WheelSegment,
} from '@/lib/tools/fortune-wheel';

const WHEEL_SIZE = 320;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = 138;
const LABEL_RADIUS = 92;

type FortuneWheelSvgProps = {
  participants: FortuneWheelParticipant[];
  rotation: number;
  isSpinning: boolean;
  onTransitionEnd: () => void;
};

function getLabelTransform(segment: WheelSegment): string {
  const midAngle = (segment.startAngle + segment.endAngle) / 2;
  const position = polarToCartesian(CENTER, CENTER, LABEL_RADIUS, midAngle);

  return `translate(${position.x} ${position.y}) rotate(${midAngle})`;
}

export function FortuneWheelSvg({
  participants,
  rotation,
  isSpinning,
  onTransitionEnd,
}: FortuneWheelSvgProps) {
  const segments = calculateWheelSegments(participants);
  const hasSegments = segments.length > 0;

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,22rem)]">
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1"
        aria-hidden
      >
        <div className="h-0 w-0 border-x-[14px] border-b-[22px] border-x-transparent border-b-[#3166F0] drop-shadow-[0_4px_12px_rgba(49,102,240,0.45)]" />
      </div>

      <div className="rounded-full border border-zinc-800 bg-zinc-950/80 p-3 shadow-[0_0_60px_rgba(49,102,240,0.12)] backdrop-blur-sm sm:p-4">
        <div
          className="origin-center"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning
              ? 'transform 5.5s cubic-bezier(0.15, 0.85, 0.2, 1)'
              : 'none',
          }}
          onTransitionEnd={(event) => {
            if (event.propertyName === 'transform') {
              onTransitionEnd();
            }
          }}
        >
          <svg
            viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
            className="mx-auto block h-auto w-full"
            role="img"
            aria-label="Колесо фортуны"
          >
            <defs>
              <filter id="wheel-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.25" />
              </filter>
            </defs>

            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS + 6}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="2"
            />

            <g filter="url(#wheel-shadow)">
              {hasSegments ? (
                segments.map((segment) => {
                  const sweep = segment.endAngle - segment.startAngle;
                  const showLabel = sweep >= 18;

                  return (
                    <g key={segment.participantId}>
                      <path
                        d={describeWheelSectorPath(
                          CENTER,
                          CENTER,
                          RADIUS,
                          segment.startAngle,
                          segment.endAngle,
                        )}
                        fill={segment.color}
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth="1.5"
                      />
                      {showLabel && (
                        <text
                          transform={getLabelTransform(segment)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="11"
                          fontWeight="700"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}
                        >
                          {Math.round(segment.probability)}%
                        </text>
                      )}
                    </g>
                  );
                })
              ) : (
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="2"
                  strokeDasharray="8 10"
                />
              )}

              <circle
                cx={CENTER}
                cy={CENTER}
                r={28}
                fill="#09090b"
                stroke="#3f3f46"
                strokeWidth="2"
              />
              <circle cx={CENTER} cy={CENTER} r={10} fill="#3166F0" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
