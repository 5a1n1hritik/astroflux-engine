import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

// ── Typography System ──────────────────────────────────────────────────────────
// Space Grotesk: UI labels, values, headings — sharp, technical, geometric
// Space Mono:    numeric telemetry, monospaced data streams — pairs perfectly
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "AstroFlux Engine — Exoplanetary Transit Simulator",
  description:
    "High-fidelity quantum simulation environment for exoplanetary transits. Powered by Rust WASM + Three.js WebGL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable}`}
    >
      <body className="h-full overflow-hidden bg-void text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
