'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function blankAttempt() {
  return { id: '', questions: [], expiresAt: null, maxScore: 0, negativeMarks: 0 };
}

function attemptStorageKey(userId, quizId) {
  return `quizmaster:active-attempt:${userId}:${quizId}`;
}

export default function ExamClient({ quizId }) {
  const [quiz, setQuiz] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [marked, setMarked] = useState([]);
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const saveQueue = useRef(Promise.resolve());
  const saveCount = useRef(0);
  const submitLock = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [quizResponse, userResponse] = await Promise.all([
          fetch(`/api/quizzes/${quizId}`, { cache: 'no-store' }),
          fetch('/api/auth/me', { cache: 'no-store' }),
        ]);
        const quizData = await quizResponse.json();
        const userData = await userResponse.json();
        if (!quizResponse.ok) throw new Error(quizData.error || 'Could not load this exam.');
        if (active) {
          setQuiz(quizData.quiz);
          setUser(userData.user || null);
        }
        if (userData.user?.role === 'student') {
          const key = attemptStorageKey(userData.user.id, quizId);
          const savedAttemptId = window.localStorage.getItem(key);
          if (savedAttemptId) {
            const attemptResponse = await fetch(`/api/student/attempts/${savedAttemptId}`, { cache: 'no-store' });
            const attemptData = await attemptResponse.json();
            if (attemptResponse.ok && attemptData.attempt?.quizId === quizId) {
              const restored = { ...attemptData.attempt, id: attemptData.attempt.attemptId };
              if (active) {
                setAttempt(restored);
                setAnswers(restored.answers);
                setMarked(restored.markedForReview);
                const nextQuestion = restored.answers.findIndex((answer) => answer < 0);
                setCurrent(nextQuestion < 0 ? 0 : nextQuestion);
                setSecondsLeft(Math.max(0, Math.ceil((new Date(restored.expiresAt).getTime() - Date.now()) / 1000)));
              }
            } else {
              window.localStorage.removeItem(key);
            }
          }
        }
      } catch (err) {
        if (active) setError(err.message || 'Could not load this exam.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [quizId]);

  const totalQuestions = attempt?.questions.length || 0;
  const answeredCount = useMemo(() => answers.filter((answer) => answer >= 0).length, [answers]);
  const upcoming = quiz?.availableFrom && new Date(quiz.availableFrom).getTime() > Date.now();
  const closed = quiz?.expired || (quiz?.availableUntil && new Date(quiz.availableUntil).getTime() <= Date.now());

  const persistState = useCallback((nextAnswers, nextMarked) => {
    if (!attempt?.id) return Promise.resolve();
    const attemptId = attempt.id;
    saveCount.current += 1;
    setSaving(true);
    const pending = saveQueue.current.catch(() => {}).then(async () => {
      const response = await fetch(`/api/student/attempts/${attemptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: nextAnswers, markedForReview: nextMarked }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your answer.');
    });
    saveQueue.current = pending;
    pending.finally(() => {
      saveCount.current -= 1;
      if (saveCount.current === 0) setSaving(false);
    }).catch(() => {});
    pending.catch((err) => setError(err.message || 'Could not save your answer.'));
    return pending;
  }, [attempt]);

  const submitExam = useCallback(async () => {
    if (!attempt?.id || submitLock.current || result) return;
    submitLock.current = true;
    setSubmitting(true);
    setError('');
    try {
      try {
        await saveQueue.current;
      } catch (saveError) {
        setError(saveError.message || 'Final answer save failed; submitting the latest responses.');
      }
      const response = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: attempt.id, answers, markedForReview: marked }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit the exam.');
      setResult(data);
      window.localStorage.removeItem(attemptStorageKey(user.id, quizId));
    } catch (err) {
      submitLock.current = false;
      setError(err.message || 'Could not submit the exam.');
    } finally {
      setSubmitting(false);
    }
  }, [attempt, answers, marked, quizId, result]);

  useEffect(() => {
    if (!attempt?.expiresAt || result) return;
    const expiry = new Date(attempt.expiresAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) submitExam();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt, result, submitExam]);

  async function startExam() {
    if (!quiz || !user || user.role !== 'student' || !quiz.questionCount || upcoming || closed || starting) return;
    setStarting(true);
    setError('');
    try {
      const response = await fetch(`/api/quizzes/${quizId}/start`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start the exam.');
      const nextAttempt = { ...data, id: data.attemptId };
      setAttempt(nextAttempt);
      window.localStorage.setItem(attemptStorageKey(user.id, quizId), nextAttempt.id);
      setAnswers(Array(data.questions.length).fill(-1));
      setMarked(Array(data.questions.length).fill(false));
      setCurrent(0);
      setSecondsLeft(Math.max(0, Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
      setResult(null);
      submitLock.current = false;
      saveQueue.current = Promise.resolve();
      saveCount.current = 0;
    } catch (err) {
      setError(err.message || 'Could not start the exam.');
    } finally {
      setStarting(false);
    }
  }

  function setAnswer(index, selectedIndex) {
    if (secondsLeft <= 0 || submitting) return;
    const nextAnswers = [...answers];
    nextAnswers[index] = selectedIndex;
    setAnswers(nextAnswers);
    persistState(nextAnswers, marked);
  }

  function toggleReview(index) {
    const nextMarked = [...marked];
    nextMarked[index] = !nextMarked[index];
    setMarked(nextMarked);
    persistState(answers, nextMarked);
  }

  function retake() {
    if (user?.id) window.localStorage.removeItem(attemptStorageKey(user.id, quizId));
    setAttempt(null);
    setAnswers([]);
    setMarked([]);
    setCurrent(0);
    setResult(null);
    setError('');
    setSecondsLeft(0);
    submitLock.current = false;
    saveQueue.current = Promise.resolve();
  }

  if (loading) return <div role="status" className="mx-auto max-w-3xl animate-pulse px-4 py-12"><div className="h-8 w-2/3 rounded bg-violet-100" /><div className="mt-6 h-64 rounded-2xl bg-white" /><span className="sr-only">Loading exam</span></div>;
  if (!quiz) return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><p role="alert" className="text-rose-700">{error || 'Exam not found.'}</p><a href="/" className="mt-4 inline-flex min-h-11 items-center text-violet-700">Back to exams</a></div>;

  if (result) return <div className="min-h-[70vh] bg-gradient-to-br from-violet-50 via-[#fbfaff] to-amber-50/50 px-4 py-10"><div className="mx-auto max-w-4xl">
    <section className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-violet-700">Exam submitted</p><h1 className="mt-2 text-3xl font-black text-violet-950">{quiz.title}</h1><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-lg bg-violet-50 p-4"><p className="text-2xl font-extrabold">{result.score}/{result.maxScore}</p><p className="text-xs text-slate-600">Score</p></div><div className="rounded-lg bg-violet-50 p-4"><p className="text-2xl font-extrabold">{result.percentage}%</p><p className="text-xs text-slate-600">Score percentage</p></div><div className="rounded-lg bg-violet-50 p-4"><p className="text-2xl font-extrabold">{result.accuracy}%</p><p className="text-xs text-slate-600">Accuracy</p></div><div className="rounded-lg bg-violet-50 p-4"><p className="text-2xl font-extrabold">{formatTime(result.timeTakenSeconds)}</p><p className="text-xs text-slate-600">Time taken</p></div></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600"><span>Correct: {result.correctCount}</span><span>Wrong: {result.wrongCount}</span><span>Unanswered: {result.unansweredCount}</span></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={retake} className="min-h-11 rounded-lg bg-violet-700 px-4 font-semibold text-white">Retake exam</button><a href={`/results/${result.resultId}`} className="inline-flex min-h-11 items-center rounded-lg border border-violet-200 px-4 font-semibold text-violet-800">View saved result</a><a href={`/leaderboard/${quizId}`} className="inline-flex min-h-11 items-center rounded-lg border border-violet-200 px-4 font-semibold text-violet-800">Leaderboard</a></div></section>
    <section className="mt-8 space-y-3" aria-labelledby="exam-review"><h2 id="exam-review" className="text-xl font-bold text-violet-950">Question review</h2>{result.review.map((item, index) => <article key={index} className={`rounded-xl border p-5 ${item.isCorrect ? 'border-emerald-200 bg-emerald-50' : item.selectedIndex < 0 ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}><div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold text-slate-900">{index + 1}. {item.questionText}</h3><span className="text-sm font-bold text-violet-800">{item.marksAwarded > 0 ? '+' : ''}{item.marksAwarded}/{item.maxMarks}</span></div><p className="mt-3 text-sm text-slate-700"><b>Your answer:</b> {item.selectedIndex >= 0 ? item.options[item.selectedIndex] : 'Unanswered'}</p><p className="mt-1 text-sm text-emerald-800"><b>Correct answer:</b> {item.options[item.correctIndex]}</p>{item.explanation && <p className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-600">{item.explanation}</p>}</article>)}</section>
  </div></div>;

  if (attempt) {
    const question = attempt.questions[current];
    const progress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
    return <div className="min-h-[70vh] bg-gradient-to-br from-violet-50 via-[#fbfaff] to-amber-50/50 px-4 py-7"><div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold text-violet-950">{attempt.title}</h1><p className="text-sm text-slate-600">Question {current + 1} of {totalQuestions} · {attempt.maxScore} marks · −{attempt.negativeMarks} per wrong · {answeredCount} answered · {marked.filter(Boolean).length} for review</p></div><div role="timer" aria-live="polite" className={`rounded-full px-4 py-2 text-lg font-extrabold tabular-nums ${secondsLeft <= 60 ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300' : 'bg-violet-100 text-violet-900'}`}>{formatTime(secondsLeft)}</div></div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-pink-500 transition-all" style={{ width: `${progress}%` }} /></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <section className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap justify-between gap-3"><p className="text-xs font-bold uppercase tracking-widest text-violet-700">Question {current + 1}</p><p className="text-sm font-semibold text-amber-800">{question.marks} marks</p></div><h2 className="mt-3 text-xl font-semibold leading-7 text-violet-950">{question.questionText}</h2><div className="mt-6 space-y-3">{question.options.map((option, optionIndex) => <button key={optionIndex} type="button" disabled={submitting || secondsLeft <= 0} aria-pressed={answers[current] === optionIndex} onClick={() => setAnswer(current, optionIndex)} className={`min-h-12 w-full rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-60 ${answers[current] === optionIndex ? 'border-violet-500 bg-violet-50 font-semibold text-violet-900' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/60'}`}>{option}</button>)}</div>
          <div className="mt-6 flex flex-wrap gap-2"><button type="button" disabled={answers[current] < 0 || saving || submitting} onClick={() => setAnswer(current, -1)} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-40">Clear answer</button><button type="button" disabled={saving || submitting} aria-pressed={marked[current]} onClick={() => toggleReview(current)} className={`min-h-11 rounded-lg border px-4 text-sm font-semibold disabled:opacity-50 ${marked[current] ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-amber-200 text-amber-800'}`}>{marked[current] ? 'Remove review mark' : 'Mark for review'}</button>{saving && <span role="status" className="inline-flex min-h-11 items-center text-xs text-slate-500">Saving progress...</span>}</div>
        </section>
        <aside className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm"><h2 className="text-sm font-bold text-violet-950">Question palette</h2><p className="mt-1 text-xs text-slate-500">Green: answered · Amber: review</p><div className="mt-4 grid grid-cols-5 gap-2">{attempt.questions.map((_, index) => <button key={index} type="button" aria-label={`Question ${index + 1}${answers[index] >= 0 ? ', answered' : ', unanswered'}${marked[index] ? ', marked for review' : ''}`} aria-current={current === index ? 'step' : undefined} onClick={() => setCurrent(index)} className={`grid aspect-square min-h-10 place-items-center rounded-lg border text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${marked[index] ? 'border-amber-300 bg-amber-100 text-amber-950' : answers[index] >= 0 ? 'border-emerald-300 bg-emerald-100 text-emerald-950' : 'border-slate-200 bg-slate-50 text-slate-700'} ${current === index ? 'ring-2 ring-violet-600 ring-offset-1' : ''}`}>{index + 1}</button>)}</div><div className="mt-4 space-y-1 text-xs text-slate-600"><p>Answered: {answeredCount}</p><p>Unanswered: {totalQuestions - answeredCount}</p></div></aside>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={current === 0 || submitting} onClick={() => setCurrent((index) => Math.max(0, index - 1))} className="min-h-11 rounded-lg border border-violet-200 bg-white px-5 font-semibold text-violet-800 disabled:opacity-40">← Previous</button><span className="text-xs text-slate-500">{saving ? 'Saving answers...' : 'Progress saved'}</span><div className="flex gap-2">{current < totalQuestions - 1 && <button type="button" disabled={submitting} onClick={() => setCurrent((index) => Math.min(totalQuestions - 1, index + 1))} className="min-h-11 rounded-lg bg-violet-700 px-5 font-semibold text-white disabled:opacity-50">Next →</button>}<button type="button" disabled={submitting || saving || (secondsLeft > 0 && answeredCount < totalQuestions)} onClick={submitExam} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-500 px-5 font-bold text-violet-950 disabled:cursor-not-allowed disabled:opacity-50">{submitting && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-violet-950/30 border-t-violet-950" />}{submitting ? 'Submitting...' : secondsLeft <= 0 ? 'Time expired · Submit' : answeredCount < totalQuestions ? 'Answer all questions' : 'Submit exam'}</button></div></div>
    </div></div>;
  }

  const examDate = quiz.availableFrom ? new Date(quiz.availableFrom) : null;
  const isUpcoming = examDate && examDate.getTime() > Date.now();
  const isClosed = quiz.expired || (quiz.availableUntil && new Date(quiz.availableUntil).getTime() <= Date.now());
  const startDisabled = starting || !user || user.role !== 'student' || !quiz.questionCount || isUpcoming || isClosed;
  return <div className="min-h-[70vh] bg-gradient-to-br from-violet-50 via-[#fbfaff] to-amber-50/60 px-4 py-10 sm:py-14"><div className="mx-auto max-w-2xl rounded-2xl border border-violet-100 border-t-4 border-t-pink-400 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Exam instructions</p><h1 className="mt-2 text-2xl font-black text-violet-950">{quiz.title}</h1><p className="mt-2 text-slate-600">{quiz.description}</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-lg bg-violet-50 p-3"><p className="text-xl font-extrabold text-violet-950">{quiz.questionsPerAttempt || quiz.questionCount}{quiz.questionsPerAttempt ? ` / ${quiz.questionCount}` : ''}</p><p className="text-xs text-slate-600">Questions {quiz.questionsPerAttempt ? '(selected / pool)' : ''}</p></div><div className="rounded-lg bg-violet-50 p-3"><p className="text-xl font-extrabold text-violet-950">{quiz.totalMarks}</p><p className="text-xs text-slate-600">{quiz.questionsPerAttempt ? 'Pool marks' : 'Total marks'}</p></div><div className="rounded-lg bg-violet-50 p-3"><p className="text-xl font-extrabold text-violet-950">{quiz.timeLimitMinutes} min</p><p className="text-xs text-slate-600">Duration</p></div><div className="rounded-lg bg-violet-50 p-3"><p className="text-xl font-extrabold text-violet-950">−{quiz.negativeMarks}</p><p className="text-xs text-slate-600">Wrong answer</p></div></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600"><span>{quiz.subject || quiz.category}</span>{quiz.topic && <span>{quiz.topic}</span>}<span>{quiz.difficulty}</span></div><div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/70 p-4"><h2 className="font-bold text-amber-950">Before you begin</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700"><li>Correct answers earn the marks shown beside each question.</li><li>Wrong answers deduct {quiz.negativeMarks} marks; unanswered questions earn or lose 0 marks.</li><li>Your answer and review marks save as you work.</li><li>Once submitted, an exam attempt cannot be changed.</li>{quiz.availableUntil && <li>Exam closes {formatDate(quiz.availableUntil)}.</li>}</ul>{quiz.instructions && <p className="mt-3 whitespace-pre-wrap border-t border-amber-200 pt-3 text-sm leading-6 text-slate-700">{quiz.instructions}</p>}</div>{!user && !loading && <p className="mt-5 text-sm text-slate-600">Sign in with a student account to begin.</p>}{isUpcoming && <p role="status" className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This exam opens {formatDate(quiz.availableFrom)}.</p>}{isClosed && <p role="status" className="mt-5 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">This exam is closed.</p>}{quiz.questionCount === 0 && <p role="status" className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This exam has no questions and cannot be started.</p>}{error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" disabled={startDisabled} onClick={startExam} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-violet-700 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{starting && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{starting ? 'Preparing exam...' : 'I understand · Start exam'}</button><a href="/dashboard" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-violet-200 px-5 font-semibold text-violet-800">Dashboard</a></div></div></div>;
}
