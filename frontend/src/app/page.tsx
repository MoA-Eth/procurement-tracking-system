import { redirect } from "next/navigation";
import App from "../App";
import { getServerSession } from "../lib/serverAuth";
import { dashboardPath } from "../lib/authTypes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession();
  if (session?.user && session.status === "AUTHENTICATED") {
    redirect(dashboardPath(session.user.role));
  }
  return <App />;
}
