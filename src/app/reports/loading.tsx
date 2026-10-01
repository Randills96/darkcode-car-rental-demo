export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 rounded-lg bg-muted" />
      <div className="h-24 rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-96 rounded-lg bg-muted" />
    </div>
  );
}
