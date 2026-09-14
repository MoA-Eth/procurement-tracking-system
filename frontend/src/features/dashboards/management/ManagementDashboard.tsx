"use client";

import type { AuthUser } from "@/lib/authTypes";
import { DirectorDashboard } from "../director/DirectorDashboard";

interface ManagementDashboardProps {
  user: AuthUser;
}

export function ManagementDashboard({ user }: ManagementDashboardProps) {
  return <DirectorDashboard user={user} />;
}
