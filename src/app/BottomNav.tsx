"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bottom tab bar with a raised center action for logging — the one thing you
// do most often at the gym.

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M3 21h18" />
      <path d="M4.5 15.5 9.5 10l3.5 3.5L20 6.5" />
      <path d="M15.5 6.5H20V11" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 2.5V6M16 2.5V6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M12 3 5 5.8v5.4c0 4.5 3 7.9 7 9.3 4-1.4 7-4.8 7-9.3V5.8L12 3Z" />
      <path d="M12 3v17.5" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Today", icon: HomeIcon },
  { href: "/graph", label: "Graph", icon: GraphIcon },
  { href: "/log", label: "Log", icon: LogIcon, fab: true },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/viking", label: "Viking", icon: ShieldIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ href, label, icon: Icon, fab }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`${fab ? "fab-slot" : ""} ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {fab ? (
              <>
                <span className="fab">
                  <Icon />
                </span>
                <span className="lbl">{label}</span>
              </>
            ) : (
              <>
                <Icon />
                <span>{label}</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
