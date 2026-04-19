import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Relay — Cross-Platform Social Broadcasting",
  description: "Post once, reach everywhere. Relay broadcasts your content across all your social platforms.",
};

// Runs synchronously before React hydrates — reads localStorage + system
// preference and sets data-theme on <html> so the ThemeProvider picks up
// the correct mode on its very first render. This is what prevents the flash.
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('relayman-theme');
    var theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must be the first script — blocks paint until theme is resolved */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={geist.variable} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
