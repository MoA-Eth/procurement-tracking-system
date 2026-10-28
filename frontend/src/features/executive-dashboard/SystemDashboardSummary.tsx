import { type SystemSummary } from "./model";

export function SystemDashboardSummary({
  summary,
}: {
  summary: SystemSummary;
}) {
  const cards = [
    [
      "Active projects",
      summary.projects,
      `${summary.plans} active procurement plans`,
    ],
    [
      "Director review queue",
      summary.directorReview,
      "Includes returned and rejected plans for follow-up",
    ],
    [
      "Committee review",
      summary.committeeReview,
      "Plans currently with the committee",
    ],
    [
      "Executive authorization",
      summary.executiveApproval,
      "Endorsed plans awaiting a management decision",
    ],
    [
      "Delayed activities",
      summary.delayedActivities,
      "Flagged delayed or with an overdue, incomplete stage",
    ],
  ];
  return (
    <section
      aria-labelledby="system-dashboard-summary"
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
          System dashboard summary
        </p>
        <h2
          id="system-dashboard-summary"
          className="mt-1 text-base font-semibold"
        >
          Approvals and operational follow-up
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Entire active portfolio · independent of the contract register filters
          below
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, note]) => (
          <div
            key={label}
            className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-4"
          >
            <h3 className="text-xs font-medium text-slate-600">{label}</h3>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
        Stage reporting covers {summary.activitiesWithStages} of{" "}
        {summary.activities} activities.{" "}
        {summary.activitiesWithStages < summary.activities
          ? "Missing stage schedules limit delay assessment. "
          : ""}
        Activity delays differ from overdue contract completion dates. Review
        queues follow the existing director and management dashboard
        definitions.
      </p>
    </section>
  );
}
