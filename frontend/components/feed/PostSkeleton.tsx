export default function PostSkeleton() {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-muted shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-32 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
        <div className="h-3 w-3/5 rounded bg-muted" />
      </div>
      <div className="flex gap-3 pt-1">
        <div className="h-7 w-14 rounded-lg bg-muted" />
        <div className="h-7 w-14 rounded-lg bg-muted" />
        <div className="h-7 w-14 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
