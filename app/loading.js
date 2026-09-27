export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 sm:px-6 sm:py-14" aria-label="Loading quizzes" role="status">
      <span className="sr-only">Loading quizzes</span>
      <div className="mb-10 space-y-4">
        <div className="h-4 w-32 rounded bg-violet-100" />
        <div className="h-12 max-w-xl rounded-lg bg-violet-100" />
        <div className="h-5 max-w-lg rounded bg-slate-200" />
        <div className="grid grid-cols-3 gap-3 pt-3">
          <div className="h-20 rounded-xl bg-white ring-1 ring-violet-100" />
          <div className="h-20 rounded-xl bg-white ring-1 ring-violet-100" />
          <div className="h-20 rounded-xl bg-white ring-1 ring-violet-100" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-52 rounded-2xl bg-white ring-1 ring-violet-100" />
        ))}
      </div>
    </div>
  );
}
