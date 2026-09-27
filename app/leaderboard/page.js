'use client';

import { useEffect, useState } from 'react';

export default function OverallLeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/leaderboard', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load leaderboard.');
        setEntries(data.entries || []);
      })
      .catch((err) => setError(err.message || 'Could not load leaderboard.'))
      .finally(() => setLoading(false));
  }, []);

  return <div className="min-h-[70vh] bg-gradient-to-br from-violet-50 via-[#fbfaff] to-amber-50/50 px-4 py-10"><div className="mx-auto max-w-5xl"><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Across every exam</p><h1 className="mt-2 text-3xl font-black text-violet-950">Overall leaderboard</h1><p className="mt-2 text-slate-600">Ranked by total marks, then average score.</p>{loading ? <div role="status" className="mt-8 h-64 animate-pulse rounded-xl bg-white"><span className="sr-only">Loading leaderboard</span></div> : error ? <p role="alert" className="mt-8 rounded-lg bg-rose-50 p-4 text-rose-800">{error}</p> : entries.length ? <div className="mt-8 overflow-x-auto rounded-xl border border-violet-100 bg-white shadow-sm"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-violet-50 text-xs uppercase text-violet-900"><tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Total marks</th><th className="px-4 py-3">Average score</th><th className="px-4 py-3">Attempts</th></tr></thead><tbody className="divide-y divide-slate-100">{entries.map((entry) => <tr key={entry.rank}><td className="px-4 py-3 font-bold text-violet-900">#{entry.rank}</td><td className="px-4 py-3 font-semibold text-slate-800">{entry.studentName}</td><td className="px-4 py-3">{entry.totalScore}/{entry.totalMaxScore}</td><td className="px-4 py-3 font-bold text-violet-800">{entry.averagePercentage}%</td><td className="px-4 py-3">{entry.attemptCount}</td></tr>)}</tbody></table></div> : <p className="mt-8 rounded-xl border border-violet-100 bg-white p-8 text-center text-slate-600">No student attempts have been submitted yet.</p>}<a href="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-violet-200 bg-white px-4 font-semibold text-violet-800">Browse exams</a></div></div>;
}
