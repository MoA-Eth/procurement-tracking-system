import { redirect } from "next/navigation";
import { UserManagementView } from "@/features/dashboards/admin/UserManagementView";
import { requireAuthenticatedSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
  const session = await requireAuthenticatedSession();

  if (session.user.role !== "ADMIN") {
    redirect("/access-denied");
  }

  return <UserManagementView currentUser={session.user} />;
}
