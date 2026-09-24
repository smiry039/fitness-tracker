import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import BottomNav from "./BottomNav";
import "./globals.css";

// Self-hosted (CSP allows only same-origin fonts). Both are variable fonts.
const urbanist = localFont({
  src: "./fonts/Urbanist-latin.woff2",
  weight: "300 800",
  variable: "--font-urbanist",
  display: "swap",
});
const doto = localFont({
  src: "./fonts/Doto-latin.woff2",
  weight: "400 900",
  variable: "--font-doto",
  display: "swap",
});

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
  themeColor: "#09090a",
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
    <html lang="en" className={`${urbanist.variable} ${doto.variable}`}>
      <body>
        <div className="app">
          <main className="screen">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
