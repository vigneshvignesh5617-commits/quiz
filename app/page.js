'use client';

import { useEffect, useState } from 'react';

const difficultyStyles = {
  Easy: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-rose-100 text-rose-700',
};

function categoryStyle(category = '') {
  const value = category.toLowerCase();
  if (value.includes('program')) return 'bg-violet-100 text-violet-800 ring-violet-200';
  if (value.includes('general')) return 'bg-amber-100 text-amber-800 ring-amber-200';
  if (value.includes('science')) return 'bg-sky-100 text-sky-800 ring-sky-200';
  return 'bg-pink-100 text-pink-800 ring-pink-200';
}

export default function HomePage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  useEffect(() => {
    let active = true;

    async function loadQuizzes() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/quizzes', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load quizzes.');
        if (active) setQuizzes(Array.isArray(data.quizzes) ? data.quizzes : []);
      } catch (err) {
        if (active) setError(err.message || 'Could not load quizzes. Check your database connection.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadQuizzes();
    return () => {
      active = false;
    };
  }, [retryCount]);

  const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.questionCount, 0);
  const averageMinutes = quizzes.length
    ? Math.round(quizzes.reduce((sum, quiz) => sum + quiz.timeLimitMinutes, 0) / quizzes.length)
    : 0;
  const categories = [...new Set(quizzes.map((quiz) => quiz.category))].sort();
  const filteredQuizzes = quizzes.filter((quiz) => {
    const query = search.trim().toLowerCase();
    return (!query || `${quiz.title} ${quiz.description} ${quiz.category} ${quiz.subject || ''} ${quiz.topic || ''}`.toLowerCase().includes(query))
      && (!categoryFilter || quiz.category === categoryFilter)
      && (!difficultyFilter || quiz.difficulty === difficultyFilter);
  });

  return (
    <div className="page-canvas">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pt-14">
        <section className="mb-10 sm:mb-14">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Your next good score starts here</p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-[var(--ink)] sm:text-5xl">
            Practice smarter. <span className="text-[var(--accent)]">Show what you know.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
            Timed mock tests, clear feedback, and a better way to find your next breakthrough.
          </p>

          <div aria-label="Quiz library statistics" className="mt-8 grid max-w-3xl grid-cols-3 gap-3 sm:gap-4">
            {[
              ['Quizzes', quizzes.length],
              ['Questions', totalQuestions],
              ['Avg. minutes', averageMinutes],
            ].map(([label, value]) => (
              <div key={label} className="surface rounded-xl px-3 py-4 sm:px-5">
                  <p className="text-2xl font-extrabold text-[var(--ink)] sm:text-3xl">{loading ? '—' : value}</p>
                <p className="mt-1 text-xs font-medium text-[var(--muted)] sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="quiz-list-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--warm)]">Choose your challenge</p>
              <h2 id="quiz-list-heading" className="mt-1 text-2xl font-bold text-[var(--ink)]">Available quizzes</h2>
            </div>
            {quizzes.length > 0 && <p className="text-sm text-slate-500">{filteredQuizzes.length} to explore</p>}
          </div>

          {error && (
            <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p className="font-semibold">We couldn’t load the quiz library.</p>
              <p className="mt-1">{error}</p>
              <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-3 min-h-11 rounded-lg bg-rose-700 px-4 font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2">Try again</button>
            </div>
          )}

          {loading && (
            <div role="status" aria-label="Loading quizzes" className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <span className="sr-only">Loading quizzes</span>
              {[0, 1, 2].map((item) => <div key={item} className="h-56 rounded-2xl border border-violet-100 border-t-4 border-t-violet-100 bg-white" />)}
            </div>
          )}

          {!loading && !error && quizzes.length === 0 && (
            <div className="rounded-2xl border border-violet-100 bg-white px-6 py-12 text-center shadow-sm">
              <div aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-3xl text-amber-700">?</div>
              <h3 className="mt-5 text-xl font-bold text-violet-950">Your next challenge is on its way</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                There aren’t any quizzes here yet. Add sample quizzes with <code className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-violet-800">npm run seed</code> to get started.
              </p>
            </div>
          )}

          {!loading && !error && quizzes.length > 0 && <div className="surface mb-5 grid gap-3 rounded-xl p-4 sm:grid-cols-[minmax(220px,1fr)_repeat(2,minmax(150px,220px))]">
            <label className="text-xs font-semibold text-slate-600">Search quizzes<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, topic, category" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" /></label>
            <label className="text-xs font-semibold text-slate-600">Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-600">Difficulty<select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"><option value="">All levels</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
          </div>}

          {!loading && !error && quizzes.length > 0 && filteredQuizzes.length > 0 && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredQuizzes.map((quiz) => (
              <a
                key={quiz.id}
                href={`/quiz/${quiz.id}`}
                className="group surface min-h-56 rounded-2xl border-t-4 border-t-[var(--accent)] p-5 transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:border-t-[var(--accent-dark)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:p-6"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold ring-1 ring-inset ${categoryStyle(quiz.category)}`}>
                    {quiz.subject || quiz.category}{quiz.topic ? ` · ${quiz.topic}` : ''}
                  </span>
                  <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset ${difficultyStyles[quiz.difficulty] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                    {quiz.difficulty}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">{quiz.title}</h3>
                <p className="mt-2 min-h-10 text-sm leading-5 text-slate-600">{quiz.description}</p>
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                  <span>{quiz.questionsPerAttempt || quiz.questionCount} questions</span>
                  <span>{quiz.totalMarks} marks</span>
                  <span>{quiz.timeLimitMinutes} min</span>
                  <span className="ml-auto font-bold text-[var(--accent)]">{quiz.upcoming ? 'Upcoming' : 'View exam'} <span aria-hidden="true">→</span></span>
                </div>
              </a>
            ))}
          </div>}
          {!loading && !error && quizzes.length > 0 && filteredQuizzes.length === 0 && <p className="rounded-xl border border-violet-100 bg-white p-8 text-center text-slate-600">No quizzes match those filters.</p>}
        </section>

        <section id="about" className="mt-14 border-t border-violet-200/70 pt-7">
          <h2 className="text-sm font-bold text-[var(--ink)]">About QuizMaster</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A focused space for timed practice. Take a test, review every answer, and use the feedback to guide what you study next.</p>
        </section>
      </div>
    </div>
  );
}
