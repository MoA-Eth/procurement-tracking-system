"use client";

import Link from "next/link";
import { actionLinkClasses } from "../officerData";

interface OfficerProjectItem {
  code: string;
  name: string;
  fundingSource: string;
  activePlans: number;
}

interface OfficerActiveProjectsTableProps {
  projects: OfficerProjectItem[];
  loading?: boolean;
}

export function OfficerActiveProjectsTable({
  projects,
  loading = false,
}: OfficerActiveProjectsTableProps) {
  return (
    <section
      aria-labelledby="my-active-projects"
      className="overflow-hidden rounded-xl border border-[#bdd0c8] bg-white shadow-sm"
    >
      <div className="border-b border-[#c7d7d0] bg-[#edf5f1] px-5 py-4">
        <h2
          id="my-active-projects"
          className="text-lg font-extrabold text-[#16253d]"
        >
          My Active Projects
        </h2>
      </div>
      <div
        aria-label="My active projects table"
        className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#176c55]"
        role="region"
        tabIndex={0}
      >
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="bg-[#0A3C2F]">
            <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
              <th className="w-[36%] px-5 py-3.5" scope="col">
                Project name &amp; code
              </th>
              <th className="w-[28%] px-5 py-3.5" scope="col">
                Funding source
              </th>
              <th
                className="w-[16%] px-4 py-3.5 text-center whitespace-nowrap"
                scope="col"
              >
                Active plans
              </th>
              <th
                className="w-[20%] pr-5 pl-2 py-3.5 text-right whitespace-nowrap"
                scope="col"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-8 text-center text-sm text-slate-500"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#176c55] border-t-transparent" />
                    <span>Loading active projects...</span>
                  </div>
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-8 text-center text-sm text-slate-500"
                >
                  No active projects assigned yet.
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.code} className="hover:bg-[#f7fbf9]">
                  <td className="px-5 py-4 align-middle">
                    <Link
                      title={project.name}
                      className="line-clamp-2 break-words [overflow-wrap:anywhere] [word-break:break-word] font-semibold leading-snug text-slate-900 underline-offset-4 hover:text-[#176c55] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55] block"
                      href={`/workspace/projects?project=${encodeURIComponent(
                        project.code,
                      )}`}
                    >
                      {project.name}
                    </Link>
                    <p className="mt-0.5 text-xs font-mono font-medium text-slate-500 truncate">
                      {project.code}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-middle text-sm text-slate-700 break-words [overflow-wrap:anywhere] [word-break:break-word] line-clamp-2">
                    {project.fundingSource}
                  </td>
                  <td className="px-4 py-4 align-middle text-center font-semibold text-slate-800 whitespace-nowrap">
                    {project.activePlans}
                  </td>
                  <td className="pr-5 pl-2 py-4 align-middle text-right text-sm whitespace-nowrap">
                    <Link
                      className={actionLinkClasses}
                      href={`/workspace/projects?project=${encodeURIComponent(
                        project.code,
                      )}`}
                    >
                      Open project
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
