'use client';

import { useEffect, useState } from 'react';

function duration(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function ResultPage({ params }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`/api/student/attempts/${params.id}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load result.');
        if (active) setResult(data.result);
      })
      .catch((err) => { if (active) setError(err.message || 'Could not load result.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  if (loading) return <div role="status" className="mx-auto max-w-3xl animate-pulse px-4 py-12"><div className="h-40 rounded-2xl bg-violet-100" /><span className="sr-only">Loading result</span></div>;
  if (!result) return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><p role="alert" className="text-rose-700">{error || 'Result not found.'}</p><a href="/dashboard" className="mt-4 inline-flex min-h-11 items-center text-violet-700">Back to dashboard</a></div>;

  return <div className="min-h-[70vh] bg-gradient-to-br from-violet-50 via-[#fbfaff] to-amber-50/50 px-4 py-10"><div className="mx-auto max-w-4xl">
    <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-violet-700">Exam result</p><h1 className="mt-2 text-2xl font-black text-violet-950">{result.quizTitle}</h1><p className="mt-1 text-sm text-slate-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.submittedAt))}</p></div><a href={`/leaderboard/${result.quizId}`} className="inline-flex min-h-11 items-center rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-800">Leaderboard</a></div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-lg bg-violet-50 p-4"><p className="text-2xl font-extrabold text-violet-950">{result.score}/{result.maxScore}</p><p className="text-xs text-slate-600">Score</p></div><div className="rounded-lg bg-violet-50 p-4"><p className="text-2xl font-extrabold text-violet-950">{result.percentage}%</p><p className="text-xs text-slate-600">Score percent</p></div><div className="rounded-lg bg-violet-50 p-4"><p className="text-2xl font-extrabold text-violet-950">{result.accuracy}%</p><p className="text-xs text-slate-600">Accuracy</p></div><div className="rounded-lg bg-violet-50 p-4"><p className="text-2xl font-extrabold text-violet-950">{duration(result.timeTakenSeconds)}</p><p className="text-xs text-slate-600">Time taken</p></div></div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600"><span>Correct: {result.correctCount}</span><span>Wrong: {result.wrongCount}</span><span>Unanswered: {result.unansweredCount}</span><span>Questions: {result.total}</span></div>
    </div>
    <section className="mt-8" aria-labelledby="review-heading"><h2 id="review-heading" className="mb-4 text-xl font-bold text-violet-950">Question-by-question review</h2>{result.review.length ? <div className="space-y-3">{result.review.map((item, index) => <article key={`${index}-${item.questionText}`} className={`rounded-xl border p-5 ${item.isCorrect ? 'border-emerald-200 bg-emerald-50' : item.selectedIndex < 0 ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}><div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold text-slate-900">{index + 1}. {item.questionText}</h3><span className="text-sm font-bold text-violet-800">{item.marksAwarded > 0 ? '+' : ''}{item.marksAwarded}/{item.maxMarks} marks</span></div><p className="mt-3 text-sm text-slate-700"><span className="font-semibold">Your answer:</span> {item.selectedIndex >= 0 ? item.options[item.selectedIndex] : 'Unanswered'}</p><p className="mt-1 text-sm text-emerald-800"><span className="font-semibold">Correct answer:</span> {item.options[item.correctIndex]}</p>{item.explanation && <p className="mt-3 border-t border-slate-200/70 pt-3 text-sm text-slate-600">{item.explanation}</p>}</article>)}</div> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">This attempt predates question-review storage, so only its score is available.</p>}</section>
    <a href="/dashboard" className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-violet-700 px-5 font-semibold text-white">Back to dashboard</a>
  </div></div>;
}
