"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  Filter,
  Info,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
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
  type NotificationPriority,
  type NotificationType,
  type SystemNotification,
} from "@/lib/alertsApi";

export function NotificationsView({ user }: { user?: AuthUser }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (user) return user;
    if (typeof window !== "undefined") return getCurrentUser();
    return null;
  });
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "urgent">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<"all" | NotificationType>("all");

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

  useEffect(() => {
    let active = true;
    async function loadAlerts() {
      const data = await fetchNotifications(userRole);
      if (active) {
        setNotifications(data);
      }
    }
    loadAlerts();
    return () => {
      active = false;
    };
  }, [userRole]);

  const roleNotifications = notifications.filter((n) =>
    isNotificationForRole(n, userRole),
  );

  const unreadCount = roleNotifications.filter((n) => !n.read).length;
  const urgentCount = roleNotifications.filter(
    (n) => n.priority === "urgent" && !n.read,
  ).length;

  useEffect(() => {
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

    window.addEventListener("pts:notifications-read-all", handleReadAll);
    window.addEventListener("pts:notification-read", handleReadOne);
    return () => {
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

  const handleCardClick = (n: SystemNotification) => {
    if (!n.read) {
      handleMarkAsRead(n.id);
    }
    if (n.link) {
      router.push(n.link);
    }
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllAlertsAsRead();
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const filteredNotifications = roleNotifications.filter((n) => {
    if (activeTab === "unread" && n.read) return false;
    if (activeTab === "urgent" && n.priority !== "urgent") return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.timestamp.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function getNotificationIcon(type: NotificationType) {
    switch (type) {
      case "plan":
        return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
      case "contract":
        return <FileCheck className="h-5 w-5 text-blue-600" />;
      case "approval":
        return <CheckCircle2 className="h-5 w-5 text-purple-600" />;
      case "activity":
        return <Clock className="h-5 w-5 text-amber-600" />;
      case "system":
      default:
        return <Info className="h-5 w-5 text-slate-600" />;
    }
  }

  function getPriorityBadge(priority: NotificationPriority) {
    switch (priority) {
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 border border-rose-200">
            <ShieldAlert size={11} /> Urgent
          </span>
        );
      case "normal":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
            Normal
          </span>
        );
      case "info":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
            Informational
          </span>
        );
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-[#0A3C2F] border border-emerald-200">
              <Bell size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Notifications &amp; Alerts Center
                </h1>
                {userRole && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {ROLE_LABELS[userRole] || userRole}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Role-specific notifications and alerts for your account.
              </p>
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-2 self-start sm:self-center"
          >
            <CheckCheck size={16} className="text-emerald-700" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Total Notifications
            </span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {notifications.length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 text-slate-700">
            <Bell size={18} />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800">
              Unread Messages
            </span>
            <p className="text-2xl font-black text-emerald-950 mt-0.5">
              {unreadCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-600 text-white font-bold text-xs">
            {unreadCount > 0 ? `${unreadCount} New` : "Clean"}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-800">
              Urgent Alerts
            </span>
            <p className="text-2xl font-black text-rose-950 mt-0.5">
              {urgentCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-100 text-rose-700">
            <ShieldAlert size={18} />
          </div>
        </div>
      </div>

      {/* Filters and Controls Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Tab Filters */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "unread"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("urgent")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "urgent"
                  ? "bg-white text-rose-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Urgent</span>
              {urgentCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                  {urgentCount}
                </span>
              )}
            </button>
          </div>

          {/* Type Filter Dropdown & Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notifications..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-[#0A3C2F] outline-none transition-all"
              />
            </div>

            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="pl-8 pr-4 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:border-[#0A3C2F] cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="plan">Plans</option>
                <option value="contract">Contracts</option>
                <option value="activity">Activities</option>
                <option value="approval">Approvals</option>
                <option value="system">System</option>
              </select>
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
            <div className="p-3 rounded-full bg-slate-100 text-slate-400 w-fit mx-auto">
              <Bell size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No Notifications Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No notifications matching "${searchQuery}". Try clearing your search.`
                : "You are all caught up! There are no pending notifications for your account."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleCardClick(n)}
              className={`group rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs relative flex flex-col sm:flex-row sm:items-start justify-between gap-4 cursor-pointer ${
                n.read
                  ? "bg-white border-slate-200 hover:border-slate-300"
                  : "bg-emerald-50/30 border-emerald-200/80 hover:border-emerald-300 ring-1 ring-emerald-500/10"
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1">
                {/* Icon Container */}
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    n.read
                      ? "bg-slate-100 text-slate-600"
                      : "bg-white border border-slate-200 shadow-2xs"
                  }`}
                >
                  {getNotificationIcon(n.type)}
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`text-sm font-extrabold tracking-tight ${
                        n.read ? "text-slate-800" : "text-slate-950"
                      }`}
                    >
                      {n.title}
                    </h3>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                    )}
                    {getPriorityBadge(n.priority)}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[10px] font-semibold text-slate-400 block pt-1">
                    {n.timestamp}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 w-full sm:w-auto justify-end"
                onClick={(e) => e.stopPropagation()}
              >
                {n.link && (
                  <Link
                    href={n.link}
                    className="px-3 py-1.5 rounded-lg bg-[#0A3C2F] hover:bg-[#072a21] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{n.actionLabel || "View"}</span>
                    <ExternalLink size={12} />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleRead(n.id)}
                  title={n.read ? "Mark as unread" : "Mark as read"}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <CheckCircle2
                    size={15}
                    className={n.read ? "text-emerald-600" : "text-slate-400"}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteNotification(n.id)}
                  title="Remove notification"
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
