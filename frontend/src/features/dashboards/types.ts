import type { LucideIcon } from "lucide-react";

export type DashboardTone =
  | "blue"
  | "emerald"
  | "orange"
  | "amber"
  | "slate"
  | "violet"
  | "rose"
  | "purple";

export interface DashboardMetricSubItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: DashboardTone;
  isActive?: boolean;
  onClick?: () => void;
  detail?: string;
}

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
  onClick?: () => void;
  isActive?: boolean;
  subItems?: readonly DashboardMetricSubItem[];
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
