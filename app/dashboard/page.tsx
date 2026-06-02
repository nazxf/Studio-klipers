import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getDashboardStats, getRecentProcessingJobs } from "@/server/dashboard";
import { requireCurrentUser } from "@/server/current-user";

export default async function DashboardPage() {
  const user = await requireCurrentUser("/dashboard");
  const [stats, processingJobs] = await Promise.all([
    getDashboardStats(user.id),
    getRecentProcessingJobs(user.id),
  ]);

  return (
    <DashboardShell user={user}>
      <DashboardHome stats={stats} processingJobs={processingJobs} />
    </DashboardShell>
  );
}
