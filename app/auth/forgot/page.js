'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not request a reset link.');
      setMessage(data.message);
    } catch (err) {
      setError(err.message || 'Could not request a reset link.');
    } finally {
      setSending(false);
    }
  }

  return <div className="min-h-[70vh] bg-gradient-to-br from-violet-50 via-white to-amber-50 px-4 py-14"><div className="mx-auto max-w-md rounded-2xl border border-violet-100 bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-violet-700">Account recovery</p><h1 className="mt-2 text-2xl font-black text-violet-950">Reset your password</h1><p className="mt-2 text-sm text-slate-600">Enter your account email and we’ll send a secure, time-limited reset link.</p><form onSubmit={submit} className="mt-6 space-y-4"><label htmlFor="reset-email" className="block text-sm font-semibold text-slate-700">Email<input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 px-3" /></label>{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<button type="submit" disabled={sending} className="min-h-12 w-full rounded-lg bg-violet-700 font-bold text-white disabled:opacity-50">{sending ? 'Sending...' : 'Send reset link'}</button></form><a href="/auth" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-violet-700">Back to sign in</a></div></div>;
}
