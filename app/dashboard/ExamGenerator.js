'use client';

import { useState } from 'react';

const presets = ['AWS Cloud Solutions Architect', 'React 19 & Modern Web Performance', 'USMLE Clinical Biochemistry', 'GRE Quantitative & Probability', 'Machine Learning & Transformer Models', 'Cardiology & ECG Arrhythmias'];

export default function ExamGenerator() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ subject: '', syllabus: '', category: 'Computer Science & Tech', difficulty: 'Medium', questionCount: 5, duration: 15, negativeMarks: 0.25 });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, questionCount: Number(form.questionCount), duration: Number(form.duration), negativeMarks: Number(form.negativeMarks) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not generate an exam.');
      window.location.assign(`/quiz/${data.id}`);
    } catch (err) {
      setError(err.message || 'Could not generate an exam.');
      setLoading(false);
    }
  }

  return <>
    <button type="button" onClick={() => { setError(''); setOpen(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-violet-700">✦ Generate AI exam</button>
    {open && <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="student-generator-heading">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5"><div><h2 id="student-generator-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white">✦</span>Dynamic AI Exam Generator</h2><p className="mt-1 text-sm text-slate-500">Create a practice exam and start it immediately.</p></div><button type="button" aria-label="Close generator" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100">×</button></div>
        <form onSubmit={submit} className="space-y-5 px-6 py-6">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Quick subject presets</p><div className="flex flex-wrap gap-2">{presets.map((preset) => <button key={preset} type="button" onClick={() => update('subject', preset)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${form.subject === preset ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{preset}</button>)}</div></div>
          <label className="block text-sm font-semibold text-slate-700">Exam subject or core topic *<input required maxLength={120} value={form.subject} onChange={(event) => update('subject', event.target.value)} placeholder="e.g. Advanced React Runtimes" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" /></label>
          <label className="block text-sm font-semibold text-slate-700">Optional: syllabus or study notes<textarea maxLength={12000} rows={3} value={form.syllabus} onChange={(event) => update('syllabus', event.target.value)} placeholder="Paste notes here to focus the questions..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-normal focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" /></label>
          <div className="grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Category<select value={form.category} onChange={(event) => update('category', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option>Computer Science & Tech</option><option>Science</option><option>General</option><option>Professional</option><option>Other</option></select></label><label className="text-sm font-semibold text-slate-700">Difficulty<select value={form.difficulty} onChange={(event) => update('difficulty', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option>Easy</option><option>Medium</option><option>Hard</option></select></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><fieldset><legend className="text-sm font-semibold text-slate-700">Question count: <span className="text-violet-700">{form.questionCount}</span></legend><div className="mt-2 grid grid-cols-3 gap-2">{[5, 10, 15].map((count) => <button key={count} type="button" onClick={() => update('questionCount', count)} className={`min-h-10 rounded-lg border text-sm font-semibold ${Number(form.questionCount) === count ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{count} Questions</button>)}</div></fieldset><fieldset><legend className="text-sm font-semibold text-slate-700">Duration: <span className="text-violet-700">{form.duration} min</span></legend><div className="mt-2 grid grid-cols-3 gap-2">{[10, 15, 20].map((duration) => <button key={duration} type="button" onClick={() => update('duration', duration)} className={`min-h-10 rounded-lg border text-sm font-semibold ${Number(form.duration) === duration ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{duration} Mins</button>)}</div></fieldset></div>
          <fieldset><legend className="text-sm font-semibold text-slate-700">Negative marking scheme</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{[[0, 'None (0)'], [0.25, '-0.25 (1/4)'], [0.33, '-0.33 (1/3)'], [0.5, '-0.50 (1/2)']].map(([value, label]) => <button key={label} type="button" onClick={() => update('negativeMarks', value)} className={`min-h-10 rounded-lg border text-sm font-semibold ${Number(form.negativeMarks) === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{label}</button>)}</div></fieldset>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" disabled={loading || !form.subject.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Generating exam...' : '✦ Start timed exam'}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
