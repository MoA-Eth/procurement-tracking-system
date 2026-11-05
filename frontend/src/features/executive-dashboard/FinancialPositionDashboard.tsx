import {
  summarizeProcurementProgress,
  type ExecutiveRecord,
} from "./model";

const stages = [
  {
    key: "planning",
    label: "Planning & submission",
    color: "#c9362b",
  },
  {
    key: "tendering",
    label: "Tendering & evaluation",
    color: "#d8a20d",
  },
  {
    key: "contracted",
    label: "Contracted / implementation",
    color: "#2b8b59",
  },
  { key: "completed", label: "Completed", color: "#2876a7" },
] as const;

const stageForActivity = (records: ExecutiveRecord[]) => {
  const statuses = summarizeProcurementProgress(records).statuses;
  if (statuses.completed) return "completed";
  if (statuses.contractAwarded || statuses.contractDelivery) return "contracted";
  if (statuses.bidAdvertised || statuses.bidEvaluation) return "tendering";
  return "planning";
};

const formatValue = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} bn`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)} k`;
  return value.toLocaleString("en", { maximumFractionDigits: 2 });
};

export function FinancialPositionDashboard({
  records,
}: {
  records: ExecutiveRecord[];
}) {
  const activities = new Map<string, ExecutiveRecord[]>();
  for (const record of records) {
    if (!record.activityId) continue;
    const group = activities.get(record.activityId) ?? [];
    group.push(record);
    activities.set(record.activityId, group);
  }

  const currencyTotals = new Map<string, number>();
  const stageTotals = new Map<(typeof stages)[number]["key"], number>(
    stages.map((stage) => [stage.key, 0]),
  );
  const projectTotals = new Map<
    string,
    { name: string; value: number; activities: number }
  >();

  for (const group of activities.values()) {
    const activity = group.find((record) => record.estimate !== null);
    if (!activity || activity.estimate === null) continue;

    const currency = activity.estimateCurrency?.trim().toUpperCase();
    if (!currency) continue;

    currencyTotals.set(
      currency,
      (currencyTotals.get(currency) ?? 0) + activity.estimate,
    );

    if (currency === "ETB") {
      const stage = stageForActivity(group);
      stageTotals.set(stage, (stageTotals.get(stage) ?? 0) + activity.estimate);
      if (activity.projectId) {
        const project = projectTotals.get(activity.projectId) ?? {
          name: activity.project,
          value: 0,
          activities: 0,
        };
        project.value += activity.estimate;
        project.activities += 1;
        projectTotals.set(activity.projectId, project);
      }
    }
  }

  const currencyOrder = ["ETB", "USD", "EUR"];
  const currencies = [
    ...currencyOrder.filter((currency) => currencyTotals.has(currency)),
    ...[...currencyTotals.keys()]
      .filter((currency) => !currencyOrder.includes(currency))
      .sort(),
  ];
  const orderedStages = stages.map((stage) => ({
    ...stage,
    value: stageTotals.get(stage.key) ?? 0,
  }));
  const totalBirr = orderedStages.reduce((total, stage) => total + stage.value, 0);
  const maxStage = Math.max(1, ...orderedStages.map((stage) => stage.value));
  const largestProjects = [...projectTotals.values()]
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, 5);

  return (
    <section
      aria-labelledby="financial-position-title"
      className="space-y-4"
    >
      <header className="border-b-[3px] border-[#31633e] pb-2">
        <h2
          id="financial-position-title"
          className="text-base sm:text-lg font-sans font-medium text-slate-900 tracking-tight leading-tight"
        >
          Financial position
        </h2>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          Procurement under planning, submitted and ongoing activities
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        {currencies.map((currency) => (
          <article
            key={currency}
            className="min-w-0 border-t-[5px] border-[#31633e] bg-white px-3 py-3 shadow-sm"
          >
            <p className="font-serif text-lg font-semibold leading-tight text-[#31633e]">
              {formatValue(currencyTotals.get(currency) ?? 0)}{" "}
              <span className="font-sans text-xs font-semibold">{currency}</span>
            </p>
            <p className="mt-1 text-base sm:text-lg font-sans font-medium text-slate-900 tracking-tight leading-tight">
              {currency}-denominated activities
            </p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              Unique activity cost estimates
            </p>
          </article>
        ))}
        {!currencies.length && (
          <p className="col-span-full rounded-lg bg-white p-3 text-xs text-slate-500">
            No activity estimates with a recorded currency.
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section aria-labelledby="financial-stage-title" className="lg:col-span-3">
          <h3
            id="financial-stage-title"
            className="text-base sm:text-lg font-sans font-medium text-slate-900 tracking-tight leading-tight"
          >
            Birr portfolio by procurement stage
          </h3>
          <div className="mt-4 space-y-3">
            {orderedStages.map((stage) => {
              const share = totalBirr ? (stage.value / totalBirr) * 100 : 0;
              return (
                <div
                  key={stage.key}
                  className="grid grid-cols-[minmax(0,1.3fr)_minmax(70px,1.6fr)_auto_auto] items-center gap-2 text-[10px] sm:text-xs"
                >
                  <span className="leading-4 text-slate-800">
                    {stage.label}
                  </span>
                  <div
                    className="h-[18px] bg-[#e4e9e3]"
                    role="img"
                    aria-label={`${stage.label}: ${formatValue(stage.value)} ETB, ${share.toFixed(1)}%`}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${(stage.value / maxStage) * 100}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                  <strong className="whitespace-nowrap text-slate-900">
                    {formatValue(stage.value)}
                  </strong>
                  <span className="w-10 text-right tabular-nums text-slate-500">
                    {share.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-slate-500">
            Total: {formatValue(totalBirr)} ETB. Each activity estimate is
            counted once.
          </p>
        </section>

        <section aria-labelledby="largest-projects-title" className="lg:col-span-2">
          <h3
            id="largest-projects-title"
            className="text-base sm:text-lg font-sans font-medium text-slate-900 tracking-tight leading-tight"
          >
            Largest projects by value
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">ETB activity estimates</p>
          <ol className="mt-3 space-y-2">
            {largestProjects.map((project, index) => (
              <li
                key={project.name + index}
                className="flex items-center justify-between gap-2 border-l-4 border-[#4d8c59] py-1 pl-2 text-[10px] sm:text-xs"
              >
                <span className="min-w-0 truncate font-semibold text-slate-800">
                  {project.name}
                </span>
                <span className="shrink-0 text-right">
                  <strong className="text-[#175b31]">
                    {formatValue(project.value)}
                  </strong>
                  <span className="ml-1 text-[9px] text-slate-500">
                    {project.activities}{" "}
                    {project.activities === 1 ? "activity" : "activities"}
                  </span>
                </span>
              </li>
            ))}
            {!largestProjects.length && (
              <li className="py-4 text-xs text-slate-500">
                No project estimates in ETB are available.
              </li>
            )}
          </ol>
        </section>
      </div>
    </section>
  );
}
