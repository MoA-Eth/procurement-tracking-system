import { ArrowLeft, ShieldX } from "lucide-react";
import Link from "next/link";
import { dashboardPath } from "../../../lib/authTypes";
import { requireAuthenticatedSession } from "../../../lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function AccessDeniedPage() {
  const session = await requireAuthenticatedSession();

  return (
    <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
        <ShieldX size={32} />
      </div>
      <p className="mt-6 text-sm font-bold uppercase tracking-wider text-red-600">
        Access denied
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
        You do not have permission to view this page
      </h1>
      <p className="mx-auto mt-4 max-w-lg leading-7 text-slate-600">
        This section is not available for your assigned role. Use the sidebar to
        open one of your authorized workspaces.
      </p>
      <Link
        href={dashboardPath(session.user.role)}
        className="mx-auto mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#064a3a] px-5 font-bold text-white hover:bg-[#043b2d]"
      >
        <ArrowLeft size={18} /> Return to dashboard
      </Link>
    </section>
  );
}
