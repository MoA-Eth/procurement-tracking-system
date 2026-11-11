import { redirect } from "next/navigation";
import { UserManagementView } from "@/features/dashboards/admin/UserManagementView";
import { normalizeUserRole } from "@/lib/authTypes";
import { requireAuthenticatedSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
  const session = await requireAuthenticatedSession();

  if (!["ADMIN", "SUPERUSER"].includes(normalizeUserRole(session.user.role))) {
    redirect("/access-denied");
  }

  return <UserManagementView currentUser={session.user} />;
}
