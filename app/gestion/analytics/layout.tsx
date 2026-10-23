import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PlatformShell from "@/components/platform/PlatformShell";
import { getOperationSession } from "@/lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getOperationSession();
  const authorization = authorizeOperationSession(session, "analytics.view");
  if (!authorization.ok) redirect("/admin/login");
  return <PlatformShell>{children}</PlatformShell>;
}
