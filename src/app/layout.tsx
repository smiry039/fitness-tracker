import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitness Tracker",
  description: "A gamified workout tracker — train, log, and grow your Viking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="topnav">
          <span className="brand">⚔ Fitness Tracker</span>
          <Link className="link" href="/">
            Today
          </Link>
          <Link className="link" href="/log">
            Log
          </Link>
          <Link className="link" href="/graph">
            Graph
          </Link>
          <Link className="link" href="/calendar">
            Calendar
          </Link>
          <Link className="link" href="/viking">
            Viking
          </Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
