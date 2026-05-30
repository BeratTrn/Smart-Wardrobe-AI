import { AppShell } from "@/components/layout/AppShell";

/**
 * Dashboard Route Group Layout
 *
 * Wraps all routes under /(dashboard) with the AppShell (Sidebar + Topbar).
 * This is a Server Component — it simply passes children to the Client
 * Component AppShell, which is fully supported by React's architecture.
 *
 * In Phase 2, add authentication guard logic here (redirect to /login
 * if no valid JWT is found in cookies/headers via middleware.ts).
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
