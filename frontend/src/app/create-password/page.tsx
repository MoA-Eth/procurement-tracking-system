import { redirect } from "next/navigation";
import { CreatePasswordForm } from "../../components/auth/CreatePasswordForm";

export const dynamic = "force-dynamic";

export default async function CreatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  if (!token) redirect("/");
  return <CreatePasswordForm token={token} />;
}
