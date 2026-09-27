'use client';

import { useEffect, useState } from 'react';

const newQuestion = () => ({ questionText: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', marks: 1 });
const emptyQuiz = () => ({
  title: '', description: '', category: 'General', subject: '', topic: '', difficulty: 'Medium',
  timeLimitMinutes: 10, negativeMarks: 0, questionsPerAttempt: 0, randomizeQuestions: true,
  randomizeOptions: true, instructions: '', published: true, availableFrom: '', availableUntil: '',
  questions: [newQuestion()],
});

function dateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [form, setForm] = useState(emptyQuiz());
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorError, setGeneratorError] = useState('');
  const [generator, setGenerator] = useState({ subject: '', syllabus: '', category: 'Computer Science & Tech', difficulty: 'Medium', questionCount: 5, duration: 15, negativeMarks: 0.25 });

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || data.user?.role !== 'admin') {
          if (active) setError('Sign in with an administrator account to manage quizzes.');
          return;
        }
        if (active) setIsAdmin(true);
        await loadQuizzes(active);
      } catch {
        if (active) setError('Could not check administrator access.');
      } finally {
        if (active) setChecking(false);
      }
    }
    initialize();
    return () => { active = false; };
  }, []);

  async function loadQuizzes(active = true) {
    const response = await fetch('/api/admin/quizzes', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load quizzes.');
    if (active) setQuizzes(data.quizzes || []);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateQuestion(questionIndex, field, value) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => index === questionIndex ? { ...question, [field]: value } : question),
    }));
  }

  function updateOption(questionIndex, optionIndex, value) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => index === questionIndex
        ? { ...question, options: question.options.map((option, currentIndex) => currentIndex === optionIndex ? value : option) }
        : question),
    }));
  }

  function editQuiz(quiz) {
    setEditingId(quiz.id);
    setForm({ ...emptyQuiz(), ...quiz, availableFrom: dateTimeInput(quiz.availableFrom), availableUntil: dateTimeInput(quiz.availableUntil), questions: quiz.questions.map((question) => ({ ...question, marks: question.marks || 1, options: [...question.options] })) });
    setError('');
    setNotice('');
    document.getElementById('quiz-editor')?.scrollIntoView({ behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId('');
    setForm(emptyQuiz());
    setError('');
    setNotice('');
  }

  function updateGenerator(field, value) {
    setGenerator((current) => ({ ...current, [field]: value }));
  }

  async function generateExam(event) {
    event.preventDefault();
    setGeneratorLoading(true);
    setGeneratorError('');
    try {
      const response = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...generator, questionCount: Number(generator.questionCount), duration: Number(generator.duration), negativeMarks: Number(generator.negativeMarks) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not generate an exam.');
      setForm({ ...emptyQuiz(), ...data.quiz });
      setEditingId('');
      setGeneratorOpen(false);
      setNotice('AI draft generated. Review the questions, then save the quiz.');
      document.getElementById('quiz-editor')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setGeneratorError(err.message || 'Could not generate an exam.');
    } finally {
      setGeneratorLoading(false);
    }
  }

  async function submitQuiz(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(editingId ? `/api/admin/quizzes/${editingId}` : '/api/admin/quizzes', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          timeLimitMinutes: Number(form.timeLimitMinutes),
          negativeMarks: Number(form.negativeMarks),
          questionsPerAttempt: Number(form.questionsPerAttempt),
          availableFrom: form.availableFrom ? new Date(form.availableFrom).toISOString() : null,
          availableUntil: form.availableUntil ? new Date(form.availableUntil).toISOString() : null,
          questions: form.questions.map((question) => ({ ...question, marks: Number(question.marks) })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save quiz.');
      await loadQuizzes();
      setNotice(editingId ? 'Quiz updated.' : 'Quiz created.');
      setEditingId('');
      setForm(emptyQuiz());
    } catch (err) {
      setError(err.message || 'Could not save quiz.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteQuiz(quiz) {
    if (!window.confirm(`Delete “${quiz.title}”? Existing attempt history is retained.`)) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/quizzes/${quiz.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete quiz.');
      await loadQuizzes();
      if (editingId === quiz.id) resetForm();
      setNotice('Quiz deleted. Attempt history is retained.');
    } catch (err) {
      setError(err.message || 'Could not delete quiz.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <div role="status" className="mx-auto max-w-5xl animate-pulse px-4 py-12"><div className="h-9 w-64 rounded bg-violet-100" /><div className="mt-8 h-64 rounded-xl bg-white" /><span className="sr-only">Checking administrator access</span></div>;

  if (!isAdmin) return <div className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-2xl font-bold text-violet-950">Admin access required</h1><p role="alert" className="mt-2 text-slate-600">{error}</p><a href="/auth" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-violet-700 px-5 font-semibold text-white">Sign in</a></div>;

  return (
    <div className="min-h-[70vh] bg-[#fbfaff]">
      <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Content studio</p><h1 className="mt-2 text-3xl font-black text-violet-950">Quiz administration</h1></div><a href="/dashboard" className="inline-flex min-h-11 items-center rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-800">Student dashboard</a></div>
        {error && <p role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

        <section className="mt-8" aria-labelledby="quiz-admin-list">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="quiz-admin-list" className="text-xl font-bold text-violet-950">Quizzes ({quizzes.length})</h2><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setGeneratorError(''); setGeneratorOpen(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-800">✦ Generate with AI</button><button type="button" onClick={resetForm} className="min-h-11 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white">Create quiz</button></div></div>
          <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white"><table className="w-full min-w-[540px] text-left text-sm"><thead className="bg-violet-50 text-xs uppercase text-violet-900"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Questions</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{quizzes.map((quiz) => <tr key={quiz.id}><td className="px-4 py-3 font-semibold">{quiz.title}</td><td className="px-4 py-3">{quiz.category}</td><td className="px-4 py-3">{quiz.questions.length}</td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" disabled={loading} onClick={() => editQuiz(quiz)} className="min-h-10 rounded-md border border-violet-200 px-3 font-semibold text-violet-800 disabled:opacity-50">Edit</button><button type="button" disabled={loading} onClick={() => deleteQuiz(quiz)} className="min-h-10 rounded-md border border-rose-200 px-3 font-semibold text-rose-700 disabled:opacity-50">Delete</button></div></td></tr>)}</tbody></table></div>
        </section>

        <section id="quiz-editor" className="mt-10 scroll-mt-24" aria-labelledby="editor-heading">
          <h2 id="editor-heading" className="text-xl font-bold text-violet-950">{editingId ? 'Edit quiz' : 'Create a quiz'}</h2>
          <form onSubmit={submitQuiz} className="mt-4 space-y-6 rounded-xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Title<input required maxLength={120} value={form.title} onChange={(event) => updateField('title', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Category<input required maxLength={80} value={form.category} onChange={(event) => updateField('category', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Subject<input maxLength={80} value={form.subject} onChange={(event) => updateField('subject', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Topic<input maxLength={120} value={form.topic} onChange={(event) => updateField('topic', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description<textarea maxLength={1000} rows={2} value={form.description} onChange={(event) => updateField('description', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Difficulty<select value={form.difficulty} onChange={(event) => updateField('difficulty', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
              <label className="text-sm font-semibold text-slate-700">Time limit (minutes)<input type="number" required min={1} max={240} value={form.timeLimitMinutes} onChange={(event) => updateField('timeLimitMinutes', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Negative marks per wrong answer<input type="number" required min={0} max={1000} step="0.25" value={form.negativeMarks} onChange={(event) => updateField('negativeMarks', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Questions per attempt <span className="font-normal text-slate-500">(0 = all)</span><input type="number" required min={0} max={200} value={form.questionsPerAttempt} onChange={(event) => updateField('questionsPerAttempt', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Available from<input type="datetime-local" value={form.availableFrom || ''} onChange={(event) => updateField('availableFrom', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Available until<input type="datetime-local" value={form.availableUntil || ''} onChange={(event) => updateField('availableUntil', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Exam instructions<textarea maxLength={5000} rows={4} value={form.instructions} onChange={(event) => updateField('instructions', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" placeholder="Explain exam rules and expectations." /></label>
              <div className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-2">
                {[["published", 'Published'], ['randomizeQuestions', 'Randomize questions'], ['randomizeOptions', 'Randomize options']].map(([field, label]) => <label key={field} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form[field]} onChange={(event) => updateField(field, event.target.checked)} className="h-4 w-4 accent-violet-700" />{label}</label>)}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold text-violet-950">Questions ({form.questions.length})</h3><button type="button" disabled={form.questions.length >= 200} onClick={() => updateField('questions', [...form.questions, newQuestion()])} className="min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-800 disabled:opacity-50">Add question</button></div>
              {form.questions.map((question, questionIndex) => <fieldset key={questionIndex} className="rounded-lg border border-slate-200 p-4"><legend className="px-1 text-sm font-bold text-violet-900">Question {questionIndex + 1}</legend>
                <label className="text-sm font-semibold text-slate-700">Question text<textarea required maxLength={1000} rows={2} value={question.questionText} onChange={(event) => updateQuestion(questionIndex, 'questionText', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
                <div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-2"><label className="flex-1 text-xs font-semibold text-slate-500">Option {optionIndex + 1}<input required maxLength={300} value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-800" /></label><button type="button" aria-label={`Remove option ${optionIndex + 1} from question ${questionIndex + 1}`} disabled={question.options.length <= 2} onClick={() => { const options = question.options.filter((_, index) => index !== optionIndex); updateQuestion(questionIndex, 'options', options); updateQuestion(questionIndex, 'correctIndex', question.correctIndex >= options.length ? options.length - 1 : question.correctIndex > optionIndex ? question.correctIndex - 1 : question.correctIndex); }} className="mt-5 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-rose-200 text-lg text-rose-700 disabled:opacity-30">−</button></div>)}</div>
                <button type="button" disabled={question.options.length >= 8} onClick={() => updateQuestion(questionIndex, 'options', [...question.options, ''])} className="mt-2 min-h-10 rounded-lg border border-violet-200 px-3 text-sm font-semibold text-violet-800 disabled:opacity-50">Add option</button>
                <div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold text-slate-700">Correct answer<select value={question.correctIndex} onChange={(event) => updateQuestion(questionIndex, 'correctIndex', Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal">{question.options.map((_, index) => <option key={index} value={index}>Option {index + 1}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Marks<input type="number" required min={0.01} step="0.25" max={1000} value={question.marks} onChange={(event) => updateQuestion(questionIndex, 'marks', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label><label className="text-sm font-semibold text-slate-700">Explanation (optional)<input maxLength={2000} value={question.explanation} onChange={(event) => updateQuestion(questionIndex, 'explanation', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label></div>
                <button type="button" disabled={form.questions.length <= 1} onClick={() => updateField('questions', form.questions.filter((_, index) => index !== questionIndex))} className="mt-4 min-h-10 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 disabled:opacity-30">Remove question</button>
              </fieldset>)}
            </div>
            <div className="flex flex-wrap gap-3"><button type="submit" disabled={loading} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-violet-700 px-5 font-bold text-white disabled:opacity-60">{loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{loading ? 'Saving...' : editingId ? 'Save changes' : 'Create quiz'}</button>{editingId && <button type="button" disabled={loading} onClick={resetForm} className="min-h-12 rounded-lg border border-slate-300 px-5 font-semibold text-slate-700 disabled:opacity-50">Cancel edit</button>}</div>
          </form>
        </section>
        {generatorOpen && <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="generator-heading">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5"><div><h2 id="generator-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white">✦</span>Dynamic AI Exam Generator</h2><p className="mt-1 text-sm text-slate-500">Generate a targeted mock test on any topic or syllabus.</p></div><button type="button" aria-label="Close generator" onClick={() => setGeneratorOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button></div>
            <form onSubmit={generateExam} className="space-y-5 px-6 py-6">
              <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Quick subject presets</p><div className="flex flex-wrap gap-2">{['AWS Cloud Solutions Architect', 'React 19 & Modern Web Performance', 'USMLE Clinical Biochemistry', 'GRE Quantitative & Probability', 'Machine Learning & Transformer Models', 'Cardiology & ECG Arrhythmias'].map((preset) => <button key={preset} type="button" onClick={() => updateGenerator('subject', preset)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${generator.subject === preset ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-200'}`}>{preset}</button>)}</div></div>
              <label className="block text-sm font-semibold text-slate-700">Exam subject or core topic *<input required maxLength={120} value={generator.subject} onChange={(event) => updateGenerator('subject', event.target.value)} placeholder="e.g. Distributed Database Consistency, Advanced React Runtimes..." className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" /></label>
              <label className="block text-sm font-semibold text-slate-700">Optional: Paste syllabus, study notes, or lecture transcripts<span className="float-right text-xs font-normal text-slate-400">Derives questions from source</span><textarea maxLength={12000} rows={3} value={generator.syllabus} onChange={(event) => updateGenerator('syllabus', event.target.value)} placeholder="Paste specific textbook notes, articles, or documentation paragraphs here..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-normal focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" /></label>
              <div className="grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Category<select value={generator.category} onChange={(event) => updateGenerator('category', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option>Computer Science & Tech</option><option>Science</option><option>General</option><option>Professional</option><option>Other</option></select></label><label className="text-sm font-semibold text-slate-700">Difficulty<select value={generator.difficulty} onChange={(event) => updateGenerator('difficulty', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option>Easy</option><option>Medium</option><option>Hard</option></select></label></div>
              <div className="grid gap-4 sm:grid-cols-2"><fieldset><legend className="text-sm font-semibold text-slate-700">Question count: <span className="text-violet-700">{generator.questionCount}</span></legend><div className="mt-2 grid grid-cols-3 gap-2">{[5, 10, 15].map((count) => <button key={count} type="button" onClick={() => updateGenerator('questionCount', count)} className={`min-h-10 rounded-lg border text-sm font-semibold ${Number(generator.questionCount) === count ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{count} Questions</button>)}</div></fieldset><fieldset><legend className="text-sm font-semibold text-slate-700">Duration: <span className="text-violet-700">{generator.duration} min</span></legend><div className="mt-2 grid grid-cols-3 gap-2">{[10, 15, 20].map((duration) => <button key={duration} type="button" onClick={() => updateGenerator('duration', duration)} className={`min-h-10 rounded-lg border text-sm font-semibold ${Number(generator.duration) === duration ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{duration} Mins</button>)}</div></fieldset></div>
              <fieldset><legend className="text-sm font-semibold text-slate-700">Negative marking scheme</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{[[0, 'None (0)'], [0.25, '-0.25 (1/4)'], [0.33, '-0.33 (1/3)'], [0.5, '-0.50 (1/2)']].map(([value, label]) => <button key={label} type="button" onClick={() => updateGenerator('negativeMarks', value)} className={`min-h-10 rounded-lg border text-sm font-semibold ${Number(generator.negativeMarks) === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{label}</button>)}</div></fieldset>
              {generatorError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{generatorError}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setGeneratorOpen(false)} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" disabled={generatorLoading || !generator.subject.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{generatorLoading ? 'Generating exam...' : '✦ Generate & review'}</button></div>
            </form>
          </div>
        </div>}
      </div>
    </div>
  );
}
