'use client';

import { useState } from 'react';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, adminToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed.');
      window.location.assign(data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Could not connect. Please try again.');
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  return (
    <div className="page-canvas px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">QuizMaster account</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--ink)]">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-2 text-sm text-slate-600">Save your attempts and keep your progress together.</p>
        </div>
        <div className="surface rounded-2xl p-6 sm:p-8">
          <div role="tablist" aria-label="Account access" className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => changeMode('login')} className={`min-h-11 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${mode === 'login' ? 'bg-white text-violet-900 shadow-sm' : 'text-slate-600'}`}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => changeMode('register')} className={`min-h-11 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${mode === 'register' ? 'bg-white text-violet-900 shadow-sm' : 'text-slate-600'}`}>Register</button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && <div>
              <label htmlFor="account-name" className="mb-1 block text-sm font-semibold text-slate-700">Name</label>
              <input id="account-name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" />
            </div>}
            <div>
              <label htmlFor="account-email" className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
              <input id="account-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" />
            </div>
            <div>
              <label htmlFor="account-password" className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
              <input id="account-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : undefined} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" />
              {mode === 'register' && <p className="mt-1 text-xs text-slate-500">Use at least 8 characters.</p>}
            </div>
            {mode === 'register' && <details className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-amber-900">Admin setup (optional)</summary>
              <label htmlFor="admin-token" className="mb-1 mt-3 block text-sm text-slate-700">Server-provided setup token</label>
              <input id="admin-token" type="password" autoComplete="off" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} className="min-h-11 w-full rounded-lg border border-amber-300 bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" />
            </details>}
            {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <button type="submit" disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 font-bold text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">
              {submitting && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          {mode === 'login' && <a href="/auth/forgot" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-700 hover:text-violet-900">Forgot password?</a>}
        </div>
      </div>
    </div>
  );
}
