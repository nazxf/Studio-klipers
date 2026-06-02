import type { ReactNode } from "react";
import type { Session } from "next-auth";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export function DashboardShell({
  children,
  user,
}: {
  children: ReactNode;
  user: Session["user"];
}) {
  return (
    <div className="control-room min-h-[100dvh] bg-background">
      <div className="flex min-h-[100dvh]">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar user={user} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
