"use client";

import { useState, useEffect, useRef } from "react";
import {
  Users,
  AlertTriangle,
  Clock,
  ChevronRight,
  UserCheck,
  Building,
  ArrowUpDown,
  Search,
} from "lucide-react";
import Link from "next/link";
import { fetchProjects } from "@/lib/projectsApi";
import { fetchActivities } from "@/lib/activitiesApi";
import { fetchOfficers } from "@/lib/lookupsApi";
import { PhaseDelayBreakdownModal } from "@/features/projects/components/PhaseDelayBreakdownModal";

// Module-level cache to avoid redundant API calls on sidebar navigation
let _cachedWorkloadData: OfficerWorkloadSummary[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface OfficerWorkloadSummary {
  officerId: string;
  officerName: string;
  officerEmail: string;
  projectCount: number;
  projectCodes: string[];
  totalActivitiesCount: number;
  delayedActivitiesCount: number;
  totalDelayDays: number;
  delayedItems: Array<{
    activityRef: string;
    description: string;
    stageName: string;
    delayDays: number;
    delayReason: string;
    stages: any[];
  }>;
}

export function DirectorOfficerWorkloadPanel() {
  const [loading, setLoading] = useState(true);
  const [workloadData, setWorkloadData] = useState<OfficerWorkloadSummary[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDelayActivity, setSelectedDelayActivity] = useState<{
    reference: string;
    title: string;
    totalDelayDays: number;
    stages: any[];
    reason?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Use cache if fresh enough to avoid redundant API calls on navigation
    if (_cachedWorkloadData && Date.now() - _cacheTimestamp < CACHE_TTL_MS) {
      setWorkloadData(_cachedWorkloadData);
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const [projectsRes, activitiesRes, officersRes] =
          await Promise.allSettled([
            fetchProjects(),
            fetchActivities(),
            fetchOfficers(),
          ]);

        const projects =
          projectsRes.status === "fulfilled" ? projectsRes.value : [];
        const activities =
          activitiesRes.status === "fulfilled" ? activitiesRes.value : [];
        const realOfficers =
          officersRes.status === "fulfilled" ? officersRes.value : [];

        // Build mapping of officer workload — seeded from real DB officers
        const officerMap = new Map<string, OfficerWorkloadSummary>();

        realOfficers.forEach((off) => {
          officerMap.set(off.id, {
            officerId: off.id,
            officerName: off.name,
            officerEmail: off.email,
            projectCount: 0,
            projectCodes: [],
            totalActivitiesCount: 0,
            delayedActivitiesCount: 0,
            totalDelayDays: 0,
            delayedItems: [],
          });
        });

        // Map projects to officers via proj.members (Prisma ProjectMember[])
        projects.forEach((proj: any) => {
          const memberUsers: Array<{
            id: string;
            name: string;
            email: string;
          }> = [];

          // Primary: proj.members (ProjectMember with nested user)
          if (Array.isArray(proj.members)) {
            proj.members.forEach((m: any) => {
              const u = m.user || m;
              if (u?.id)
                memberUsers.push({
                  id: u.id,
                  name: u.name || u.email,
                  email: u.email,
                });
            });
          }
          // Fallback: proj.officers
          if (memberUsers.length === 0 && Array.isArray(proj.officers)) {
            proj.officers.forEach((o: any) => {
              const u = o.user || o;
              if (u?.id)
                memberUsers.push({
                  id: u.id,
                  name: u.name || u.email,
                  email: u.email,
                });
            });
          }
          // Fallback: proj.assignedOfficers
          if (
            memberUsers.length === 0 &&
            Array.isArray(proj.assignedOfficers)
          ) {
            proj.assignedOfficers.forEach((o: any) => {
              if (o?.id)
                memberUsers.push({
                  id: o.id,
                  name: o.name || o.email,
                  email: o.email || "",
                });
            });
          }

          memberUsers.forEach((u) => {
            let summary = officerMap.get(u.id);
            if (!summary) {
              // Officer assigned to project but not in the officers list (different role maybe)
              // Still show them
              summary = {
                officerId: u.id,
                officerName: u.name,
                officerEmail: u.email,
                projectCount: 0,
                projectCodes: [],
                totalActivitiesCount: 0,
                delayedActivitiesCount: 0,
                totalDelayDays: 0,
                delayedItems: [],
              };
              officerMap.set(u.id, summary);
            }
            if (!summary.projectCodes.includes(proj.code)) {
              summary.projectCount += 1;
              summary.projectCodes.push(proj.code);
            }
          });
        });

        // Build summaries from real mapped projects and activities
        const summaries = Array.from(officerMap.values());

        // Cache the result
        _cachedWorkloadData = summaries;
        _cacheTimestamp = Date.now();

        if (isMounted) {
          setWorkloadData(summaries);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = workloadData.filter(
    (w) =>
      w.officerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.officerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.projectCodes.some((c) =>
        c.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#0A3C2F] border border-emerald-200">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Procurement Officer Workload & Delay Breakdown
            </h3>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search officer or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#0A3C2F] focus:bg-white focus:ring-1 focus:ring-[#0A3C2F]"
          />
        </div>
      </div>

      {/* Table of Officers */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <th className="py-3 px-4">Procurement Officer</th>
              <th className="py-3 px-4 text-center">Projects Assigned</th>
              <th className="py-3 px-4 text-center">Delayed Activities</th>
              <th className="py-3 px-4">Where & Why Delay Happened</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  No officers found matching search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((officer) => (
                <tr
                  key={officer.officerId}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {/* Officer Info */}
                  <td className="py-3.5 px-4 min-w-[180px]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100/70 text-[#0A3C2F] font-bold text-xs shrink-0">
                        {officer.officerName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">
                          {officer.officerName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {officer.officerEmail}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Project Count */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="font-bold text-xs text-slate-800 tabular-nums">
                      {officer.projectCount}
                    </span>
                  </td>

                  {/* Delay Status per Officer (Req 8) */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {officer.delayedActivitiesCount > 0 ? (
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3 text-rose-600" />
                          {officer.delayedActivitiesCount} Delayed
                        </span>
                        <span className="text-[10px] font-bold text-rose-600">
                          +{officer.totalDelayDays} days total
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        On Schedule
                      </span>
                    )}
                  </td>

                  {/* Where & Why Delay Happened (Req 11) */}
                  <td className="py-3.5 px-4 min-w-[280px]">
                    {officer.delayedItems.length > 0 ? (
                      <div className="space-y-1.5">
                        {officer.delayedItems.map((d, i) => (
                          <div
                            key={i}
                            className="rounded-lg bg-rose-50/60 p-2 text-[10px] border border-rose-200/60"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-bold text-rose-900">
                                {d.activityRef}
                              </span>
                              <span className="font-bold text-rose-700">
                                +{d.delayDays}d
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 mt-0.5">
                              Where:{" "}
                              <span className="font-semibold text-rose-800">
                                {d.stageName}
                              </span>
                            </p>
                            <p className="text-slate-600 mt-0.5 leading-tight">
                              Reason:{" "}
                              <span className="italic text-slate-700">
                                {d.delayReason}
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDelayActivity({
                                  reference: d.activityRef,
                                  title: d.description,
                                  totalDelayDays: d.delayDays,
                                  stages: d.stages,
                                  reason: d.delayReason,
                                })
                              }
                              className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 hover:underline cursor-pointer"
                            >
                              <Clock className="h-2.5 w-2.5" />
                              View Phase Delay Breakdown
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        No active delays reported
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Phase Delay Breakdown */}
      {selectedDelayActivity && (
        <PhaseDelayBreakdownModal
          isOpen={Boolean(selectedDelayActivity)}
          onClose={() => setSelectedDelayActivity(null)}
          data={{
            reference: selectedDelayActivity.reference,
            title: selectedDelayActivity.title,
            totalDelayDays: selectedDelayActivity.totalDelayDays,
            stages: selectedDelayActivity.stages,
          }}
        />
      )}
    </section>
  );
}
