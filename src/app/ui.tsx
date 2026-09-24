// Shared presentational pieces: tick gauge, progress ring, icons. No hooks, so
// they render on the server and ship zero JS.

import type { ReactNode } from "react";

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Radial tick gauge — a ring of short ticks, lit up to `value` (0..1), with a
 * yellow marker at the current position. The arc opens at the bottom.
 */
export function TickGauge({
  value,
  size = 264,
  count = 72,
  sweep = 290,
  children,
}: {
  value: number;
  size?: number;
  count?: number;
  sweep?: number;
  children?: ReactNode;
}) {
  const v = clamp01(value);
  const c = size / 2;
  const rOuter = c - 10;
  const start = 90 + (360 - sweep) / 2; // degrees, SVG space (0 = +x, clockwise)
  const polar = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
  };

  const ticks = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const deg = start + t * sweep;
    const major = i % 6 === 0;
    const [x1, y1] = polar(deg, rOuter);
    const [x2, y2] = polar(deg, rOuter - (major ? 15 : 9));
    const lit = v > 0 && t <= v;
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={lit ? "var(--text)" : "var(--tick)"}
        strokeWidth={major ? 2 : 1.5}
        strokeLinecap="round"
      />
    );
  });

  const markDeg = start + v * sweep;
  const [mx1, my1] = polar(markDeg, rOuter + 6);
  const [mx2, my2] = polar(markDeg, rOuter - 22);

  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <circle
          cx={c}
          cy={c}
          r={rOuter - 34}
          fill="none"
          stroke="var(--tick)"
          strokeWidth={1.4}
          strokeDasharray="0.1 6"
          strokeLinecap="round"
        />
        {ticks}
        <line
          x1={mx1}
          y1={my1}
          x2={mx2}
          y2={my2}
          stroke="var(--sun)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>
      <div className="gauge-center">{children}</div>
    </div>
  );
}

/** Circular progress ring with optional centred content. */
export function Ring({
  value,
  size = 64,
  stroke = 6,
  color = "var(--sun)",
  track = "rgba(0, 0, 0, 0.22)",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const v = clamp01(value);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {v > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circ * v} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      {children != null && <div className="ring-center">{children}</div>}
    </div>
  );
}

// --- Icons -----------------------------------------------------------------

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type IconProps = { size?: number };

export function HomeIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} aria-hidden>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M6 9v11h12V9" />
    </svg>
  );
}

export function PulseIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} aria-hidden>
      <path d="M3 12h4l2.5-6 5 12L17 12h4" />
    </svg>
  );
}

export function PlusIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} strokeWidth={2.4} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CalendarIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="4" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function ShieldIcon({ size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} aria-hidden>
      <path d="M12 3 5 5.8v5.4c0 4.5 3 7.9 7 9.3 4-1.4 7-4.8 7-9.3V5.8L12 3Z" />
      <path d="M12 3v17.5" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} strokeWidth={2.1} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronIcon({
  size = 20,
  dir = "right",
}: IconProps & { dir?: "left" | "right" | "up" | "down" }) {
  const rot = { right: 0, down: 90, left: 180, up: -90 }[dir];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      {...stroke}
      strokeWidth={2.1}
      style={{ transform: `rotate(${rot}deg)` }}
      aria-hidden
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function CheckIcon({ size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} strokeWidth={2.6} aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

// --- Formatting ------------------------------------------------------------

export function fmtKg(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}t`;
  return `${Math.round(n)}`;
}
