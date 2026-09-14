import { notFound, redirect } from "next/navigation";
import { DashboardRenderer } from "@/features/dashboards/DashboardRenderer";
import { normalizeUserRole, roleFromSlug } from "../../../../lib/authTypes";
import { requireAuthenticatedSession } from "../../../../lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ role: string }> | { role: string };
}) {
  const session = await requireAuthenticatedSession();
  const resolvedParams = await Promise.resolve(params);
  const roleSlug = resolvedParams?.role;
  const requestedRole = roleSlug ? roleFromSlug(roleSlug) : undefined;
  if (!requestedRole) notFound();

  const userRole = normalizeUserRole(session.user.role);
  if (requestedRole !== userRole) redirect("/access-denied");

  return <DashboardRenderer user={{ ...session.user, role: userRole }} />;
}
