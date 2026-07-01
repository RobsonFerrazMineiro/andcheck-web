import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({
  cards = 4,
  rows = 6,
}: {
  cards?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-14 rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
