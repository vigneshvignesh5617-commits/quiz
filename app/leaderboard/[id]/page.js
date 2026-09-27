'use client';

import { useEffect, useState } from 'react';

export default function LeaderboardPage({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`/api/quizzes/${params.id}/leaderboard`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not load rankings.');
        if (active) setData(body);
      })
      .catch((err) => { if (active) setError(err.message || 'Could not load rankings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  return (
    <div className="min-h-[70vh] bg-gradient-to-br from-violet-50 via-[#fbfaff] to-amber-50/50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Quiz standings</p>
        <h1 className="mt-2 text-3xl font-black text-violet-950">{data?.quizTitle || 'Leaderboard'}</h1>
        <p className="mt-2 text-slate-600">Ranked by score, then by fastest completion.</p>
        {loading ? <div role="status" className="mt-8 h-64 animate-pulse rounded-xl bg-white"><span className="sr-only">Loading leaderboard</span></div> : error ? <p role="alert" className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</p> : data.entries.length ? <div className="mt-8 overflow-x-auto rounded-xl border border-violet-100 bg-white shadow-sm"><table className="w-full min-w-[540px] text-left text-sm"><thead className="bg-violet-50 text-xs uppercase text-violet-900"><tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Percent</th><th className="px-4 py-3">Submitted</th></tr></thead><tbody className="divide-y divide-slate-100">{data.entries.map((entry) => <tr key={`${entry.rank}-${entry.submittedAt}`}><td className="px-4 py-3 font-bold text-violet-900">#{entry.rank}</td><td className="px-4 py-3 font-semibold text-slate-800">{entry.studentName}</td><td className="px-4 py-3">{entry.score}/{entry.total}</td><td className="px-4 py-3 font-bold text-violet-800">{entry.percentage}%</td><td className="px-4 py-3 text-slate-600">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(entry.submittedAt))}</td></tr>)}</tbody></table></div> : <div className="mt-8 rounded-xl border border-violet-100 bg-white p-8 text-center text-slate-600">No attempts have been submitted for this quiz yet.</div>}
        <a href="/dashboard" className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-violet-200 bg-white px-4 font-semibold text-violet-800">Back to dashboard</a>
      </div>
    </div>
  );
}
