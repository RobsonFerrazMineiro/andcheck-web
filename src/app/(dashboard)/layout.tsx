import { MobileHeader } from "@/components/layout/mobile-header";
import { Sidebar } from "@/components/layout/sidebar";
import { Activity } from "lucide-react";

const NORMS = ["NR-18", "NR-35", "NBR 6494"];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <MobileHeader />

      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0 min-h-screen flex flex-col">
        {/* Topbar — apenas desktop */}
        <div className="hidden lg:flex items-center justify-between bg-card border-b border-border px-6 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Sistema operacional
            </span>
          </div>
          <div className="flex items-center gap-4">
            {NORMS.map((n) => (
              <span
                key={n}
                className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-wider"
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
