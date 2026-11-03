import { summarizeProcurementProgress, type ExecutiveRecord } from "./model";

const rows = [
  {
    key: "notStarted",
    label: "Not Started / Awaiting Bank Approvals",
    color: "#c9362b",
  },
  {
    key: "biddingDocumentPreparation",
    label: "On Bidding Document Preparation",
    color: "#e9781c",
  },
  { key: "bidAdvertised", label: "Bid Advertised", color: "#d8a20d" },
  { key: "bidEvaluation", label: "Under Bid Evaluation", color: "#d8a20d" },
  {
    key: "contractAwarded",
    label: "Contract Awarded / Signed",
    color: "#2b8b59",
  },
  {
    key: "contractDelivery",
    label: "On Contract Delivery",
    color: "#2876a7",
  },
  { key: "completed", label: "Completed", color: "#9aa7a1" },
] as const;

export function ConsolidatedPortfolio({
  records,
}: {
  records: ExecutiveRecord[];
}) {
  const summary = summarizeProcurementProgress(records);
  const maxCount = Math.max(1, ...rows.map((row) => summary.statuses[row.key]));

  return (
    <section
      aria-labelledby="consolidated-portfolio-title"
      className="space-y-2"
    >
      <header className="border-b-[3px] border-[#31633e] pb-2">
        <h2
          id="consolidated-portfolio-title"
          className="mt-1 text-lg font-semibold leading-tight text-slate-950"
        >
          Consolidated Portfolio at a Glance
        </h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead className="bg-[#2e6038] text-left text-xs font-semibold text-white">
            <tr>
              <th scope="col" className="px-3 py-3">
                RAG
              </th>
              <th scope="col" className="px-3 py-3">
                Implementation Status
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Activities
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Share
              </th>
              <th scope="col" className="w-52 px-3 py-3">
                Distribution
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const count = summary.statuses[row.key];
              const percentage = summary.activities
                ? (count / summary.activities) * 100
                : 0;
              return (
                <tr
                  key={row.key}
                  className={index % 2 === 0 ? "bg-[#f1f4f0]" : "bg-white"}
                >
                  <td className="px-3 py-2.5">
                    <span
                      className="mx-auto block h-[18px] w-[18px] rounded-full"
                      style={{ backgroundColor: row.color }}
                      role="img"
                      aria-label={`${row.label} status`}
                    />
                  </td>
                  <th
                    scope="row"
                    className="px-3 py-2.5 text-left text-sm font-medium text-slate-600"
                    
                  >
                    {row.label}
                  </th>
                  <td className="px-3 py-2.5 text-right text-sm font-medium text-slate-600">
                    {count}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">
                    {percentage.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5">
                    <div
                      className="h-[18px] min-w-0"
                      role="img"
                      aria-label={`${count} activities, ${percentage.toFixed(1)}%`}
                    >
                      <div
                        className="h-full min-w-0"
                        style={{
                          width: `${(count / maxCount) * 100}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-[#e2e9df] font-semibold text-[#175b31]">
              <th scope="row" colSpan={2} className="px-3 py-3 text-left">
                TOTAL
              </th>
              <td className="px-3 py-3 text-right font-serif text-lg tabular-nums">
                {summary.activities}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {summary.activities ? "100%" : "0%"}
              </td>
              <td className="px-3 py-3" />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] italic leading-5 text-slate-500">
        Shares recalculated on the {summary.activities}-activity portfolio.
        Activities with no recorded status are classified as On Bidding Document
        Preparation.
      </p>
    </section>
  );
}
