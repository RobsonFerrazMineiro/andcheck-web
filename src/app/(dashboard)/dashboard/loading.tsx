import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function DashboardLoading() {
  return <PageSkeleton cards={4} rows={6} />;
}
