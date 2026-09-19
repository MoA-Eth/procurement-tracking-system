"use client";

import { useState, useEffect } from "react";
import {
  X,
  Search,
  Layers,
  FolderGit2,
  FileText,
  Activity,
  Banknote,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { fetchProjects } from "@/lib/projectsApi";
import { fetchPlans } from "@/lib/plansApi";
import { fetchActivities } from "@/lib/activitiesApi";
import { fetchContracts } from "@/lib/contractsApi";

type EntityType = "ALL" | "PROJECT" | "PLAN" | "ACTIVITY" | "CONTRACT";

interface TrackedEntity {
  id: string;
  type: "PROJECT" | "PLAN" | "ACTIVITY" | "CONTRACT";
  reference: string;
  name: string;
  parentReference?: string;
  status: string;
  statusColor: string;
  assignedTo?: string;
  updatedAt: string;
  link: string;
  meta: Record<string, string | number | undefined>;
}

export function EntityTrackingModal({
  isOpen,
  onClose,
  initialEntityType = "ALL",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialEntityType?: EntityType;
}) {
  const [selectedType, setSelectedType] =
    useState<EntityType>(initialEntityType);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<TrackedEntity[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadAllEntities() {
      setLoading(true);
      try {
        const [projRes, planRes, actRes, contRes] = await Promise.allSettled([
          fetchProjects(),
          fetchPlans(),
          fetchActivities(),
          fetchContracts(),
        ]);

        const items: TrackedEntity[] = [];

        // 1. Projects
        if (projRes.status === "fulfilled" && Array.isArray(projRes.value)) {
          projRes.value.forEach((p: any) => {
            const officers = Array.isArray(p.assignedOfficers)
              ? p.assignedOfficers.map((o: any) => o.name || o).join(", ")
              : p.officers
                  ?.map((o: any) => o.user?.name)
                  .filter(Boolean)
                  .join(", ") || "Unassigned";

            items.push({
              id: `proj-${p.id || p.code}`,
              type: "PROJECT",
              reference: p.code,
              name: p.name,
              status: p.status || "Active",
              statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
              assignedTo: officers,
              updatedAt: p.updatedAt || new Date().toISOString(),
              link: "/workspace/projects-management",
              meta: {
                Region: p.organization || p.region || "Federal",
                Agency: p.executingAgency || "Ministry of Agriculture",
                Funding:
                  p.fundingSource?.label || p.fundingSource || "World Bank",
              },
            });
          });
        }

        // 2. Plans
        if (planRes.status === "fulfilled" && Array.isArray(planRes.value)) {
          planRes.value.forEach((pl: any) => {
            items.push({
              id: `plan-${pl.id || pl.planName}`,
              type: "PLAN",
              reference: pl.reference || pl.planName,
              name: pl.planName,
              parentReference: pl.projectCode,
              status: pl.status || "Approved",
              statusColor:
                pl.status === "Draft"
                  ? "text-slate-700 bg-slate-50 border-slate-200"
                  : pl.status?.includes("Review") ||
                      pl.status?.includes("Committee")
                    ? "text-amber-700 bg-amber-50 border-amber-200"
                    : "text-emerald-700 bg-emerald-50 border-emerald-200",
              assignedTo: pl.assignedOfficer || "Procurement Officer",
              updatedAt: pl.updatedAt || new Date().toISOString(),
              link: "/workspace/plan-for-review",
              meta: {
                Category: pl.category || "Goods",
                BudgetYear: pl.budgetYear || "2018 EFY",
              },
            });
          });
        }

        // 3. Activities
        if (actRes.status === "fulfilled" && Array.isArray(actRes.value)) {
          actRes.value.forEach((a: any) => {
            const isDelayed =
              a.status === "Delayed" ||
              a.status === "DELAYED" ||
              Boolean(a.daysOverdue);

            items.push({
              id: `act-${a.id || a.reference}`,
              type: "ACTIVITY",
              reference: a.reference || a.code || a.id.slice(0, 8),
              name: a.description || a.reference,
              parentReference: a.planReference || a.planName,
              status: isDelayed ? "Delayed" : a.status || "In Progress",
              statusColor: isDelayed
                ? "text-rose-700 bg-rose-50 border-rose-200"
                : "text-blue-700 bg-blue-50 border-blue-200",
              assignedTo: a.officerName || "Procurement Officer",
              updatedAt: a.updatedAt || new Date().toISOString(),
              link: `/workspace/activity-tracker?activity=${encodeURIComponent(a.reference || a.id)}`,
              meta: {
                Method: a.method || "RFQ",
                Stage: a.currentStage || "Bid Evaluation",
              },
            });
          });
        }

        // 4. Contracts
        if (contRes.status === "fulfilled" && Array.isArray(contRes.value)) {
          contRes.value.forEach((c: any) => {
            items.push({
              id: `cont-${c.id || c.contractNumber}`,
              type: "CONTRACT",
              reference: c.contractNumber,
              name: c.supplier || c.contractTitle || c.contractNumber,
              parentReference: c.procurementActivity || c.activityReference,
              status: c.status || "Active",
              statusColor: "text-indigo-700 bg-indigo-50 border-indigo-200",
              assignedTo: c.officer || "Yeabsira Fikre",
              updatedAt: c.updatedAt || new Date().toISOString(),
              link: `/workspace/contracts?contract=${encodeURIComponent(c.contractNumber)}`,
              meta: {
                Supplier: c.supplier,
                Value: `${c.currentAmount || c.totalAmount || "0"} ${c.currency || "ETB"}`,
              },
            });
          });
        }

        if (isMounted) {
          setEntities(items);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }

    loadAllEntities();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = entities.filter((item) => {
    const matchesType = selectedType === "ALL" || item.type === selectedType;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.reference.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      (item.parentReference &&
        item.parentReference.toLowerCase().includes(q)) ||
      (item.assignedTo && item.assignedTo.toLowerCase().includes(q)) ||
      item.status.toLowerCase().includes(q);

    return matchesType && matchesSearch;
  });

  const counts = {
    ALL: entities.length,
    PROJECT: entities.filter((e) => e.type === "PROJECT").length,
    PLAN: entities.filter((e) => e.type === "PLAN").length,
    ACTIVITY: entities.filter((e) => e.type === "ACTIVITY").length,
    CONTRACT: entities.filter((e) => e.type === "CONTRACT").length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100/80 text-[#0A3C2F] font-bold">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Procurement Entity Lifecycle Tracker
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Unified audit and status tracking for Projects, Plans,
                Activities, and Contracts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter bar & Search */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["ALL", "All Entities", Layers],
                ["PROJECT", "Projects", FolderGit2],
                ["PLAN", "Plans", FileText],
                ["ACTIVITY", "Activities", Activity],
                ["CONTRACT", "Contracts", Banknote],
              ] as const
            ).map(([type, label, Icon]) => {
              const active = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    active
                      ? "bg-[#0A3C2F] text-white border-[#0A3C2F] shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {counts[type]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by reference, title, assigned officer, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-[#0A3C2F] focus:bg-white focus:ring-1 focus:ring-[#0A3C2F]"
            />
          </div>
        </div>

        {/* Entity List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2.5 divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading tracked entities...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No procurement entities found matching search.
            </div>
          ) : (
            filtered.map((entity) => (
              <div
                key={entity.id}
                className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 p-2 rounded-xl transition"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                        entity.type === "PROJECT"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : entity.type === "PLAN"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : entity.type === "ACTIVITY"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : "bg-indigo-50 text-indigo-800 border-indigo-200"
                      }`}
                    >
                      {entity.type}
                    </span>

                    <span className="font-mono font-bold text-xs text-slate-900">
                      {entity.reference}
                    </span>

                    {entity.parentReference && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        under{" "}
                        <strong className="text-slate-700">
                          {entity.parentReference}
                        </strong>
                      </span>
                    )}

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${entity.statusColor}`}
                    >
                      {entity.status}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {entity.name}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                    {entity.assignedTo && (
                      <span>
                        Assigned:{" "}
                        <strong className="text-slate-700 font-medium">
                          {entity.assignedTo}
                        </strong>
                      </span>
                    )}
                    {Object.entries(entity.meta).map(([k, v]) =>
                      v ? (
                        <span key={k}>
                          {k}:{" "}
                          <strong className="text-slate-700 font-medium">
                            {v}
                          </strong>
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Link
                    href={entity.link}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#0A3C2F] bg-white hover:bg-emerald-50 hover:border-emerald-300 transition"
                  >
                    <span>View</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Tracking <strong>{filtered.length}</strong> active entities
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
