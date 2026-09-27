'use client';

import { useEffect, useState } from 'react';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!token) return setError('This reset link is invalid or incomplete.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not reset password.');
      setMessage('Password changed. You can sign in with your new password.');
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="min-h-[70vh] bg-gradient-to-br from-violet-50 via-white to-amber-50 px-4 py-14"><div className="mx-auto max-w-md rounded-2xl border border-violet-100 bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-violet-700">Account recovery</p><h1 className="mt-2 text-2xl font-black text-violet-950">Choose a new password</h1><form onSubmit={submit} className="mt-6 space-y-4"><label htmlFor="new-password" className="block text-sm font-semibold text-slate-700">New password<input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 px-3" /></label><label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700">Confirm password<input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 px-3" /></label>{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<button type="submit" disabled={saving || !token} className="min-h-12 w-full rounded-lg bg-violet-700 font-bold text-white disabled:opacity-50">{saving ? 'Updating...' : 'Set new password'}</button></form></div></div>;
}
