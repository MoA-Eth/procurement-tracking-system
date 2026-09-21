"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { AuthUser } from "@/lib/authTypes";
import { normalizeUserRole } from "@/lib/authTypes";
import {
  fetchUsers,
  fetchAuditLogs,
  updateUser,
  type ApiUser,
  type AuditLogEntry,
} from "@/lib/adminApi";

export function useAdminDashboard(currentUser: AuthUser) {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [totalUserCount, setTotalUserCount] = useState<number>(0);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const usersRes = await fetchUsers({ pageSize: 50 });
      if (usersRes && Array.isArray(usersRes.data)) {
        setUsers(usersRes.data);
        setTotalUserCount(usersRes.meta?.total ?? usersRes.data.length);
      }
    } catch {
      // Keep empty state
    }

    try {
      const logsRes = await fetchAuditLogs({ pageSize: 5 });
      if (logsRes && Array.isArray(logsRes.data)) {
        setLogs(logsRes.data);
      }
    } catch {
      // Keep empty state
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetchUsers({ pageSize: 50 })
      .then((usersRes) => {
        if (active && usersRes && Array.isArray(usersRes.data)) {
          setUsers(usersRes.data);
          setTotalUserCount(usersRes.meta?.total ?? usersRes.data.length);
        }
      })
      .catch((err) => {
        console.warn("Notice: Failed to fetch users for admin dashboard:", err);
      })
      .finally(() => {
        if (active) setIsUsersLoading(false);
      });

    fetchAuditLogs({ pageSize: 5 })
      .then((logsRes) => {
        if (active && logsRes && Array.isArray(logsRes.data)) {
          setLogs(logsRes.data);
        }
      })
      .catch((err) => {
        console.warn(
          "Notice: Failed to fetch audit logs for admin dashboard:",
          err,
        );
      })
      .finally(() => {
        if (active) setIsLogsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleToggleStatus = async (targetUser: ApiUser) => {
    if (
      targetUser.isActive &&
      (targetUser.id === currentUser.id ||
        (targetUser.email &&
          currentUser.email &&
          targetUser.email.toLowerCase() === currentUser.email.toLowerCase()))
    ) {
      return;
    }
    setTogglingId(targetUser.id);
    try {
      await updateUser(targetUser.id, { isActive: !targetUser.isActive });
      await loadData();
    } catch {
      // Handle gracefully
    } finally {
      setTogglingId(null);
    }
  };

  const metrics = useMemo(() => {
    const totalAccounts = totalUserCount || users.length;
    const activeAccess = users.filter(
      (u) => u.isActive && u.status !== "PENDING_INVITATION",
    ).length;
    const deactivatedAccounts = users.filter((u) => !u.isActive).length;

    let officersCount = 0;
    let directorsCount = 0;
    let committeeCount = 0;
    let managementTeamCount = 0;
    let adminsCount = 0;

    for (const u of users) {
      const roleStr = u.authRole || u.role;
      const normalized = normalizeUserRole(roleStr);
      if (normalized === "OFFICER") officersCount++;
      else if (normalized === "DIRECTOR") directorsCount++;
      else if (normalized === "ENDORSING_COMMITTEE") committeeCount++;
      else if (normalized === "MANAGEMENT") managementTeamCount++;
      else if (normalized === "ADMIN") adminsCount++;
    }

    return {
      totalAccounts,
      activeAccess,
      deactivatedAccounts,
      officersCount,
      directorsCount,
      committeeCount,
      managementTeamCount,
      adminsCount,
    };
  }, [totalUserCount, users]);

  return {
    users,
    isUsersLoading,
    logs,
    isLogsLoading,
    togglingId,
    handleToggleStatus,
    refreshData: loadData,
    metrics,
  };
}
