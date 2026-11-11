import type { ReactNode } from "react";
import { AuthGuard } from "../../../features/auth/AuthProvider";
import { DashboardShell } from "../../../features/dashboard/components/DashboardShell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
