import { ProfileView } from "@/components/profile/ProfileView";
import { requireAuthenticatedSession } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireAuthenticatedSession();
  return <ProfileView user={session.user} />;
}
