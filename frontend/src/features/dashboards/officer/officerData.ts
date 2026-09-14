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
    barColor: "bg-[#2596a9]",
    statusColor: "text-[#18879a]",
  },
  approved: {
    barColor: "bg-[#006837]",
    statusColor: "text-[#006837]",
  },
};

export const actionLinkClasses =
  "font-semibold text-[#1261a8] underline-offset-4 hover:text-[#07523f] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07523f]";
