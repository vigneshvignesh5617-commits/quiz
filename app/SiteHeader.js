'use client';

import { useEffect, useState } from 'react';

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    function updateScrollState() {
      setScrolled(window.scrollY > 4);
    }

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null));
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.assign('/');
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <header
      className={`sticky top-0 z-20 border-b border-[var(--line)] bg-white/95 backdrop-blur transition-shadow ${
        scrolled ? 'shadow-md shadow-slate-900/5' : 'shadow-none'
      }`}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6"
      >
        <a
          href="/"
          className="flex min-h-11 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-lg font-bold text-white shadow-sm" aria-hidden="true">
            Q
          </span>
          <span className="text-lg font-extrabold tracking-tight text-[var(--ink)]">QuizMaster</span>
        </a>
        <div className="flex items-center gap-1 sm:gap-2">
          <a href="/#about" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-slate-100 hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">About</a>
          <a href="/leaderboard" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-slate-100 hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:px-3">Rankings</a>
          {user ? <>
            <a href={user.role === 'admin' ? '/admin' : '/dashboard'} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[var(--ink)] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{user.role === 'admin' ? 'Admin' : 'Dashboard'}</a>
            {user.role === 'student' && <a href="/profile" className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[var(--ink)] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:inline-flex">Profile</a>}
            <button type="button" disabled={signingOut} onClick={signOut} className="min-h-11 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-[var(--ink)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{signingOut ? 'Signing out...' : 'Sign out'}</button>
          </> : <a href="/auth" className="inline-flex min-h-11 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2">Sign in</a>}
        </div>
      </nav>
    </header>
  );
}
