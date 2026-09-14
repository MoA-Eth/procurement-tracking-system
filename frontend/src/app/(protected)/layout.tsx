import type { ReactNode } from "react";
import { AppShell } from "../../components/dashboard/AppShell";
import { requireAuthenticatedSession } from "../../lib/serverAuth";
import { TabSessionGuard } from "../../components/auth/TabSessionGuard";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAuthenticatedSession();
  return (
    <TabSessionGuard>
      <AppShell user={session.user}>{children}</AppShell>
    </TabSessionGuard>
  );
}
