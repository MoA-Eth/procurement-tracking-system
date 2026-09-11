"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Settings,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Building2,
  Layers,
  Coins,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import type { AuthUser } from "@/lib/authTypes";
import {
  fetchLookups,
  createLookup,
  updateLookup,
  deleteLookup,
  type LookupItem,
} from "@/lib/lookupsApi";

interface SettingsManagementViewProps {
  currentUser: AuthUser;
}

type TabType =
  "PROJECT_CODE" | "SECTOR" | "FUNDING_SOURCE" | "PROCUREMENT_METHOD";

const TAB_CONFIGS: {
  type: TabType;
  label: string;
  icon: any;
  description: string;
}[] = [
  {
    type: "PROJECT_CODE",
    label: "Project Short Codes",
    icon: Building2,
    description:
      "Manage project acronyms and short codes used in project creation and tracking.",
  },
  {
    type: "SECTOR",
    label: "Sectors",
    icon: Layers,
    description:
      "Configured agricultural, livestock, and natural resource sectors.",
  },
  {
    type: "FUNDING_SOURCE",
    label: "Funding Sources",
    icon: Coins,
    description:
      "Development partners, multilateral banks, and treasury accounts.",
  },
  {
    type: "PROCUREMENT_METHOD",
    label: "Procurement Methods",
    icon: FileSpreadsheet,
    description: "Approved procurement selection and bidding methods.",
  },
];

export function SettingsManagementView({
  currentUser: _currentUser,
}: SettingsManagementViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("PROJECT_CODE");
  const [lookups, setLookups] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchLookups(activeTab);
      setLookups(data);
    } catch {
      setLookups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setShowAddForm(false);
    setFormError(null);
    setNewCode("");
    setNewLabel("");
  }, [activeTab]);

  const filteredLookups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return lookups;
    return lookups.filter(
      (l) =>
        l.code.toLowerCase().includes(q) || l.label.toLowerCase().includes(q),
    );
  }, [lookups, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCode.trim().toUpperCase();
    const cleanLabel = newLabel.trim();

    if (!cleanCode || !cleanLabel) {
      setFormError(
        "Please fill out both the code and the full name/description.",
      );
      return;
    }

    if (lookups.some((l) => l.code.toUpperCase() === cleanCode)) {
      setFormError(`A lookup with code "${cleanCode}" already exists.`);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await createLookup({
        type: activeTab,
        code: cleanCode,
        label: cleanLabel,
      });

      setLookups((prev) => [created, ...prev]);
      setNewCode("");
      setNewLabel("");
      setShowAddForm(false);
      showToast(`Added "${cleanCode}" successfully!`);
    } catch (err: any) {
      setFormError(err?.message || "Failed to create lookup value.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: LookupItem) => {
    const updated = await updateLookup(item.id, { isActive: !item.isActive });
    if (updated) {
      setLookups((prev) =>
        prev.map((l) =>
          l.id === item.id ? { ...l, isActive: !l.isActive } : l,
        ),
      );
      showToast(`Status updated for "${item.code}".`);
    }
  };

  const handleDelete = async (item: LookupItem) => {
    if (!window.confirm(`Are you sure you want to remove "${item.code}"?`))
      return;
    await deleteLookup(item.id);
    setLookups((prev) => prev.filter((l) => l.id !== item.id));
    showToast(`Removed "${item.code}".`);
  };

  const currentTabConfig = TAB_CONFIGS.find((t) => t.type === activeTab)!;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A3C2F] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold border border-emerald-400/30">
          <CheckCircle2 className="h-4 w-4 text-[#A3E635]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A3C2F]/10 text-[#0A3C2F] flex items-center justify-center shrink-0">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Settings & Lookup Configurations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage project short codes, acronyms, and global procurement
              classifications.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setFormError(null);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#006837] hover:bg-[#004f29] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>
            {showAddForm
              ? "Cancel"
              : `Add ${currentTabConfig.label.slice(0, -1)}`}
          </span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TAB_CONFIGS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#0A3C2F] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${isActive ? "text-[#A3E635]" : "text-slate-400"}`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Add New Value Form (Collapsible) */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-5 shadow-sm space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-[#0A3C2F] uppercase tracking-wider">
              Add New {currentTabConfig.label.slice(0, -1)}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Changes apply immediately to project creation dropdowns
            </span>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                {activeTab === "PROJECT_CODE"
                  ? "Project Short Code / Acronym *"
                  : "Code *"}
              </label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder={
                  activeTab === "PROJECT_CODE"
                    ? "e.g. DRIVE, CALM, BREFONS"
                    : "e.g. SEC_AGRI"
                }
                className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-900 uppercase placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-800 block mb-1">
                {activeTab === "PROJECT_CODE"
                  ? "Full Official Project Title *"
                  : "Display Label / Description *"}
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={
                  activeTab === "PROJECT_CODE"
                    ? "e.g. De-risking, Inclusion and Value Enhancement Project"
                    : "e.g. Agriculture & Livestock"
                }
                className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-[#006837] hover:bg-[#004f29] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Value"}
            </button>
          </div>
        </form>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              {currentTabConfig.label} ({filteredLookups.length})
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {currentTabConfig.description}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search codes or labels..."
              className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-44">
                  {activeTab === "PROJECT_CODE" ? "Project Short Code" : "Code"}
                </th>
                <th className="py-3 px-4">
                  {activeTab === "PROJECT_CODE" ? "Full Project Name" : "Label"}
                </th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Loading configuration values...
                  </td>
                </tr>
              ) : filteredLookups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No lookup values found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredLookups.map((item, idx) => (
                  <tr
                    key={item.id || item.code}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {item.label}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide transition-colors cursor-pointer ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {item.isActive ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(item)}
                        title="Delete lookup"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
