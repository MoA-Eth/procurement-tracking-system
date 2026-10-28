"use client";

import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  ClipboardCheck,
  FileSignature,
  FolderKanban,
  Gavel,
  Globe,
  History,
  LayoutDashboard,
  ListChecks,
  Menu,
  Settings,
  Sliders,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import {
  ETHIOPIAN_MONTHS,
  gregorianToEthiopian,
} from "@/features/projects/utils/ethiopianCalendar";
import type { AuthUser } from "../../lib/authTypes";
import type { UserRole } from "@/types";
import { NotificationHeaderDropdown } from "@/features/notifications/components/NotificationHeaderDropdown";
import { ROLE_LABELS } from "../../lib/authTypes";
import {
  getNavigationForRole,
  type NavigationIconName,
} from "../../lib/navigation";
import { SignOutButton } from "./SignOutButton";

const navigationIcons: Record<NavigationIconName, LucideIcon> = {
  activity: Activity,
  clipboard: ClipboardCheck,
  contract: FileSignature,
  dashboard: LayoutDashboard,
  decision: Gavel,
  logs: History,
  progress: ListChecks,
  projects: FolderKanban,
  reports: BarChart3,
  settings: Settings,
  sliders: Sliders,
  users: Users,
};

const roleContext: Record<UserRole, string> = {
  OFFICER: "Procurement Operations",
  DIRECTOR: "Directorate Oversight",
  ENDORSING_COMMITTEE: "Committee Review",
  MANAGEMENT: "Executive Management",
  ADMIN: "System Administration",
};

// Today in the Ethiopian calendar ("18 Tikimt 2019 E.C.") and Gregorian
// ("28 Oct 2026 G.C."), shown in the header as in the Asset Tracking System.
function todayLabels(now: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const eth = gregorianToEthiopian(iso);
  return {
    ethiopian: eth
      ? `${eth.day} ${ETHIOPIAN_MONTHS[eth.month - 1]} ${eth.year} E.C.`
      : "",
    gregorian: `${now.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })} G.C.`,
  };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "MU";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppShell({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigation = getNavigationForRole(user.role);
  const userInitials = initials(user.displayName);

  // Page title and icon for the header: the menu entry that best matches the
  // current path (longest href prefix), with the pages outside the menu.
  const currentNav = [...navigation]
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  const pageTitle =
    currentNav?.label ??
    (pathname.startsWith("/workspace/settings")
      ? "Settings"
      : pathname.startsWith("/profile")
        ? "My Profile"
        : pathname.startsWith("/dashboard")
          ? "Dashboard"
          : "");
  const PageIcon: LucideIcon = currentNav
    ? navigationIcons[currentNav.icon]
    : pathname.startsWith("/workspace/settings")
      ? Settings
      : pathname.startsWith("/profile")
        ? UserRound
        : LayoutDashboard;

  // Set after mount so the server's time zone never shows a different day
  const [today, setToday] = useState<ReturnType<typeof todayLabels> | null>(
    null,
  );
  const [showGregorian, setShowGregorian] = useState(false);
  useEffect(() => {
    setToday(todayLabels(new Date()));
  }, []);

  const handleNavClick = (
    href: string,
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    setIsMobileMenuOpen(false);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pts:sidebar-reset", { detail: { href } }),
      );
    }

    if (pathname === href) {
      if (typeof window !== "undefined" && window.location.search) {
        event.preventDefault();
        router.push(href);
      }
    }
  };

  const sidebar = (
    <aside className="flex h-full w-64 flex-col justify-between bg-gradient-to-b from-[#0B6B3A] via-[#086034] to-[#06542D] text-white border-r border-black/20 shrink-0 z-20">
      <div>
        <div className="p-4 flex items-center gap-3.5 border-b border-white/10 bg-[#06542D]">
          <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-white shadow-sm border border-emerald-300/30 relative">
            <Image
              src="/moa-logo.png"
              alt="Ministry of Agriculture emblem"
              width={220}
              height={220}
              priority
              quality={100}
              className="absolute w-27.5 h-auto max-w-none"
              style={{
                left: "-33px",
                top: "-4px",
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-md tracking-tight text-white leading-tight">
              MoA PTS
            </p>
            <p className="text-xs text-emerald-200 font-medium tracking-wide truncate mt-0.5">
              {roleContext[user.role]}
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav
          aria-label={`${ROLE_LABELS[user.role]} navigation`}
          className="p-3 space-y-1 mt-2 overflow-y-auto"
        >
          {navigation.map((item) => {
            const Icon = navigationIcons[item.icon];
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => handleNavClick(item.href, event)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/[0.13] text-white font-semibold"
                    : "text-[#D1F2E7] hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-[#FCDD09]" : "text-emerald-300/80"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Pinned Utility Footer: Settings & User Account */}
      <div className="border-t border-white/10 bg-[#06542D] p-3 space-y-1.5">
        {(user.role === "DIRECTOR" || user.role === "ADMIN") && (
          <Link
            href="/workspace/settings"
            onClick={(event) => handleNavClick("/workspace/settings", event)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/workspace/settings"
                ? "bg-white/[0.13] text-white font-semibold"
                : "text-[#D1F2E7] hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <Settings
              size={18}
              strokeWidth={1.8}
              className={`w-4.5 h-4.5 shrink-0 ${
                pathname === "/workspace/settings"
                  ? "text-[#FCDD09]"
                  : "text-emerald-300/80"
              }`}
            />
            <span className="truncate">Settings</span>
          </Link>
        )}

        {/* User Footer Card */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
          <Link
            href="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            title="View & Edit Profile"
            className={`flex items-center gap-2.5 min-w-0 flex-1 group rounded-xl p-1.5 transition-all ${
              pathname === "/profile"
                ? "bg-white/[0.13] ring-1 ring-white/20"
                : "hover:bg-white/[0.07]"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#00843D] text-white font-semibold text-xs flex items-center justify-center shrink-0 border border-emerald-400/30 shadow-xs group-hover:scale-105 transition-transform">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-200 transition-colors">
                {user.displayName}
              </p>
              <p className="text-[11px] text-emerald-200 truncate capitalize">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          </Link>
          <SignOutButton compact />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        {sidebar}
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
          />
          <div className="relative h-full w-64 max-w-[85vw]">
            {sidebar}
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Top Header */}
        {/* Same layout as the Asset Tracking System header: page icon and
            title on the left; today's date, notifications and language on
            the right. */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-3.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="h-5 w-px shrink-0 bg-slate-200 lg:hidden" />
            {pageTitle ? (
              <div className="flex min-w-0 items-center gap-2">
                <PageIcon
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-[#00843D]"
                />
                <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  {pageTitle}
                </h1>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2.5 text-xs">
            {today ? (
              <button
                type="button"
                onClick={() => setShowGregorian((value) => !value)}
                title={
                  showGregorian
                    ? "Showing the Gregorian date. Click for the Ethiopian calendar."
                    : "Showing the Ethiopian calendar. Click for the Gregorian date."
                }
                className="hidden xl:flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                <span className="tabular-nums">
                  {showGregorian ? today.gregorian : today.ethiopian}
                </span>
              </button>
            ) : null}

            <NotificationHeaderDropdown user={user} />

            <div
              aria-label="Current language: English and Amharic"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-medium text-slate-600 bg-white"
            >
              <Globe
                size={14}
                strokeWidth={1.8}
                className="w-3.5 h-3.5 text-slate-500"
              />
              <span>
                English / <span lang="am">አማርኛ</span>
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-384 min-w-0 overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
