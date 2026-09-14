import { redirect } from "next/navigation";
import { ChangePasswordForm } from "../../components/auth/ChangePasswordForm";
import { dashboardPath } from "../../lib/authTypes";
import { getServerSession } from "../../lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await getServerSession();
  if (!session) redirect("/");
  if (session.status === "AUTHENTICATED") {
    redirect(dashboardPath(session.user.role));
  }
  return <ChangePasswordForm />;
}
