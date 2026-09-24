"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, HomeIcon, PlusIcon, PulseIcon, ShieldIcon } from "./ui";

// Floating pill tab bar. Inactive tabs are icon-only circles; the active one
// expands into a labelled pill. Log is always yellow — it's the main action.

const TABS = [
  { href: "/", label: "Today", icon: HomeIcon },
  { href: "/graph", label: "Progress", icon: PulseIcon },
  { href: "/log", label: "Log", icon: PlusIcon, log: true },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/viking", label: "Viking", icon: ShieldIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ href, label, icon: Icon, log }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`${log ? "log" : ""} ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
            aria-label={label}
          >
            <Icon />
            <span className="lbl">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
