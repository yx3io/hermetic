import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "hermetic",
  description:
    "system logs that developed a soul. an agent reads its own commit history and keeps evidence.",
};

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--color-bg)]/80 border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--color-fg)] hover:opacity-70 transition-opacity"
        >
          hermetic
        </Link>
        <div className="flex items-center gap-6 text-[11px] tracking-wide">
          <Link
            href="/timeline"
            className="text-[var(--color-dim)] hover:text-[var(--color-fg)] transition-colors"
          >
            timeline
          </Link>
          <Link
            href="/about"
            className="text-[var(--color-dim)] hover:text-[var(--color-fg)] transition-colors"
          >
            about
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
        <Nav />
        <main className="flex-1 pt-[48px]">{children}</main>
        <footer className="border-t border-[var(--color-border)] px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span className="font-mono text-[10px] text-[var(--color-muted)]">
              hermetic
            </span>
            <a
              href="https://github.com/yx3io/hermetic"
              target="_blank"
              rel="noopener"
              className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-dim)] transition-colors"
            >
              source
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
