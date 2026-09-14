import type { LucideIcon } from "lucide-react";

export type DashboardTone =
  "blue" | "emerald" | "orange" | "slate" | "violet" | "rose" | "purple";

export interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: DashboardTone;
  hasRightAccent?: boolean;
  actionLabel?: string;
  actionHref?: string;
  detailLines?: readonly string[];
  actionLines?: readonly string[];
}

export interface DashboardWorkspace {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  icon: LucideIcon;
}

export interface DashboardFocusItem {
  title: string;
  description: string;
}
