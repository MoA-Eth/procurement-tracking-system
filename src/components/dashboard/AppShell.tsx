"use client";

import {
  Activity,
  BarChart3,
  Bell,
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
  Users,
  X,
  Layers,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type MouseEvent, type ReactNode } from "react";
import type { AuthUser } from "../../lib/authTypes";
import type { UserRole } from "@/types";
import { NotificationHeaderDropdown } from "@/features/notifications/components/NotificationHeaderDropdown";
import { PresentationDataModal } from "../common/PresentationDataModal";
import { EntityTrackingModal } from "../common/EntityTrackingModal";
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
  const [isEntityTrackingModalOpen, setIsEntityTrackingModalOpen] =
    useState(false);
  const navigation = getNavigationForRole(user.role);
  const userInitials = initials(user.displayName);

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
    <aside className="flex h-full w-64 flex-col justify-between bg-[#0A3C2F] text-white border-r border-[#125442] shrink-0 z-20">
      <div>
        <div className="p-4 flex items-center gap-3.5 border-b border-[#145241] bg-[#072F25]">
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
            <p className="font-extrabold text-md tracking-tight text-white leading-tight">
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
                    ? "bg-[#A3E635] text-[#082920] font-semibold shadow-sm"
                    : "text-[#D1F2E7] hover:bg-[#125241] hover:text-white"
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-[#082920]" : "text-[#87D2B9]"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Pinned Utility Footer: Settings & User Account */}
      <div className="border-t border-[#145241] bg-[#072F25] p-3 space-y-1.5">
        {(user.role === "DIRECTOR" || user.role === "ADMIN") && (
          <Link
            href="/workspace/settings"
            onClick={(event) => handleNavClick("/workspace/settings", event)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/workspace/settings"
                ? "bg-[#125241] text-white font-semibold ring-1 ring-[#A3E635]/40"
                : "text-[#D1F2E7] hover:bg-[#125241]/70 hover:text-white"
            }`}
          >
            <Settings
              size={18}
              strokeWidth={1.8}
              className={`w-4.5 h-4.5 shrink-0 ${
                pathname === "/workspace/settings"
                  ? "text-[#A3E635]"
                  : "text-[#87D2B9]"
              }`}
            />
            <span className="truncate">Settings</span>
          </Link>
        )}

        {/* User Footer Card */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#145241]/60">
          <Link
            href="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            title="View & Edit Profile"
            className={`flex items-center gap-2.5 min-w-0 flex-1 group rounded-xl p-1.5 transition-all ${
              pathname === "/profile"
                ? "bg-[#125241] ring-1 ring-[#A3E635]/40"
                : "hover:bg-[#125241]/70"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#82C899] text-[#062D23] font-bold text-xs flex items-center justify-center shrink-0 border border-white/20 shadow-xs group-hover:scale-105 transition-transform">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate group-hover:text-[#A3E635] transition-colors">
                {user.displayName}
              </p>
              <p className="text-[11px] text-[#83CDB5] truncate capitalize">
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
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between lg:justify-end border-b border-slate-200 bg-white px-4 sm:px-6 shadow-2xs">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 lg:hidden transition-colors"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEntityTrackingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer shadow-2xs"
              title="Open Procurement Entity Lifecycle Tracker"
            >
              <Layers className="h-3.5 w-3.5 text-[#0A3C2F]" />
              <span className="hidden sm:inline">Entity Tracker</span>
            </button>

            <PresentationDataModal />
            <NotificationHeaderDropdown user={user} />

            <div
              aria-label="Current language: English and Amharic"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
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

      <EntityTrackingModal
        isOpen={isEntityTrackingModalOpen}
        onClose={() => setIsEntityTrackingModalOpen(false)}
      />
    </div>
  );
}
