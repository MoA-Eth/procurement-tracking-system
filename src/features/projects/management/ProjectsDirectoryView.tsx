"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Home,
  ChevronRight,
  Plus,
  Search,
  Eye,
  Edit,
  UserCheck,
  Upload,
  UserPlus,
} from "lucide-react";
import type { ProjectItem, ProjectOfficer } from "./projectsData";
import { QuickAssignOfficerModal } from "./components/QuickAssignOfficerModal";

interface ProjectsDirectoryViewProps {
  projects: ProjectItem[];
  onCreateClick: () => void;
  onEditClick: (project: ProjectItem) => void;
  onViewPlansClick: (project: ProjectItem) => void;
  onImportClick?: () => void;
  onUpdateProjectOfficers?: (
    projectId: string,
    updatedOfficers: ProjectOfficer[],
  ) => void;
  readOnly?: boolean;
}

export function ProjectsDirectoryView({
  projects,
  onCreateClick,
  onEditClick,
  onViewPlansClick,
  onImportClick,
  onUpdateProjectOfficers,
  readOnly = false,
}: ProjectsDirectoryViewProps) {
  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [officerFilter, setOfficerFilter] = useState("All Assigned Officers");
  const [fundingFilter, setFundingFilter] = useState("All Funding Sources");
  const [officerModalProject, setOfficerModalProject] =
    useState<ProjectItem | null>(null);

  // Filtered logic
  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      project.code.toLowerCase().includes(query) ||
      project.name.toLowerCase().includes(query) ||
      (project.sapNumber && project.sapNumber.toLowerCase().includes(query)) ||
      project.fundingSource.toLowerCase().includes(query) ||
      project.executingAgency.toLowerCase().includes(query) ||
      project.region.toLowerCase().includes(query) ||
      project.sector.toLowerCase().includes(query) ||
      project.assignedOfficers.some((o) =>
        o.name.toLowerCase().includes(query),
      );

    const matchesStatus =
      statusFilter === "All Statuses" || project.status === statusFilter;

    const matchesOfficer =
      officerFilter === "All Assigned Officers" ||
      project.assignedOfficers.some((o) => o.name === officerFilter);

    const matchesFunding =
      fundingFilter === "All Funding Sources" ||
      project.fundingSource === fundingFilter;

    return matchesSearch && matchesStatus && matchesOfficer && matchesFunding;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Breadcrumbs Header Bar */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
        <Link
          href="/dashboard"
          title="Go to Dashboard"
          className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-bold text-[#0A3C2F]">Projects Management</span>
      </nav>

      {/* 2. Page Title Header & Top Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              MoA Projects Directory
            </h1>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            {onImportClick && (
              <button
                onClick={onImportClick}
                className="border border-slate-300 bg-white hover:border-[#0A3C2F] hover:bg-[#edf5f1] hover:text-[#0A3C2F] text-slate-700 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-2xs transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-98"
                type="button"
              >
                <Upload className="h-4 w-4 text-slate-500" />
                <span>Import Projects</span>
              </button>
            )}
            <button
              onClick={onCreateClick}
              className="bg-[#0A3C2F] hover:bg-[#072b22] text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-2xs transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-98"
              type="button"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Create New Project</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Search & Filters Container Card */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3 lg:space-y-0 lg:flex lg:items-center lg:gap-3">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, SAP ID, donor, agency, region, officer, sector..."
            className="w-full rounded-xl bg-slate-50/80 border border-slate-200/90 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-50/80 border border-slate-200/90 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft (Unassigned)</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Assigned Officer Filter */}
          <select
            value={officerFilter}
            onChange={(e) => setOfficerFilter(e.target.value)}
            className="rounded-xl bg-slate-50/80 border border-slate-200/90 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
          >
            <option value="All Assigned Officers">All Assigned Officers</option>
            <option value="Demelash Worku">Demelash Worku</option>
            <option value="Abebe Kebede">Abebe Kebede</option>
            <option value="Dawit Mekonnen">Dawit Mekonnen</option>
            <option value="Bethelhem Tadesse">Bethelhem Tadesse</option>
          </select>

          {/* Funding Source Filter */}
          <select
            value={fundingFilter}
            onChange={(e) => setFundingFilter(e.target.value)}
            className="rounded-xl bg-slate-50/80 border border-slate-200/90 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:border-emerald-500 outline-none cursor-pointer transition-all"
          >
            <option value="All Funding Sources">All Funding Sources</option>
            <option value="African Development Bank (AfDB)">AfDB</option>
            <option value="World Bank (IDA)">World Bank (IDA)</option>
            <option value="Government Treasury (መንግሥት)">
              Government Treasury
            </option>
          </select>
        </div>
      </div>

      {/* 4. Projects Directory Table Card */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1250px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4 min-w-[140px]">Code / SAP ID</th>
                <th className="py-3.5 px-4 min-w-[300px] w-[28%]">
                  Project / Program Name
                </th>
                <th className="py-3.5 px-4 min-w-[200px]">Donor & Type</th>
                <th className="py-3.5 px-4 min-w-[250px]">
                  Executing Agency / Region
                </th>
                <th className="py-3.5 px-4 min-w-[220px]">Assigned Officers</th>
                <th className="py-3.5 px-4 text-center min-w-[100px]">
                  Status
                </th>
                <th className="py-3.5 px-4 text-center min-w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700 text-sm">
                      No matching projects found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing search queries or adjusting filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project, index) => (
                  <tr
                    key={project.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Index */}
                    <td className="py-4 px-4 text-center font-bold text-slate-400">
                      {index + 1}
                    </td>

                    {/* Code & SAP ID */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <p
                        className="font-mono font-extrabold text-slate-900 text-xs max-w-36 truncate"
                        title={`Project Code: ${project.code}`}
                      >
                        {project.code}
                      </p>
                      {project.sapNumber && (
                        <p
                          className="font-mono text-[10px] text-slate-500 mt-0.5 max-w-36 truncate"
                          title={`SAP Identification No: ${project.sapNumber}`}
                        >
                          SAP: {project.sapNumber}
                        </p>
                      )}
                    </td>

                    {/* Project Name (Expanded width & 3-line wrap + hover tooltip) */}
                    <td
                      className="py-4 px-4 font-bold text-slate-900 min-w-[300px] max-w-[380px] wrap-break-word"
                      title={project.name}
                    >
                      <div className="leading-snug line-clamp-3 wrap-break-word">
                        {project.name}
                      </div>
                    </td>

                    {/* Donor & Funding Type */}
                    <td className="py-4 px-4 space-y-1 min-w-[200px]">
                      <span
                        className="inline-block  px-2 py-0.5 text-[10px] font-semibold text-blue-800"
                        title={`Funding Source: ${project.fundingSource}`}
                      >
                        {project.fundingSource}
                      </span>
                      <div>
                        <span className="inline-block  px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {project.fundingType} (
                          {project.currency.split(" ")[0]})
                        </span>
                      </div>
                    </td>

                    {/* Agency & Region (Expanded width & full multi-line wrap + hover tooltip) */}
                    <td
                      className="py-4 px-4 min-w-[250px] max-w-[300px]"
                      title={`Executing Agency: ${project.executingAgency} | Region: ${project.region}`}
                    >
                      <p className="font-semibold text-slate-900 text-[11px] leading-tight break-words">
                        {project.executingAgency}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Region:{" "}
                        <span className="text-slate-700 font-semibold">
                          {project.region}
                        </span>
                      </p>
                    </td>

                    {/* Assigned Officers List (Expanded width, full name visibility + hover tooltip) */}
                    <td className="py-4 px-4 min-w-[220px]">
                      <div className="space-y-1.5">
                        {project.assignedOfficers.map((off) => (
                          <div
                            key={off.id}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800"
                            title={`${off.name} (${off.email})`}
                          >
                            <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                              <UserCheck className="h-3 w-3" />
                            </div>
                            <span className="whitespace-normal leading-tight">
                              {off.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 text-center whitespace-nowrap min-w-[100px]">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${
                          project.status === "Active"
                            ? "bg-emerald-50 text-emerald-850 border-emerald-200"
                            : project.status === "Draft"
                              ? "bg-amber-50 text-amber-850 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {project.status === "Draft" ? "Draft" : project.status}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-4 px-4 text-center min-w-[100px]">
                      <div className="flex items-center justify-center gap-2">
                        {/* Eye Icon -> View plans under project */}
                        <button
                          onClick={() => onViewPlansClick(project)}
                          title="View Plans Under Project"
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Edit Icon -> Pre-fills form data to edit project */}
                        {!readOnly && (
                          <button
                            onClick={() => onEditClick(project)}
                            title="Edit Sector Project"
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}

                        {/* Assign / Change Officer Button (Supported even after approval) */}
                        {!readOnly && (
                          <button
                            onClick={() => setOfficerModalProject(project)}
                            title="Assign or Change Officers (Post-Approval Supported)"
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Assign / Change Officer Modal */}
      {officerModalProject && (
        <QuickAssignOfficerModal
          isOpen={Boolean(officerModalProject)}
          project={officerModalProject}
          onClose={() => setOfficerModalProject(null)}
          onSaveSuccess={(projectId, updatedOfficers) => {
            onUpdateProjectOfficers?.(projectId, updatedOfficers);
          }}
        />
      )}
    </div>
  );
}
