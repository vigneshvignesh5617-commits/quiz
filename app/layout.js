import './globals.css';
import SiteHeader from './SiteHeader';

export const metadata = {
  title: 'QuizMaster',
  description: 'A dynamic mock test & quiz application built with Next.js and MongoDB.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="text-[var(--ink)] antialiased">
        <div className="min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[var(--line)] bg-white">
            <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <a href="/" className="font-bold text-[var(--ink)]">QuizMaster</a>
              <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
                <a className="inline-flex min-h-11 items-center hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="/#about">About</a>
                <a className="inline-flex min-h-11 items-center hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="https://github.com/" target="_blank" rel="noreferrer">GitHub / source</a>
                <a className="inline-flex min-h-11 items-center hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" href="https://github.com/contact" target="_blank" rel="noreferrer">Contact</a>
              </nav>
              <p className="text-xs text-[var(--muted)]">Practice with purpose.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
