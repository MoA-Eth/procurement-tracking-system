"use client";

import {
  HorizontalTableScroller,
  PaginationControls,
  useListPagination,
} from "@/components/dashboard/ListPagination";
import {
  projectNameLabels,
  summarizeProcurementProgress,
  type ExecutiveRecord,
} from "./model";

const statusColumns = [
  { key: "notStarted", label: "Not started", color: "#c9362b" },
  {
    key: "biddingDocumentPreparation",
    label: "Preparation",
    color: "#e9781c",
  },
  { key: "bidAdvertised", label: "Advertised", color: "#d8a20d" },
  { key: "bidEvaluation", label: "Under evaluation", color: "#d8a20d" },
  { key: "contractAwarded", label: "Awarded", color: "#2b8b59" },
  { key: "contractDelivery", label: "On contract delivery", color: "#2876a7" },
  { key: "completed", label: "Completed", color: "#9aa7a1" },
] as const;

export function ProjectPortfolioDashboard({
  records,
}: {
  records: ExecutiveRecord[];
}) {
  const labels = projectNameLabels(records);
  const projects = new Map<string, ExecutiveRecord[]>();
  for (const record of records) {
    if (!record.activityId || !record.projectId) continue;
    const projectRecords = projects.get(record.projectId) ?? [];
    projectRecords.push(record);
    projects.set(record.projectId, projectRecords);
  }
  const projectRows = [...projects.entries()]
    .map(([id, projectRecords]) => ({
      id,
      name: labels.get(id) || projectRecords[0]?.project || "Project",
      summary: summarizeProcurementProgress(projectRecords),
    }))
    .sort(
      (a, b) =>
        b.summary.activities - a.summary.activities ||
        a.name.localeCompare(b.name),
    );
  const {
    pageItems: paginatedProjects,
    page,
    pageCount,
    startIndex,
    endIndex,
    setPage,
  } = useListPagination(projectRows, 15);

  return (
    <section aria-labelledby="project-portfolio-title" className="space-y-2">
      <header className="border-b-[3px] border-[#31633e] pb-2">
        <h2
          id="project-portfolio-title"
          className="mt-1 text-base sm:text-lg font-sans font-medium text-slate-900 tracking-tight leading-tight"
        >
          Project Portfolio Dashboard
        </h2>
      </header>

      <HorizontalTableScroller label="Project portfolio">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead className="bg-[#2e6038] text-left font-semibold text-white">
            <tr>
              <th scope="col" className="px-2 py-2.5">
                Project
              </th>
              <th scope="col" className="px-2 py-2.5 text-right">
                Total
              </th>
              {statusColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="max-w-20 px-2 py-2.5 text-center leading-tight"
                >
                  <span>{column.label}</span>
                  <span
                    className="mx-auto mt-1 block h-3 w-3 rounded-full"
                    style={{ backgroundColor: column.color }}
                    aria-hidden="true"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedProjects.map((project, index) => (
              <tr
                key={project.id}
                className={
                  (startIndex + index) % 2 === 0 ? "bg-[#f1f4f0]" : "bg-white"
                }
              >
                <th
                  scope="row"
                  className="max-w-36 px-2 py-2.5 text-left font-medium text-slate-900"
                >
                  <span className="block truncate" title={project.name}>
                    {project.name}
                  </span>
                </th>
                <td className="px-2 py-2.5 text-right font-serif text-base font-semibold tabular-nums text-slate-900">
                  {project.summary.activities}
                </td>
                {statusColumns.map((column) => {
                  const count = project.summary.statuses[column.key];
                  return (
                    <td
                      key={column.key}
                      className="px-2 py-2.5 text-center font-medium tabular-nums"
                      style={{
                        color: count > 0 ? column.color : "#a8b2ad",
                      }}
                    >
                      {count || "–"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!projectRows.length && (
              <tr>
                <td
                  colSpan={statusColumns.length + 2}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No project activities are available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </HorizontalTableScroller>
      <PaginationControls
        page={page}
        pageCount={pageCount}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={projectRows.length}
        setPage={setPage}
      />
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {statusColumns.map((column) => (
          <span key={column.key} className="inline-flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            {column.label}
          </span>
        ))}
      </div>
    </section>
  );
}
