"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Scroll-snap number wheel. Swipe to pick; tap the highlighted value to type an
// exact number (off-grid values like 13.75 are kept as typed — the wheel just
// sits on the nearest notch).

const ITEM = 56; // px per notch — keep in sync with .wheel-item height
const VISIBLE = 5;

function trim(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export default function Wheel({
  value,
  onChange,
  step,
  max,
  label,
  zeroLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  step: number;
  max: number;
  label: string;
  zeroLabel?: string; // e.g. "BW" for bodyweight on a kg wheel
}) {
  const values = useMemo(
    () => Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step),
    [max, step],
  );
  const num = Number(value) || 0;
  const idx = Math.min(values.length - 1, Math.max(0, Math.round(num / step)));

  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>();
  const ignoreUntil = useRef(0);
  const [live, setLive] = useState(idx);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // Follow external changes (prefill, typing, set switch) without echoing
  // the programmatic scroll back as a user pick.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ITEM) === idx) return;
    ignoreUntil.current = Date.now() + 250;
    el.scrollTop = idx * ITEM;
    setLive(idx);
  }, [idx]);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const i = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
    if (i !== live) {
      setLive(i);
      if (Date.now() > ignoreUntil.current) navigator.vibrate?.(4);
    }
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (Date.now() < ignoreUntil.current) return;
      if (i !== idx) onChange(trim(values[i]));
    }, 110);
  }

  function tapItem(i: number) {
    if (i === live) {
      setDraft(value);
      setEditing(true);
      return;
    }
    ref.current?.scrollTo({ top: i * ITEM, behavior: "smooth" });
  }

  function commit() {
    const n = Number(draft.replace(",", "."));
    if (draft.trim() !== "" && Number.isFinite(n) && n >= 0) onChange(trim(n));
    else if (draft.trim() === "") onChange("");
    setEditing(false);
  }

  const shown = (v: number) => (v === 0 && zeroLabel ? zeroLabel : trim(v));
  // Show the exact typed value in the centre even when it's between notches.
  const offGrid = value !== "" && Math.abs(values[idx] - num) > 1e-9;

  return (
    <div className="wheel-wrap">
      <span className="wheel-label">{label}</span>
      <div className="wheel" style={{ height: ITEM * VISIBLE }}>
        <div className="wheel-band" aria-hidden />
        <div
          ref={ref}
          className="wheel-scroll"
          onScroll={onScroll}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
        >
          <div style={{ height: ITEM * 2 }} />
          {values.map((v, i) => {
            const d = Math.abs(i - live);
            // Only render text near the viewport; the rest are spacers.
            if (d > 6) return <div key={i} className="wheel-item" />;
            return (
              <div
                key={i}
                className={`wheel-item${d === 0 ? " on" : ""}`}
                style={{ opacity: d === 0 ? 1 : Math.max(0.12, 0.55 - d * 0.16) }}
                role="option"
                aria-selected={d === 0}
                onClick={() => tapItem(i)}
              >
                {d === 0 && offGrid && i === idx ? value : shown(v)}
              </div>
            );
          })}
          <div style={{ height: ITEM * 2 }} />
        </div>
        {editing && (
          <input
            className="wheel-input"
            autoFocus
            inputMode="decimal"
            aria-label={`Type ${label}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        )}
      </div>
      <button
        type="button"
        className="wheel-type"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        Type
      </button>
    </div>
  );
}
