export function StatusText({
  className = "",
  label,
}: {
  className?: string;
  label: string;
}) {
  const tone = getStatusTone(label);

  return (
    <span
      className={
        `inline-flex items-center gap-1.5 whitespace-nowrap font-semibold ${tone.text} ` +
        className
      }
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
      />
      {label}
    </span>
  );
}

const STATUS_TONES = {
  positive: {
    dot: "bg-[#15803d]",
    text: "text-[#166534]",
  },
  informative: {
    dot: "bg-[#2563eb]",
    text: "text-[#1d4ed8]",
  },
  attention: {
    dot: "bg-[#d97706]",
    text: "text-[#b45309]",
  },
  critical: {
    dot: "bg-[#dc2626]",
    text: "text-[#b91c1c]",
  },
  neutral: {
    dot: "bg-slate-400",
    text: "text-slate-600",
  },
} as const;

function getStatusTone(label: string) {
  const status = label.trim().toLowerCase();

  if (
    matchesStatus(status, [
      "completed",
      "approved",
      "cleared",
      "contracted",
      "paid",
      "signed",
    ])
  ) {
    return STATUS_TONES.positive;
  }

  if (
    matchesStatus(status, [
      "delayed",
      "cancelled",
      "canceled",
      "rejected",
      "terminated",
      "overdue",
      "failed",
    ])
  ) {
    return STATUS_TONES.critical;
  }

  if (matchesStatus(status, ["returned", "draft", "pending", "suspended"])) {
    return STATUS_TONES.attention;
  }

  if (
    matchesStatus(status, [
      "active",
      "in progress",
      "under implementation",
      "new",
      "upcoming",
    ])
  ) {
    return STATUS_TONES.informative;
  }

  return STATUS_TONES.neutral;
}

function matchesStatus(status: string, terms: readonly string[]) {
  return terms.some((term) => status.includes(term));
}
