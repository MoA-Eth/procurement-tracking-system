import { redirect } from "next/navigation";
import { dashboardPath } from "../../../lib/authTypes";
import { requireAuthenticatedSession } from "../../../lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function DashboardRootPage() {
  const session = await requireAuthenticatedSession();
  redirect(dashboardPath(session.user.role));
}
