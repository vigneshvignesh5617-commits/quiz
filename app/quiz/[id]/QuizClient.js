'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export default function QuizClient({ quizId }) {
  const [quiz, setQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [attemptId, setAttemptId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const submissionLock = useRef(false);
  const autoSubmitAttempted = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadQuiz() {
      setLoadingQuiz(true);
      setLoadError('');
      setQuiz(null);
      try {
        const response = await fetch(`/api/quizzes/${quizId}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load this quiz.');
        if (!data.quiz || !Array.isArray(data.quiz.questions)) {
          throw new Error('The quiz data is incomplete.');
        }
        if (active) {
          setQuiz(data.quiz);
          setAnswers(Array(data.quiz.questions.length).fill(-1));
          setSecondsLeft(data.quiz.timeLimitMinutes * 60);
          setCurrent(0);
          setStarted(false);
          setResult(null);
          setAttemptId('');
          submissionLock.current = false;
          autoSubmitAttempted.current = false;
        }
      } catch (err) {
        if (active) setLoadError(err.message || 'Could not load this quiz. Check your database connection.');
      } finally {
        if (active) setLoadingQuiz(false);
      }
    }

    loadQuiz();
    return () => {
      active = false;
    };
  }, [quizId, reloadCount]);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (active) setCurrentUser(data.user || null);
      })
      .catch(() => {
        if (active) setCurrentUser(null);
      })
      .finally(() => {
        if (active) setAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalQuestions = quiz?.questions.length || 0;
  const answeredCount = useMemo(
    () => answers.filter((a) => a !== -1).length,
    [answers]
  );

  const submitQuiz = useCallback(async (autoSubmitted = false) => {
    if (!quiz || !attemptId || submissionLock.current || result) return;
    submissionLock.current = true;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const timeTakenSeconds = quiz.timeLimitMinutes * 60 - secondsLeft;
      const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          studentName: currentUser?.name || '',
          timeTakenSeconds,
          attemptId,
          autoSubmitted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setResult(data);
    } catch (err) {
      submissionLock.current = false;
      setErrorMsg(err.message || 'Something went wrong submitting the quiz.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, attemptId, quiz, secondsLeft, result, currentUser]);

  // Countdown timer
  useEffect(() => {
    if (!started || !quiz || result) return;
    if (secondsLeft <= 0) {
      if (!autoSubmitAttempted.current) {
        autoSubmitAttempted.current = true;
        submitQuiz(true);
      }
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, secondsLeft, result, submitQuiz, quiz]);

  function selectAnswer(optionIndex) {
    if (submitting || secondsLeft <= 0) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = optionIndex;
      return next;
    });
  }

  function goTo(idx) {
    setCurrent(Math.max(0, Math.min(totalQuestions - 1, idx)));
  }

  function startQuiz() {
    if (!quiz || totalQuestions === 0) return;
    setAttemptId(crypto.randomUUID());
    setStarted(true);
  }

  function retakeQuiz() {
    submissionLock.current = false;
    autoSubmitAttempted.current = false;
    setAttemptId(crypto.randomUUID());
    setAnswers(Array(totalQuestions).fill(-1));
    setCurrent(0);
    setSecondsLeft(quiz.timeLimitMinutes * 60);
    setErrorMsg('');
    setResult(null);
    setStarted(true);
  }

  if (loadingQuiz) {
    return (
      <div role="status" className="mx-auto max-w-2xl animate-pulse px-4 py-12">
        <span className="sr-only">Loading quiz</span>
        <div className="h-8 w-2/3 rounded bg-violet-100" />
        <div className="mt-4 h-5 w-1/2 rounded bg-slate-200" />
        <div className="mt-8 h-64 rounded-2xl bg-white ring-1 ring-violet-100" />
      </div>
    );
  }

  if (loadError || !quiz) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p role="alert" className="text-rose-700">{loadError || 'Quiz not found.'}</p>
        <button type="button" onClick={() => setReloadCount((count) => count + 1)} className="mt-4 min-h-11 rounded-lg bg-violet-700 px-5 font-semibold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">Try again</button>
        <a href="/" className="ml-3 inline-flex min-h-11 items-center rounded-lg px-3 text-violet-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">Back to quizzes</a>
      </div>
    );
  }

  // ---------- Start screen ----------
  if (!started) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
        <div className="rounded-2xl border border-violet-100 border-t-4 border-t-pink-400 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="mb-1 text-2xl font-bold text-violet-950">{quiz.title}</h1>
          <p className="mb-6 text-slate-600">{quiz.description}</p>
          <div className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
            <span>❓ {totalQuestions} questions</span>
            <span>⏱ {quiz.timeLimitMinutes} min</span>
            <span>📚 {quiz.category}</span>
          </div>
          {currentUser?.role === 'student' && <p className="mb-6 text-sm text-slate-600">Signed in as <span className="font-semibold text-violet-900">{currentUser.name}</span></p>}
          {accountLoading ? (
            <p role="status" className="py-3 text-center text-sm text-slate-500">Checking your account...</p>
          ) : currentUser?.role === 'student' ? (
            <button
              onClick={startQuiz}
              disabled={totalQuestions === 0}
              className="min-h-12 w-full rounded-lg bg-violet-700 py-3 font-semibold text-white transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Quiz
            </button>
          ) : (
            <a href="/auth" className="flex min-h-12 w-full items-center justify-center rounded-lg bg-violet-700 py-3 font-semibold text-white transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">
              {currentUser ? 'Use a student account to start' : 'Sign in to start'}
            </a>
          )}
          {totalQuestions === 0 && <p role="status" className="mt-3 text-center text-sm text-amber-800">This quiz has no questions yet and cannot be started.</p>}
          <a href="/" className="mt-4 block min-h-11 rounded-lg text-center text-sm text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            ← Back to all quizzes
          </a>
        </div>
      </div>
    );
  }

  // ---------- Result screen ----------
  if (result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <div className="mb-8 rounded-2xl border border-violet-100 bg-white p-8 text-center shadow-sm">
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-violet-700">Test complete</p>
          <h1 className="mb-2 text-5xl font-extrabold text-violet-950">
            {result.score}/{result.total}
          </h1>
          <p className="text-slate-600">{result.percentage}% correct</p>
          <button
            type="button"
            onClick={retakeQuiz}
            className="mt-6 min-h-12 rounded-lg bg-violet-700 px-6 font-semibold text-white transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            Retake quiz
          </button>
        </div>

        <h2 className="mb-3 text-xl font-bold text-violet-950">Question review</h2>
        <div className="mb-8 space-y-3">
          {result.review.map((r, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 ${
                r.isCorrect
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-rose-200 bg-rose-50'
              }`}
            >
              <p className="mb-3 font-semibold text-slate-900">
                {idx + 1}. {r.questionText}
              </p>
              <div className="mb-3 grid gap-1 text-sm">
                <p className="text-slate-700"><span className="font-semibold">Your answer:</span> {r.selectedIndex >= 0 ? r.options[r.selectedIndex] : 'Not answered'}</p>
                <p className="text-emerald-800"><span className="font-semibold">Correct answer:</span> {r.options[r.correctIndex]}</p>
              </div>
              <div className="grid gap-1 text-sm">
                {r.options.map((opt, oIdx) => {
                  const isCorrectOpt = oIdx === r.correctIndex;
                  const isSelectedOpt = oIdx === r.selectedIndex;
                  return (
                    <div
                      key={oIdx}
                      className={`px-3 py-1.5 rounded-md ${
                        isCorrectOpt
                          ? 'bg-emerald-200/60 font-medium'
                          : isSelectedOpt
                          ? 'bg-rose-200/60'
                          : 'bg-white/60'
                      }`}
                    >
                      {opt}
                      {isCorrectOpt && ' ✓'}
                      {isSelectedOpt && !isCorrectOpt && ' ✗ (your answer)'}
                    </div>
                  );
                })}
              </div>
              {r.explanation && (
                <p className="text-xs text-slate-500 mt-2">{r.explanation}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-violet-200 bg-white py-3 font-semibold text-violet-800 transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            Try Another Quiz
          </a>
        </div>
      </div>
    );
  }

  // ---------- Quiz-taking screen ----------
  const q = quiz.questions[current];
  const isLast = current === totalQuestions - 1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">
          Question {current + 1} of {totalQuestions}
        </span>
        <span
          role="timer"
          aria-live="polite"
          className={`rounded-full px-3 py-1.5 text-sm font-bold tabular-nums ${
            secondsLeft <= 30 ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300' : 'bg-violet-100 text-violet-800'
          }`}
        >
          ⏱ {formatTime(secondsLeft)}
        </span>
      </div>

      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-pink-500 transition-all"
          style={{ width: `${((current + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="mb-5 text-lg font-semibold text-violet-950">{q.questionText}</h2>
        <div className="space-y-2.5">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={submitting || secondsLeft <= 0}
              aria-pressed={answers[current] === idx}
              onClick={() => selectAnswer(idx)}
              className={`min-h-12 w-full rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                answers[current] === idx
                  ? 'border-violet-500 bg-violet-50 font-medium text-violet-900'
                  : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/60'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMsg} You can retry your submission.</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          disabled={current === 0 || submitting || secondsLeft <= 0}
          className="min-h-11 rounded-lg px-4 py-2 text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          ← Previous
        </button>

        <span className="text-xs font-medium text-slate-500">{answeredCount}/{totalQuestions} answered</span>

        {isLast || secondsLeft <= 0 ? (
          <button
            type="button"
            onClick={() => submitQuiz(secondsLeft <= 0)}
            disabled={submitting || (secondsLeft > 0 && answeredCount < totalQuestions)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-700 px-6 py-2 font-semibold text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            {submitting && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {submitting ? 'Submitting...' : secondsLeft > 0 && answeredCount < totalQuestions ? 'Answer all questions' : 'Submit quiz'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={submitting}
            className="min-h-11 rounded-lg bg-violet-700 px-6 py-2 font-semibold text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
