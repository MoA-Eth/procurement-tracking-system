export type AlertTone = "returned" | "delayed" | "upcoming" | "approved";

export interface OfficerAlert {
  id: string;
  statusLine: string;
  referenceLine: string;
  detailLine: string;
  actionLabel?: string;
  href: string;
  tone: AlertTone;
  dateTime?: string;
  timeAgo?: string;
  directorNote?: string;
  stages?: any[];
  delayDays?: number;
  activityDescription?: string;
  delayedStage?: string;
  delayReason?: string;
  category?: string;
  method?: string;
}

export const alertToneClasses: Record<
  AlertTone,
  { barColor: string; statusColor: string }
> = {
  delayed: {
    barColor: "bg-[#b91c1c]",
    statusColor: "text-[#b91c1c]",
  },
  returned: {
    barColor: "bg-[#b91c1c]",
    statusColor: "text-[#b91c1c]",
  },
  upcoming: {
    barColor: "bg-sky-500",
    statusColor: "text-sky-700",
  },
  approved: {
    barColor: "bg-[#00843D]",
    statusColor: "text-[#00843D]",
  },
};

export const actionLinkClasses =
  "font-semibold text-[#1261a8] underline-offset-4 hover:text-[#00843D] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00843D]";
