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
  Pencil,
  AlertTriangle,
  X,
} from "lucide-react";
import type { AuthUser } from "@/lib/authTypes";
import {
  fetchLookups,
  createLookup,
  updateLookup,
  deleteLookup,
  subscribeToLookups,
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

  // Tab live counts
  const [tabCounts, setTabCounts] = useState<Record<TabType, number>>({
    PROJECT_CODE: 0,
    SECTOR: 0,
    FUNDING_SOURCE: 0,
    PROCUREMENT_METHOD: 0,
  });

  // Form states (Add)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states (Edit Modal)
  const [editingItem, setEditingItem] = useState<LookupItem | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Custom Delete Modal
  const [deleteItemModal, setDeleteItemModal] = useState<LookupItem | null>(
    null,
  );

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

  const loadAllCounts = async () => {
    try {
      const all = await fetchLookups();
      const counts: Record<TabType, number> = {
        PROJECT_CODE: 0,
        SECTOR: 0,
        FUNDING_SOURCE: 0,
        PROCUREMENT_METHOD: 0,
      };
      all.forEach((item) => {
        if (counts[item.type as TabType] !== undefined) {
          counts[item.type as TabType]++;
        }
      });
      setTabCounts(counts);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
    setShowAddForm(false);
    setFormError(null);
    setNewCode("");
    setNewLabel("");
  }, [activeTab]);

  useEffect(() => {
    loadAllCounts();

    // Subscribe to cross-tab updates
    const unsubscribe = subscribeToLookups(() => {
      loadData();
      loadAllCounts();
    });

    return () => unsubscribe();
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
      loadAllCounts();
      showToast(`Added "${cleanCode}" successfully!`);
    } catch (err: any) {
      setFormError(err?.message || "Failed to create lookup value.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (item: LookupItem) => {
    setEditingItem(item);
    setEditCode(item.code);
    setEditLabel(item.label);
    setEditIsActive(item.isActive);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const cleanCode = editCode.trim().toUpperCase();
    const cleanLabel = editLabel.trim();

    if (!cleanCode || !cleanLabel) {
      setEditError("Both code and title/label are required.");
      return;
    }

    if (
      lookups.some(
        (l) => l.id !== editingItem.id && l.code.toUpperCase() === cleanCode,
      )
    ) {
      setEditError(`Another item with code "${cleanCode}" already exists.`);
      return;
    }

    setIsEditSubmitting(true);
    setEditError(null);

    try {
      const updated = await updateLookup(editingItem.id, {
        code: cleanCode,
        label: cleanLabel,
        isActive: editIsActive,
      });

      if (updated) {
        setLookups((prev) =>
          prev.map((l) => (l.id === editingItem.id ? updated : l)),
        );
      }
      setEditingItem(null);
      loadAllCounts();
      showToast(`Updated "${cleanCode}" successfully.`);
    } catch (err: any) {
      setEditError(err?.message || "Failed to update lookup value.");
    } finally {
      setIsEditSubmitting(false);
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
      loadAllCounts();
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
          const count = tabCounts[tab.type] ?? 0;
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
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isActive
                    ? "bg-[#145241] text-[#A3E635]"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
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
                  <td colSpan={5} className="py-12 px-4 text-center">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
                        {searchQuery ? (
                          <Search className="h-6 w-6" />
                        ) : (
                          <currentTabConfig.icon className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {searchQuery
                            ? "No matching results"
                            : `No ${currentTabConfig.label.toLowerCase()} configured yet`}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {searchQuery
                            ? `No values match "${searchQuery}". Try a different search term.`
                            : `Get started by adding the first ${currentTabConfig.label.slice(0, -1).toLowerCase()} for projects.`}
                        </p>
                      </div>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(true);
                            setFormError(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#006837] hover:bg-[#004f29] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add {currentTabConfig.label.slice(0, -1)}</span>
                        </button>
                      )}
                    </div>
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit lookup"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteItemModal(item)}
                          title="Delete lookup"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Lookup Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Edit {currentTabConfig.label.slice(0, -1)}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Update short code, display name, or active status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 block">
                  Code / Acronym *
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-900 uppercase focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 block">
                  {activeTab === "PROJECT_CODE"
                    ? "Full Official Project Title *"
                    : "Display Label *"}
                </label>
                <textarea
                  rows={2}
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-800">Status</p>
                  <p className="text-[10px] text-slate-500">
                    Enable or disable for project creation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    editIsActive
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-slate-200 text-slate-600 border border-slate-300"
                  }`}
                >
                  {editIsActive ? "Active" : "Disabled"}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-[#006837] hover:bg-[#004f29] text-white text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isEditSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Safe Delete Modal */}
      {deleteItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Remove &ldquo;{deleteItemModal.code}&rdquo;?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                  {deleteItemModal.label}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>Data Integrity Recommendation</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                If existing projects or procurement activities reference this
                code, permanently deleting it may cause reporting
                inconsistencies. Deactivating it is recommended instead.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteItemModal(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleToggleActive(deleteItemModal);
                  setDeleteItemModal(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Deactivate Instead
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteLookup(deleteItemModal.id);
                  setLookups((prev) =>
                    prev.filter((l) => l.id !== deleteItemModal.id),
                  );
                  setDeleteItemModal(null);
                  loadAllCounts();
                  showToast(`Removed "${deleteItemModal.code}".`);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
