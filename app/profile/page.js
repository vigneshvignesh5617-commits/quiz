'use client';

import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/student/profile', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load profile.');
        setUser(data.user);
        setName(data.user.name);
      })
      .catch((err) => setError(err.message || 'Could not load profile.'))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update profile.');
      setUser(data.user);
      setCurrentPassword('');
      setNewPassword('');
      setNotice('Profile updated.');
    } catch (err) {
      setError(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div role="status" className="mx-auto max-w-xl animate-pulse px-4 py-12"><div className="h-60 rounded-2xl bg-violet-100" /><span className="sr-only">Loading profile</span></div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-16 text-center"><p role="alert" className="text-rose-700">{error || 'Sign in to view your profile.'}</p><a href="/auth" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-violet-700 px-5 font-semibold text-white">Sign in</a></div>;

  return <div className="min-h-[70vh] bg-gradient-to-br from-violet-50 via-white to-amber-50 px-4 py-12"><div className="mx-auto max-w-xl rounded-2xl border border-violet-100 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-violet-700">Student account</p><h1 className="mt-2 text-3xl font-black text-violet-950">Your profile</h1><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold text-slate-700">Name<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 px-3" /></label><label className="block text-sm font-semibold text-slate-700">Email<input readOnly value={user.email} className="mt-1 min-h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-normal text-slate-500" /></label><div className="border-t border-slate-100 pt-4"><h2 className="font-bold text-violet-950">Change password</h2><p className="mt-1 text-xs text-slate-500">Leave blank to keep your current password.</p></div><label className="block text-sm font-semibold text-slate-700">Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 px-3" /></label><label className="block text-sm font-semibold text-slate-700">New password<input type="password" autoComplete="new-password" minLength={newPassword ? 8 : undefined} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 px-3" /></label>{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}<button type="submit" disabled={saving} className="min-h-12 w-full rounded-lg bg-violet-700 font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save profile'}</button></form></div></div>;
}
