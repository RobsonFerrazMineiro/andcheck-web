import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function WorkspacesLoading() {
  return <PageSkeleton cards={4} rows={8} />;
}
