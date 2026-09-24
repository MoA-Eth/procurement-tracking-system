export type DetailedAccountStatus =
  | "ACTIVE"
  | "PENDING_INVITATION"
  | "CANCELLED_INVITATION"
  | "DELETED"
  | "DEACTIVATED";

export function getCancelledUserIds(): Set<string> {
  if (typeof window !== "undefined") {
    try {
      const stored =
        localStorage.getItem("pts_cancelled_invitations") ||
        sessionStorage.getItem("pts_cancelled_invitations");
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
  }
  return new Set();
}

export function addCancelledUserId(id: string) {
  if (typeof window !== "undefined") {
    try {
      const current = getCancelledUserIds();
      current.add(id);
      const val = JSON.stringify([...current]);
      localStorage.setItem("pts_cancelled_invitations", val);
      sessionStorage.setItem("pts_cancelled_invitations", val);
      // Remove from deleted if it was previously there
      removeDeletedUserId(id);
      window.dispatchEvent(new CustomEvent("pts:account-status-changed"));
    } catch {}
  }
}

export function removeCancelledUserId(id: string) {
  if (typeof window !== "undefined") {
    try {
      const current = getCancelledUserIds();
      current.delete(id);
      const val = JSON.stringify([...current]);
      localStorage.setItem("pts_cancelled_invitations", val);
      sessionStorage.setItem("pts_cancelled_invitations", val);
      window.dispatchEvent(new CustomEvent("pts:account-status-changed"));
    } catch {}
  }
}

export function getDeletedUserIds(): Set<string> {
  if (typeof window !== "undefined") {
    try {
      const stored =
        localStorage.getItem("pts_deleted_accounts") ||
        sessionStorage.getItem("pts_deleted_accounts");
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
  }
  return new Set();
}

export function addDeletedUserId(id: string) {
  if (typeof window !== "undefined") {
    try {
      const current = getDeletedUserIds();
      current.add(id);
      const val = JSON.stringify([...current]);
      localStorage.setItem("pts_deleted_accounts", val);
      sessionStorage.setItem("pts_deleted_accounts", val);
      // Remove from cancelled if it was there
      removeCancelledUserId(id);
      window.dispatchEvent(new CustomEvent("pts:account-status-changed"));
    } catch {}
  }
}

export function removeDeletedUserId(id: string) {
  if (typeof window !== "undefined") {
    try {
      const current = getDeletedUserIds();
      current.delete(id);
      const val = JSON.stringify([...current]);
      localStorage.setItem("pts_deleted_accounts", val);
      sessionStorage.setItem("pts_deleted_accounts", val);
      window.dispatchEvent(new CustomEvent("pts:account-status-changed"));
    } catch {}
  }
}

export function getDetailedAccountStatus(
  user: { id: string; isActive: boolean; status?: string | null },
  cancelledIds?: Set<string>,
  deletedIds?: Set<string>,
): DetailedAccountStatus {
  const cancelled = cancelledIds ?? getCancelledUserIds();
  const deleted = deletedIds ?? getDeletedUserIds();

  // 1. Explicitly cancelled invitation
  if (
    cancelled.has(user.id) ||
    (!user.isActive && user.status === "PENDING_INVITATION") ||
    user.status === "INVITATION_CANCELLED"
  ) {
    return "CANCELLED_INVITATION";
  }

  // 2. Explicitly deleted account
  if (deleted.has(user.id) || user.status === "DELETED") {
    return "DELETED";
  }

  // 3. Active pending invitation
  if (user.status === "PENDING_INVITATION") {
    return "PENDING_INVITATION";
  }

  // 4. Active registered user
  if (user.isActive) {
    return "ACTIVE";
  }

  // 5. Inactive / deactivated user
  return "DEACTIVATED";
}
