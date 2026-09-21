"use client";

import { useState } from "react";
import { StatusText } from "../../../components/dashboard/StatusText";
import type { OfficerProject } from "@/features/projects/data/officerProjects";
import {
  Building2,
  CalendarRange,
  Download,
  FileText,
  HandCoins,
  Info,
  Landmark,
  MapPin,
  Plus,
  Upload,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { exportProjectPlansToExcel } from "@/features/projects/utils/projectExcelUtils";
import { PlanExcelImportModal } from "@/features/projects/components/PlanExcelImportModal";
import type { ProcurementPlanSummary } from "@/features/projects/data/officerProjects";

function formatProjectPeriod(project: OfficerProject): string | undefined {
  const from = project.projectPeriod?.from?.trim();
  const to = project.projectPeriod?.to?.trim();

  if (from && to) return `${from} - ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return undefined;
}

export function OfficerProjectDetailView({
  project,
  onImportPlans,
}: {
  project: OfficerProject;
  onImportPlans?: (imported: ProcurementPlanSummary[]) => Promise<void> | void;
}) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const overviewFacts: Array<{
    icon: typeof Info;
    label: string;
    value?: string;
  }> = [
    {
      icon: MapPin,
      label: "Country / organisation",
      value: project.countryOrganisation,
    },
    {
      icon: Building2,
      label: "Executing agency",
      value: project.executingAgency,
    },
    {
      icon: Landmark,
      label: "Funding source",
      value: project.fundingSource,
    },
    {
      icon: HandCoins,
      label: "Funding type",
      value: project.fundingType,
    },
    {
      icon: Building2,
      label: "Organization / region",
      value: project.organizationRegion,
    },
    {
      icon: CalendarRange,
      label: "Project period",
      value: formatProjectPeriod(project),
    },
    {
      icon: UserRound,
      label: "Assigned officers",
      value: project.assignedOfficers.filter(Boolean).join(", "),
    },
    {
      icon: FileText,
      label: "SAP / identification no.",
      value: project.sapIdentificationNumber,
    },
  ];
  const visibleOverviewFacts = overviewFacts.filter(
    (fact): fact is (typeof overviewFacts)[number] & { value: string } =>
      Boolean(fact.value?.trim()),
  );
  const supportingFacts = [
    {
      label: "Financing no.",
      value: project.financingNumbers?.filter(Boolean).join(", "),
    },
    { label: "Base currency", value: project.baseCurrency },
    {
      label: "Components",
      value: project.components?.filter(Boolean).join(", "),
    },
    {
      label: "Subcomponents",
      value: project.subcomponents?.filter(Boolean).join(", "),
    },
  ].filter((fact): fact is { label: string; value: string } =>
    Boolean(fact.value?.trim()),
  );

  return (
    <div className="min-w-0 space-y-5 pb-6">
      <header className="space-y-4">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link className="hover:text-[#0A3C2F]" href="/dashboard/officer">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li>
              <Link className="hover:text-[#0A3C2F]" href="/workspace/projects">
                Assigned Projects
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li aria-current="page" className="font-semibold text-slate-800">
              {project.shortName} Details
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[#10243f]">
                {project.name}
              </h1>
              <StatusText className="text-xs" label={project.status} />
            </div>
            <div className="mt-2">
              <span className="inline-block rounded-md bg-slate-100/90 px-2.5 py-1 font-mono text-xs font-medium text-slate-800 border border-slate-200/80">
                {project.code}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs hover:border-[#0A3C2F] hover:bg-emerald-50 hover:text-[#0A3C2F] transition cursor-pointer"
              onClick={() => exportProjectPlansToExcel(project)}
              type="button"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Export Excel
            </button>

            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs hover:border-[#0A3C2F] hover:bg-emerald-50 hover:text-[#0A3C2F] transition cursor-pointer"
              onClick={() => setIsImportModalOpen(true)}
              type="button"
            >
              <Upload aria-hidden="true" className="h-4 w-4" />
              Import Excel
            </button>

            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#0A3C2F] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#083025] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3C2F] transition"
              href={`/workspace/projects?project=${encodeURIComponent(
                project.code,
              )}&mode=create-plan`}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Create Plan
            </Link>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <Info aria-hidden="true" className="h-4.5 w-4.5 text-[#0A3C2F]" />
          <h2 className="font-semibold text-[#16253d]">Project Overview</h2>
        </div>

        <div className="grid gap-x-7 gap-y-6 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {visibleOverviewFacts.map((fact) => (
            <ProjectFact
              icon={fact.icon}
              key={fact.label}
              label={fact.label}
              value={fact.value}
            />
          ))}
        </div>

        {supportingFacts.length > 0 ? (
          <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-200 bg-[#fbfcfd] px-5 py-3 text-xs text-slate-600">
            {supportingFacts.map((fact) => (
              <p key={fact.label}>
                <span className="font-semibold text-slate-700">
                  {fact.label}:
                </span>{" "}
                {fact.value}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="min-h-104 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileText
              aria-hidden="true"
              className="h-4.5 w-4.5 text-[#0A3C2F]"
            />
            <h2 className="font-semibold text-[#16253d]">Procurement Plans</h2>
          </div>
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
            {project.plans.length} plans
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-208 border-collapse text-left">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="w-[38%] px-5 py-3.5" scope="col">
                  Plan name / reference
                </th>
                <th className="w-[12%] px-5 py-3.5" scope="col">
                  Fiscal year
                </th>
                <th className="w-[27%] px-5 py-3.5" scope="col">
                  Category
                </th>
                <th className="w-[10%] px-5 py-3.5 text-center" scope="col">
                  Activities
                </th>
                <th className="w-[13%] px-5 py-3.5" scope="col">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {project.plans.map((plan) => {
                return (
                  <tr key={plan.reference} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link
                        className="font-semibold text-[#1261a8] underline-offset-4 hover:text-[#0A3C2F] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3C2F]"
                        href={`/workspace/projects?project=${encodeURIComponent(
                          project.code,
                        )}&plan=${encodeURIComponent(plan.reference)}`}
                      >
                        {plan.name}
                      </Link>
                      <Link
                        aria-label={`Open ${plan.name}`}
                        className="mt-1 block w-fit font-mono text-[11px] font-medium text-slate-500 hover:text-[#0A3C2F]"
                        href={`/workspace/projects?project=${encodeURIComponent(
                          project.code,
                        )}&plan=${encodeURIComponent(plan.reference)}`}
                      >
                        {plan.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {plan.budgetYear}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-slate-700">
                        {plan.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-sm font-semibold text-slate-800">
                      {plan.activities}
                    </td>
                    <td className="px-5 py-4">
                      <StatusText className="text-xs" label={plan.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <PlanExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(imported) => {
          void onImportPlans?.(imported);
        }}
        projectCode={project.code}
        projectName={project.name}
      />
    </div>
  );
}

function ProjectFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Info;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 text-[#0A3C2F]" />
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-5 text-slate-800">
        {value}
      </p>
    </div>
  );
}
