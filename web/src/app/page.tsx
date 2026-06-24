import { redirect } from "next/navigation";

/**
 * Root "/" redirects to the dashboard.
 * In Phase 2, middleware.ts will handle unauthenticated → /login routing
 * before this ever renders.
 */
export default function Home() {
  redirect("/dashboard");
}
