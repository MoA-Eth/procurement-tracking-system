"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  Info,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import type { AuthUser } from "@/lib/authTypes";
import { ROLE_LABELS, normalizeUserRole } from "@/lib/authTypes";
import { getCurrentUser } from "@/lib/authApi";
import {
  fetchNotifications,
  isNotificationForRole,
  markAlertAsRead,
  markAllAlertsAsRead,
  type NotificationType,
  type SystemNotification,
} from "@/lib/alertsApi";

export function NotificationHeaderDropdown({ user }: { user?: AuthUser }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (user) return user;
    if (typeof window !== "undefined") return getCurrentUser();
    return null;
  });
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    } else if (typeof window !== "undefined") {
      setCurrentUser(getCurrentUser());
    }
  }, [user]);

  const userRole = currentUser?.role
    ? normalizeUserRole(currentUser.role)
    : undefined;

  // Fetch on mount and whenever userRole resolves
  useEffect(() => {
    let active = true;
    async function loadAlerts() {
      const liveData = await fetchNotifications(userRole);
      if (active) setNotifications(liveData);
    }
    loadAlerts();
    return () => {
      active = false;
    };
  }, [userRole]);

  // Re-fetch when dropdown opens + poll every 30s while open
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    async function refresh() {
      const liveData = await fetchNotifications(userRole);
      if (active) setNotifications(liveData);
    }
    refresh(); // immediate refresh on open
    const interval = setInterval(refresh, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOpen, userRole]);

  const roleNotifications = notifications.filter((n) =>
    isNotificationForRole(n, userRole),
  );
  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleReadAll() {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
    function handleReadOne(e: Event) {
      const customEvent = e as CustomEvent<{ id: string }>;
      const id = customEvent.detail?.id;
      if (id) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("pts:notifications-read-all", handleReadAll);
    window.addEventListener("pts:notification-read", handleReadOne);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("pts:notifications-read-all", handleReadAll);
      window.removeEventListener("pts:notification-read", handleReadOne);
    };
  }, []);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    markAlertAsRead(id);
  };

  const handleItemClick = (n: SystemNotification) => {
    if (!n.read) {
      handleMarkAsRead(n.id);
    }
    if (n.link) {
      setIsOpen(false);
      router.push(n.link);
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllAlertsAsRead();
  };

  function getNotificationIcon(type: NotificationType) {
    switch (type) {
      case "plan":
        return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
      case "contract":
        return <FileCheck className="h-4 w-4 text-blue-600" />;
      case "approval":
        return <CheckCircle2 className="h-4 w-4 text-purple-600" />;
      case "activity":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "system":
      default:
        return <Info className="h-4 w-4 text-slate-600" />;
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications, ${unreadCount} unread`}
        className={`relative p-2 rounded-lg border text-slate-600 hover:bg-slate-50 hover:text-[#0A3C2F] transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? "bg-emerald-50 border-emerald-300 text-[#0A3C2F]"
            : "border-slate-200"
        }`}
      >
        <Bell size={16} strokeWidth={1.8} className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-96 max-h-[calc(100dvh-5rem)] rounded-2xl bg-white border border-slate-200 shadow-2xl sm:shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <span className="text-xs font-extrabold text-slate-900">
                Notifications
              </span>
              {userRole && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-700">
                  {ROLE_LABELS[userRole] || userRole}
                </span>
              )}
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  {unreadCount} New
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  All Read
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto max-h-[60vh] sm:max-h-80 divide-y divide-slate-100">
            {roleNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                No notifications for your role right now.
              </div>
            ) : (
              roleNotifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3 sm:p-3.5 transition-colors flex items-start gap-3 cursor-pointer hover:bg-slate-50 relative ${
                    n.read ? "bg-white" : "bg-emerald-50/50"
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!n.read && (
                    <span className="absolute top-3.5 right-3 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}

                  <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5 pr-2">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          n.read
                            ? "font-semibold text-slate-800"
                            : "font-extrabold text-slate-950"
                        }`}
                      >
                        {n.title}
                      </h4>
                      {n.priority === "urgent" && (
                        <span className="shrink-0 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-medium text-slate-400">
                        {n.timestamp}
                      </span>
                      {n.link && (
                        <span className="text-[11px] font-bold text-[#0A3C2F] hover:underline inline-flex items-center gap-0.5">
                          <span>{n.actionLabel || "View"}</span>
                          <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Link */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center shrink-0">
            <Link
              href="/workspace/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[#0A3C2F] hover:underline inline-flex items-center gap-1"
            >
              <span>See All Notifications ({roleNotifications.length})</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
