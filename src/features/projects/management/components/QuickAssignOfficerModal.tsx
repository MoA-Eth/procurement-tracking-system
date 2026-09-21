"use client";

import { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { ProjectItem, ProjectOfficer } from "../projectsData";
import { fetchOfficers } from "@/lib/lookupsApi";
import { assignOfficerToProject } from "@/lib/projectsApi";

interface QuickAssignOfficerModalProps {
  isOpen: boolean;
  project: ProjectItem | null;
  onClose: () => void;
  onSaveSuccess: (projectId: string, updatedOfficers: ProjectOfficer[]) => void;
}

export function QuickAssignOfficerModal({
  isOpen,
  project,
  onClose,
  onSaveSuccess,
}: QuickAssignOfficerModalProps) {
  const [officers, setOfficers] = useState<ProjectOfficer[]>([]);
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !project) return;

    // Pre-select existing officers
    const existingIds = (project.assignedOfficers || [])
      .map((o: any) => (typeof o === "string" ? o : o?.id))
      .filter(Boolean);
    setSelectedOfficerIds(existingIds);

    // Load available officers
    async function load() {
      setLoading(true);
      try {
        const list = await fetchOfficers();
        if (list && list.length > 0) {
          const mapped: ProjectOfficer[] = list.map((o: any) => ({
            id: o.id,
            name: o.name,
            email:
              o.email ||
              `${o.name.toLowerCase().replace(/\s+/g, ".")}@moa.gov.et`,
            roleTag: "Procurement Officer",
            isActive: true,
          }));
          setOfficers(mapped);
        } else {
          // Fallback defaults
          setOfficers([
            {
              id: "off-1",
              name: "Yeabsira Fikre",
              email: "yeabsira.fikre@moa.gov.et",
              roleTag: "Procurement Officer",
              isActive: true,
            },
            {
              id: "off-2",
              name: "Abebe Kebede",
              email: "abebe.kebede@moa.gov.et",
              roleTag: "Procurement Officer",
              isActive: true,
            },
            {
              id: "off-3",
              name: "Almaz Tefera",
              email: "almaz.tefera@moa.gov.et",
              roleTag: "Procurement Officer",
              isActive: true,
            },
            {
              id: "off-4",
              name: "Dawit Haile",
              email: "dawit.haile@moa.gov.et",
              roleTag: "Procurement Officer",
              isActive: true,
            },
          ]);
        }
      } catch {
        setOfficers([
          {
            id: "off-1",
            name: "Yeabsira Fikre",
            email: "yeabsira.fikre@moa.gov.et",
            roleTag: "Procurement Officer",
            isActive: true,
          },
          {
            id: "off-2",
            name: "Abebe Kebede",
            email: "abebe.kebede@moa.gov.et",
            roleTag: "Procurement Officer",
            isActive: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  function toggleOfficer(id: string) {
    setSelectedOfficerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (selectedOfficerIds.length === 0) {
      setError("Please assign at least one procurement officer.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Synchronize with backend API
      for (const offId of selectedOfficerIds) {
        try {
          await assignOfficerToProject(project!.id, offId);
        } catch (e) {
          console.warn("Backend assign note:", e);
        }
      }

      // Map selected objects
      const updatedOfficers = officers.filter((o) =>
        selectedOfficerIds.includes(o.id),
      );

      onSaveSuccess(project!.id, updatedOfficers);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update assigned officers.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5 border border-slate-200 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs bg-emerald-50 text-[#0A3C2F] px-2 py-0.5 rounded border border-emerald-200">
                {project.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                • {project.name}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#0A3C2F]" />
              Assign or Change Officers
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Post-Approval notice */}
        <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3 text-xs text-emerald-950 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Director Authority:</strong> You can add new officers or
            change assigned officers at any time, including after the project or
            plan has been approved.
          </p>
        </div>

        {/* Officers Selection List */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800">
            Select Procurement Officers
          </label>

          {loading ? (
            <p className="text-xs text-slate-500 italic py-4">
              Loading available officers...
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {officers.map((off) => {
                const isSelected = selectedOfficerIds.includes(off.id);
                return (
                  <div
                    key={off.id}
                    onClick={() => toggleOfficer(off.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#0A3C2F] bg-emerald-50/40 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                          isSelected
                            ? "bg-[#0A3C2F] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {off.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {off.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {off.email}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-[#0A3C2F] border-[#0A3C2F] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 rounded-xl bg-[#0A3C2F] text-white hover:bg-[#072b22] text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Officer Assignments"}
          </button>
        </div>
      </div>
    </div>
  );
}
