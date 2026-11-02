import type { Metadata } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const serif = Bodoni_Moda({ subsets: ["latin"], variable: "--font-serif", style: ["normal", "italic"], display: "swap" });
const sans = Jost({ subsets: ["latin"], variable: "--font-sans", weight: ["300", "400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: "Folio — English, read at your level",
  description: "Thoughtful English articles chosen for your level and interests, with every word one tap away.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: themeScript may set data-theme before React hydrates.
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <header className="mx-auto flex max-w-6xl items-baseline justify-between px-6 pb-6 pt-8 sm:px-10">
          <Link href="/" className="font-serif text-2xl tracking-tight">
            Folio<span className="text-gold">.</span>
          </Link>
          <nav className="flex gap-4 text-[0.7rem] uppercase tracking-[0.16em] text-ink-soft sm:gap-7 sm:tracking-eyebrow">
            <Link href="/read" className="hover:text-ink">Library</Link>
            <Link href="/words" className="hover:text-ink">Notebook</Link>
            <Link href="/practice" className="hover:text-ink">Practice</Link>
            <ThemeToggle />
          </nav>
        </header>
        <div className="mx-auto max-w-6xl px-6 sm:px-10"><div className="border-t hairline" /></div>

        {children}

        <footer className="mx-auto mt-32 max-w-6xl px-6 pb-14 sm:px-10">
          <div className="border-t hairline pt-8 text-xs leading-relaxed text-ink-faint sm:flex sm:justify-between">
            <p className="font-serif text-base text-ink">Folio<span className="text-gold">.</span></p>
            <p className="mt-3 max-w-xl sm:mt-0 sm:text-right">
              Articles from The Conversation (CC BY-ND 4.0) and Simple English Wikipedia (CC BY-SA 4.0), each credited and
              linked to its original. Definitions from the Free Dictionary API (Wiktionary). Levels are estimates.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
