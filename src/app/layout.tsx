import type { Metadata, Viewport } from "next";
import BottomNav from "./BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitness Tracker",
  description: "A gamified workout tracker — train, log, and grow your Viking.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fitness",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#15171a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <main className="screen">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
