import styles from "./responsive.module.css";
import {
  summarizeProcurementProgress,
  type ExecutiveRecord,
} from "./model";

const cards = [
  {
    key: "notYetToMarket",
    label: "Not yet to market",
    description: "Awaiting approvals or in document preparation",
    color: "#cf352b",
  },
  {
    key: "inTendering",
    label: "In tendering",
    description: "Advertised or under bid evaluation",
    color: "#d99b08",
  },
  {
    key: "awardedDelivery",
    label: "Awarded / delivery",
    description: "Contract signed or under execution",
    color: "#238b55",
  },
  {
    key: "completed",
    label: "Completed",
    description: "Activity closed out",
    color: "#2876a7",
  },
] as const;

export function ExecutiveSummary({
  rows,
  projects,
}: {
  rows: ExecutiveRecord[];
  projects?: number;
}) {
  const summary = summarizeProcurementProgress(rows);
  const projectCount = projects ?? summary.projects;
  const largestCategory = cards.reduce((largest, card) =>
    summary[card.key] > summary[largest.key] ? card : largest,
  );
  const largestCount = summary[largestCategory.key];
  const subject = `${largestCount} ${largestCount === 1 ? "activity" : "activities"}`;
  const insight = {
    notYetToMarket: `${subject} ${largestCount === 1 ? "has" : "have"} not yet been advertised`,
    inTendering: `${subject} ${largestCount === 1 ? "is" : "are"} in tendering`,
    awardedDelivery: `${subject} ${largestCount === 1 ? "is" : "are"} awarded or in delivery`,
    completed: `${subject} ${largestCount === 1 ? "has" : "have"} been completed`,
  }[largestCategory.key];
  const share = (count: number) =>
    summary.activities
      ? `${((count / summary.activities) * 100).toFixed(1)}%`
      : "0.0%";

  return (
    <section
      aria-labelledby="executive-summary-title"
      className={`${styles.dashboard} space-y-6`}
    >
      <header className="border-b-[3px] border-[#31633e] pb-2">
        <p
          id="executive-summary-title"
          className="text-sm font-bold uppercase tracking-[0.2em] text-[#39804d]"
        >
          Executive summary
        </p>
        <p className="mt-1 text-lg font-semibold leading-tight text-slate-950">
          Procurement Progress:{" "}
          <span className="font-medium text-[#39804d]">
            {summary.activities} Total activities
          </span>
          <span className="mx-3 text-[#39804d]" aria-hidden="true">
            |
          </span>
          <span className="font-medium text-[#39804d]">
            {projectCount} projects
          </span>
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const count = summary[card.key];
          return (
            <article
              key={card.key}
              className="min-w-0 border-t-[7px] bg-white px-5 pb-5 pt-7 shadow-sm"
              style={{ borderTopColor: card.color }}
            >
              <p
                className="font-serif text-2xl font-semibold leading-none"
                style={{ color: card.color }}
              >
                {count}
              </p>
              <p className="mt-3 text-sm font-medium text-slate-600">
                {share(count)} of portfolio
              </p>
              <h2 className="mt-6 text-xs font-bold uppercase tracking-[0.12em] text-[#175b31]">
                {card.label}
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {card.description}
              </p>
            </article>
          );
        })}
      </div>

      <p className="text-sm leading-6 text-slate-900">
        Of {summary.activities} activities, {insight}. 
      </p>
    </section>
  );
}
