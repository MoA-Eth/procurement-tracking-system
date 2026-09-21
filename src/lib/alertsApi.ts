import { apiClient } from "./apiClient";
import { normalizeUserRole } from "./authTypes";

export type NotificationPriority = "urgent" | "normal" | "info";
export type NotificationType =
  "plan" | "contract" | "activity" | "system" | "approval";

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: string;
  read: boolean;
  readAt?: string | null;
  link?: string;
  actionLabel?: string;
  targetRole?: string;
  targetRoles?: string[];
}

export function isNotificationForRole(
  notification: SystemNotification,
  userRole?: string | null,
): boolean {
  if (!userRole) return true;
  const normalizedUserRole = normalizeUserRole(userRole);

  const targets = notification.targetRoles
    ? notification.targetRoles
    : notification.targetRole
      ? [notification.targetRole]
      : [];

  // No targetRole = broadcast to ALL users
  if (targets.length === 0) return true;

  return targets.some((t) => {
    if (t === "ALL" || t === "*" || t === null) return true;
    return normalizeUserRole(t) === normalizedUserRole;
  });
}

export interface BackendAlert {
  id: string;
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  link?: string;
  targetRole?: string;
}

export function mapBackendAlertToNotification(
  alert: BackendAlert,
): SystemNotification {
  const priorityMap: Record<string, SystemNotification["priority"]> = {
    HIGH: "urgent",
    MEDIUM: "normal",
    LOW: "info",
    INFO: "info",
  };

  const typeMap: Record<string, SystemNotification["type"]> = {
    PLAN_REVIEW: "plan",
    CONTRACT_MILESTONE: "contract",
    ACTIVITY_DEADLINE: "activity",
    DECISION: "approval",
    SYSTEM: "system",
  };

  const calculatedType = typeMap[alert.type] || "system";
  const priority = priorityMap[alert.severity] || "normal";

  // Calculate relative timestamp
  const date = new Date(alert.createdAt);
  const now = new Date();
  const diffMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60),
  );
  let timestamp = "Just now";

  if (diffMinutes >= 1440) {
    const days = Math.floor(diffMinutes / 1440);
    timestamp = `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (diffMinutes >= 60) {
    const hours = Math.floor(diffMinutes / 60);
    timestamp = `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    timestamp = `${diffMinutes} min${diffMinutes > 1 ? "s" : ""} ago`;
  }

  const isRead = alert.readAt !== null && alert.readAt !== undefined;

  return {
    id: alert.id,
    title: alert.title,
    message: alert.message,
    type: calculatedType,
    priority,
    timestamp,
    read: isRead,
    readAt: alert.readAt,
    link: alert.link || getLinkForType(calculatedType, alert.targetRole),
    actionLabel: getActionLabel(calculatedType),
    targetRole: alert.targetRole,
  };
}

function getLinkForType(
  type: SystemNotification["type"],
  targetRole?: string,
): string {
  switch (type) {
    case "plan":
      if (targetRole === "OFFICER") return "/workspace/projects";
      return "/workspace/plan-for-review";
    case "contract":
      return "/workspace/contracts";
    case "activity":
      return "/workspace/activity-tracker";
    case "approval":
      if (targetRole === "ENDORSING_COMMITTEE")
        return "/workspace/my-decisions";
      return "/workspace/committee-progress";
    case "system":
    default:
      if (targetRole === "ADMIN") return "/workspace/system-logs";
      return "/workspace/reports";
  }
}

function getActionLabel(type: SystemNotification["type"]): string {
  switch (type) {
    case "plan":
      return "Review Plan";
    case "contract":
      return "View Contract";
    case "activity":
      return "Open Tracker";
    case "approval":
      return "View Decision";
    case "system":
    default:
      return "View Details";
  }
}

export function createLocalAlert(alert: {
  title: string;
  message: string;
  type?: string;
  severity?: "HIGH" | "MEDIUM" | "LOW" | "INFO";
  targetRole?: string;
  link?: string;
}): SystemNotification {
  const newAlert: BackendAlert = {
    id: `local-alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: alert.title,
    message: alert.message,
    type: alert.type || "DECISION",
    severity: alert.severity || "MEDIUM",
    createdAt: new Date().toISOString(),
    link: alert.link,
    targetRole: alert.targetRole || "OFFICER",
  };

  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem("pts_custom_alerts") || "[]",
      );
      stored.unshift(newAlert);
      window.localStorage.setItem(
        "pts_custom_alerts",
        JSON.stringify(stored.slice(0, 50)),
      );
      window.dispatchEvent(
        new CustomEvent("pts:new-alert", { detail: newAlert }),
      );
    } catch (e) {
      console.warn("Could not write local alert:", e);
    }
  }

  return mapBackendAlertToNotification(newAlert);
}

export async function fetchNotifications(
  userRole?: string,
  unreadOnly = false,
): Promise<SystemNotification[]> {
  let localCustomAlerts: BackendAlert[] = [];
  if (typeof window !== "undefined") {
    try {
      localCustomAlerts = JSON.parse(
        window.localStorage.getItem("pts_custom_alerts") || "[]",
      );
    } catch {
      localCustomAlerts = [];
    }
  }

  const combinedRaw: BackendAlert[] = [...localCustomAlerts];

  try {
    const rawAlerts = await apiClient.get<BackendAlert[]>("/alerts", {
      params: unreadOnly ? { unreadOnly: "true" } : undefined,
    });
    if (Array.isArray(rawAlerts) && rawAlerts.length > 0) {
      combinedRaw.push(...rawAlerts);
    }
  } catch (err) {
    console.warn("Could not fetch alerts from backend:", err);
  }

  if (combinedRaw.length > 0) {
    const mapped = combinedRaw.map(mapBackendAlertToNotification);
    if (unreadOnly) {
      const unreadMapped = mapped.filter((n) => !n.read);
      return userRole
        ? unreadMapped.filter((n) => isNotificationForRole(n, userRole))
        : unreadMapped;
    }
    if (userRole) {
      return mapped.filter((n) => isNotificationForRole(n, userRole));
    }
    return mapped;
  }

  return [];
}

export async function markAlertAsRead(id: string): Promise<void> {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("pts:notification-read", { detail: { id } }),
    );
  }
  try {
    await apiClient.patch(`/alerts/${encodeURIComponent(id)}/read`);
  } catch (err) {
    console.warn(`Failed to mark alert ${id} as read on backend:`, err);
  }
}

export async function markAllAlertsAsRead(): Promise<void> {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pts:notifications-read-all"));
  }
  try {
    await apiClient.patch(`/alerts/read-all`);
  } catch (err) {
    console.warn("Failed to mark all alerts as read on backend:", err);
  }
}
