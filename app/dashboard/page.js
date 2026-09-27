'use client';

import { useEffect, useState } from 'react';

function displayDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function displayDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/student/dashboard', { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not load your dashboard.');
        if (active) setData(body);
      } catch (err) {
        if (active) setError(err.message || 'Could not connect to the server.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [reload]);

  return (
    <div className="page-canvas">
      <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
        {loading ? <div role="status" className="animate-pulse"><div className="h-9 w-64 rounded bg-violet-100" /><div className="mt-7 h-48 rounded-2xl bg-white" /><span className="sr-only">Loading dashboard</span></div> : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6" role="alert">
            <h1 className="text-xl font-bold text-rose-900">Dashboard unavailable</h1>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
            <div className="mt-4 flex gap-3">
              {error.includes('Sign in') && <a href="/auth" className="inline-flex min-h-11 items-center rounded-lg bg-violet-700 px-4 font-semibold text-white">Sign in</a>}
              <button type="button" onClick={() => setReload((value) => value + 1)} className="min-h-11 rounded-lg border border-rose-300 px-4 font-semibold text-rose-900">Try again</button>
            </div>
          </div>
        ) : data && <>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Student dashboard</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--ink)] sm:text-4xl">Welcome, {data.user.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4"><p className="text-slate-600">Your practice, scores, and next challenge in one place.</p><a href="/profile" className="min-h-11 inline-flex items-center rounded-lg border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-800">Edit profile</a></div>

          <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Your progress">
            {[[data.availableExams.length, 'Available exams'], [data.upcomingExams.length, 'Upcoming exams'], [data.completedCount, 'Completed exams'], [`${data.bestScore}%`, 'Best score'], [`${data.averageScore}%`, 'Average score'], [data.attemptCount, 'Number of attempts']].map(([value, label]) => <div key={label} className="surface rounded-xl p-5"><p className="text-3xl font-extrabold text-[var(--ink)]">{value}</p><p className="mt-1 text-sm text-[var(--muted)]">{label}</p></div>)}
          </section>

          <section className="mt-10" aria-labelledby="available-heading">
            <div className="mb-4 flex items-end justify-between gap-3"><h2 id="available-heading" className="text-xl font-bold text-violet-950">Available quizzes</h2><a href="/" className="min-h-11 inline-flex items-center text-sm font-semibold text-violet-700 hover:text-violet-900">Browse library →</a></div>
            {data.availableExams.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.availableExams.map((quiz) => <article key={quiz.id} className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-amber-700">{quiz.subject || quiz.category}{quiz.topic ? ` · ${quiz.topic}` : ''}</span><span className="text-xs text-slate-500">{quiz.difficulty}</span></div><h3 className="mt-2 font-bold text-violet-950">{quiz.title}</h3><p className="mt-1 text-sm text-slate-500">{quiz.questionCount} questions · {quiz.totalMarks} marks · {quiz.timeLimitMinutes} min</p><div className="mt-4 flex gap-3"><a href={`/quiz/${quiz.id}`} className="inline-flex min-h-10 items-center rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white">View exam</a><a href={`/leaderboard/${quiz.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-violet-200 px-3 text-sm font-semibold text-violet-800">Rankings</a></div></article>)}</div> : <p className="rounded-xl border border-violet-100 bg-white p-6 text-slate-600">No exams are available right now.</p>}
          </section>

          <section className="mt-10" aria-labelledby="upcoming-heading"><h2 id="upcoming-heading" className="mb-4 text-xl font-bold text-violet-950">Upcoming exams</h2>{data.upcomingExams.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.upcomingExams.map((exam) => <article key={exam.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-5"><p className="text-xs font-bold uppercase text-amber-800">Opens {displayDate(exam.availableFrom)}</p><h3 className="mt-2 font-bold text-violet-950">{exam.title}</h3><p className="mt-1 text-sm text-slate-600">{exam.subject || exam.category} · {exam.questionCount} questions · {exam.timeLimitMinutes} min</p></article>)}</div> : <p className="rounded-xl border border-violet-100 bg-white p-5 text-sm text-slate-600">No upcoming exams are scheduled.</p>}</section>

          <section className="mt-10" aria-labelledby="history-heading">
            <h2 id="history-heading" className="mb-4 text-xl font-bold text-violet-950">Attempt history</h2>
            {data.attempts.length ? <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white shadow-sm"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-violet-50 text-xs uppercase text-violet-900"><tr><th className="px-4 py-3">Exam</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Percent</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Result</th></tr></thead><tbody className="divide-y divide-slate-100">{data.attempts.map((attempt) => <tr key={attempt.id}><td className="px-4 py-3 font-semibold text-slate-800">{attempt.quizTitle}</td><td className="px-4 py-3 text-slate-600">{displayDate(attempt.submittedAt)}</td><td className="px-4 py-3">{attempt.score}/{attempt.maxScore}</td><td className="px-4 py-3 font-semibold text-violet-800">{attempt.percentage}%</td><td className="px-4 py-3">{displayDuration(attempt.timeTakenSeconds)}</td><td className="px-4 py-3"><a href={`/results/${attempt.id}`} className="font-semibold text-violet-700 hover:underline">View result</a></td></tr>)}</tbody></table></div> : <p className="rounded-xl border border-violet-100 bg-white p-6 text-slate-600">Your completed exams will show here.</p>}
          </section>
        </>}
      </div>
    </div>
  );
}
