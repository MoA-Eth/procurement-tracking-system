"use client";

import { useState } from "react";
import {
  Filter,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { type ReportType, type ReportFilterState } from "../types";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "./SearchableSelect";

export interface ReportFiltersPanelProps {
  activeReport: ReportType;
  filters: ReportFilterState;
  onUpdateFilter: <K extends keyof ReportFilterState>(
    key: K,
    value: ReportFilterState[K],
  ) => void;
  onApply: () => void;
  onReset: () => void;
  onExport: () => void;
  isExporting: boolean;
  exportError: string | null;
  isApplying: boolean;
  appliedFeedback: boolean;
  activeFilterCount: number;
  projectOptions: SearchableSelectOption[];
  fundingSourceOptions: SearchableSelectOption[];
  fundingTypeOptions?: SearchableSelectOption[];
  methodOptions: SearchableSelectOption[];
  officerOptions: SearchableSelectOption[];
  categoryOptions: SearchableSelectOption[];
  supplierOptions?: SearchableSelectOption[];
}

export function ReportFiltersPanel({
  activeReport,
  filters,
  onUpdateFilter,
  onReset,
  exportError,
  activeFilterCount,
  projectOptions,
  fundingSourceOptions,
  fundingTypeOptions,
  methodOptions,
  officerOptions,
  categoryOptions,
  supplierOptions = [],
}: ReportFiltersPanelProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#0A3C2F]" />
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Filters
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              activeFilterCount > 0
                ? "bg-[#0A3C2F] text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {activeFilterCount > 0 ? `${activeFilterCount} active` : "Default"}
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 underline ml-1 cursor-pointer transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Toggle + More Filters Button */}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
          <span>{showMore ? "Fewer Filters" : "+ More Filters"}</span>
          {showMore ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          )}
        </button>
      </div>

      {exportError && (
        <div className="mb-3 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
          {exportError}
        </div>
      )}

      {/* Dynamic Filter Controls Wrapping Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
        {/* 1. ANNUAL PROCUREMENT PLAN */}
        {activeReport === "annual-plan" && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Fiscal Year (EFY)
              </label>
              <select
                value={filters.efy}
                onChange={(e) => onUpdateFilter("efy", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Years</option>
                <option value="2016 EFY">2016 EFY</option>
                <option value="2017 EFY">2017 EFY</option>
                <option value="2018 EFY">2018 EFY</option>
                <option value="2019 EFY">2019 EFY</option>
              </select>
            </div>

            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <SearchableSelect
              label="Category"
              value={filters.category}
              onChange={(val) => onUpdateFilter("category", val)}
              options={categoryOptions}
              searchPlaceholder="Search category..."
            />

            <SearchableSelect
              label="Procurement Method"
              value={filters.procurementMethod}
              onChange={(val) => onUpdateFilter("procurementMethod", val)}
              options={methodOptions}
              searchPlaceholder="Search method..."
            />

            <SearchableSelect
              label="Funding Source"
              value={filters.fundingSource}
              onChange={(val) => onUpdateFilter("fundingSource", val)}
              options={fundingSourceOptions}
              searchPlaceholder="Search funding source..."
            />

            {showMore && (
              <>
                <SearchableSelect
                  label="Assigned Officer"
                  value={filters.officer}
                  onChange={(val) => onUpdateFilter("officer", val)}
                  options={officerOptions}
                  searchPlaceholder="Search officer..."
                />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Plan Status
                  </label>
                  <select
                    value={filters.planStatus}
                    onChange={(e) =>
                      onUpdateFilter("planStatus", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </>
            )}
          </>
        )}

        {/* 2. PLAN VS ACTUAL */}
        {activeReport === "plan-vs-actual" && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Fiscal Year (EFY)
              </label>
              <select
                value={filters.efy}
                onChange={(e) => onUpdateFilter("efy", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Years</option>
                <option value="2016 EFY">2016 EFY</option>
                <option value="2017 EFY">2017 EFY</option>
                <option value="2018 EFY">2018 EFY</option>
                <option value="2019 EFY">2019 EFY</option>
              </select>
            </div>

            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Date Range
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => onUpdateFilter("fromDate", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-slate-700 bg-white outline-none text-xs"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => onUpdateFilter("toDate", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-slate-700 bg-white outline-none text-xs"
                />
              </div>
            </div>

            {showMore && (
              <>
                <SearchableSelect
                  label="Category"
                  value={filters.category}
                  onChange={(val) => onUpdateFilter("category", val)}
                  options={categoryOptions}
                  searchPlaceholder="Search category..."
                />
                <SearchableSelect
                  label="Procurement Method"
                  value={filters.procurementMethod}
                  onChange={(val) => onUpdateFilter("procurementMethod", val)}
                  options={methodOptions}
                  searchPlaceholder="Search method..."
                />
                <SearchableSelect
                  label="Assigned Officer"
                  value={filters.officer}
                  onChange={(val) => onUpdateFilter("officer", val)}
                  options={officerOptions}
                  searchPlaceholder="Search officer..."
                />
              </>
            )}
          </>
        )}

        {/* 3. PROCUREMENT STEP */}
        {activeReport === "procurement-step" && (
          <>
            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Market Approach
              </label>
              <select
                value={filters.marketApproach}
                onChange={(e) =>
                  onUpdateFilter("marketApproach", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Approaches</option>
                <option value="Open - National">Open - National</option>
                <option value="Open - International">
                  Open - International
                </option>
                <option value="Limited">Limited</option>
                <option value="Direct">Direct</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Review Type
              </label>
              <select
                value={filters.reviewType}
                onChange={(e) => onUpdateFilter("reviewType", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Reviews</option>
                <option value="Prior Review">Prior Review</option>
                <option value="Post Review">Post Review</option>
              </select>
            </div>

            {showMore && (
              <>
                <SearchableSelect
                  label="Category"
                  value={filters.category}
                  onChange={(val) => onUpdateFilter("category", val)}
                  options={categoryOptions}
                  searchPlaceholder="Search category..."
                />
                <SearchableSelect
                  label="Procurement Method"
                  value={filters.procurementMethod}
                  onChange={(val) => onUpdateFilter("procurementMethod", val)}
                  options={methodOptions}
                  searchPlaceholder="Search method..."
                />
              </>
            )}
          </>
        )}

        {/* 4. DELAYED PROCUREMENT */}
        {activeReport === "delayed-procurement" && (
          <>
            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Delay Threshold
              </label>
              <select
                value={filters.delayRange}
                onChange={(e) => onUpdateFilter("delayRange", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Overdue</option>
                <option value="1-7">1 - 7 Days Overdue</option>
                <option value="8-30">8 - 30 Days Overdue</option>
                <option value="31-60">31 - 60 Days Overdue</option>
                <option value="60+">&gt; 60 Days Overdue</option>
              </select>
            </div>

            <SearchableSelect
              label="Assigned Officer"
              value={filters.officer}
              onChange={(val) => onUpdateFilter("officer", val)}
              options={officerOptions}
              searchPlaceholder="Search officer..."
            />

            {showMore && (
              <>
                <SearchableSelect
                  label="Category"
                  value={filters.category}
                  onChange={(val) => onUpdateFilter("category", val)}
                  options={categoryOptions}
                  searchPlaceholder="Search category..."
                />
                <SearchableSelect
                  label="Procurement Method"
                  value={filters.procurementMethod}
                  onChange={(val) => onUpdateFilter("procurementMethod", val)}
                  options={methodOptions}
                  searchPlaceholder="Search method..."
                />
              </>
            )}
          </>
        )}

        {/* 5. MONTHLY PROCUREMENT & MONTHLY SUMMARY */}
        {(activeReport === "monthly-procurement" ||
          activeReport === "monthly-summary") && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                EFY
              </label>
              <select
                value={filters.efy}
                onChange={(e) => onUpdateFilter("efy", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Years</option>
                <option value="2016 EFY">2016 EFY</option>
                <option value="2017 EFY">2017 EFY</option>
                <option value="2018 EFY">2018 EFY</option>
                <option value="2019 EFY">2019 EFY</option>
                <option value="2026">2026</option>
              </select>
            </div>

            <SearchableSelect
              label="Funding Type"
              value={filters.fundingType}
              onChange={(val) => onUpdateFilter("fundingType", val)}
              options={fundingTypeOptions || fundingSourceOptions}
              searchPlaceholder="Search funding type or source..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Currency Output
              </label>
              <select
                value={filters.currency}
                onChange={(e) => onUpdateFilter("currency", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ETB">ETB (Ethiopian Birr)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="UA">UA (AfDB Unit of Account)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Reporting Month
              </label>
              <select
                value={filters.month}
                onChange={(e) => onUpdateFilter("month", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">Current Month</option>
                <option value="1">Meskerem (Sept)</option>
                <option value="2">Tikimt (Oct)</option>
                <option value="3">Hidar (Nov)</option>
                <option value="4">Tahsas (Dec)</option>
                <option value="5">Tir (Jan)</option>
                <option value="6">Yakatit (Feb)</option>
                <option value="7">Megabit (Mar)</option>
                <option value="8">Miyazya (Apr)</option>
                <option value="9">Ginbot (May)</option>
                <option value="10">Sene (Jun)</option>
                <option value="11">Hamle (Jul)</option>
                <option value="12">Nehase (Aug)</option>
              </select>
            </div>

            {showMore && (
              <>
                <SearchableSelect
                  label="Project"
                  value={filters.project}
                  onChange={(val) => onUpdateFilter("project", val)}
                  options={projectOptions}
                  searchPlaceholder="Search project..."
                />
                <SearchableSelect
                  label="Category"
                  value={filters.category}
                  onChange={(val) => onUpdateFilter("category", val)}
                  options={categoryOptions}
                  searchPlaceholder="Search category..."
                />
              </>
            )}
          </>
        )}

        {/* 6. QUARTERLY PROCUREMENT SUMMARY */}
        {activeReport === "quarterly-summary" && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Fiscal Year (EFY)
              </label>
              <select
                value={filters.efy}
                onChange={(e) => onUpdateFilter("efy", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Years</option>
                <option value="2016 EFY">2016 EFY</option>
                <option value="2017 EFY">2017 EFY</option>
                <option value="2018 EFY">2018 EFY</option>
                <option value="2019 EFY">2019 EFY</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Quarter / Period
              </label>
              <select
                value={filters.quarter}
                onChange={(e) => onUpdateFilter("quarter", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">Full Year</option>
                <option value="1">Quarter 1 (Hamle - Tikimt)</option>
                <option value="2">Quarter 2 (Hidar - Tir)</option>
                <option value="3">Quarter 3 (Yakatit - Miyazya)</option>
                <option value="4">Quarter 4 (Ginbot - Sene)</option>
              </select>
            </div>

            <SearchableSelect
              label="Funding Type"
              value={filters.fundingType}
              onChange={(val) => onUpdateFilter("fundingType", val)}
              options={fundingTypeOptions || fundingSourceOptions}
              searchPlaceholder="Search funding type..."
            />

            <SearchableSelect
              label="Category"
              value={filters.category}
              onChange={(val) => onUpdateFilter("category", val)}
              options={categoryOptions}
              searchPlaceholder="Search category..."
            />

            {showMore && (
              <SearchableSelect
                label="Procurement Method"
                value={filters.procurementMethod}
                onChange={(val) => onUpdateFilter("procurementMethod", val)}
                options={methodOptions}
                searchPlaceholder="Search method..."
              />
            )}
          </>
        )}

        {/* 7. QUARTERLY DETAILED & DETAILED PROCUREMENT */}
        {(activeReport === "quarterly-detailed" ||
          activeReport === "detailed-procurement") && (
          <>
            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <SearchableSelect
              label="Category"
              value={filters.category}
              onChange={(val) => onUpdateFilter("category", val)}
              options={categoryOptions}
              searchPlaceholder="Search category..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Quarter / Period
              </label>
              <select
                value={filters.quarter}
                onChange={(e) => onUpdateFilter("quarter", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">Full Year</option>
                <option value="1">Quarter 1</option>
                <option value="2">Quarter 2</option>
                <option value="3">Quarter 3</option>
                <option value="4">Quarter 4</option>
              </select>
            </div>

            {showMore && (
              <>
                <SearchableSelect
                  label="Procurement Method"
                  value={filters.procurementMethod}
                  onChange={(val) => onUpdateFilter("procurementMethod", val)}
                  options={methodOptions}
                  searchPlaceholder="Search method..."
                />
                <SearchableSelect
                  label="Supplier / Contractor"
                  value={filters.supplier}
                  onChange={(val) => onUpdateFilter("supplier", val)}
                  options={supplierOptions}
                  searchPlaceholder="Search supplier..."
                />
              </>
            )}
          </>
        )}

        {/* 8. CONTRACT REGISTER */}
        {activeReport === "contract-register" && (
          <>
            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Contract Status
              </label>
              <select
                value={filters.contractStatus}
                onChange={(e) =>
                  onUpdateFilter("contractStatus", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>

            <SearchableSelect
              label="Supplier / Contractor"
              value={filters.supplier}
              onChange={(val) => onUpdateFilter("supplier", val)}
              options={supplierOptions}
              searchPlaceholder="Search supplier..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Region
              </label>
              <select
                value={filters.region}
                onChange={(e) => onUpdateFilter("region", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Regions</option>
                <option value="Federal">Federal / FPCU</option>
                <option value="Oromia">Oromia</option>
                <option value="Amhara">Amhara</option>
                <option value="Somali">Somali</option>
              </select>
            </div>

            {showMore && (
              <SearchableSelect
                label="Procurement Method"
                value={filters.procurementMethod}
                onChange={(val) => onUpdateFilter("procurementMethod", val)}
                options={methodOptions}
                searchPlaceholder="Search method..."
              />
            )}
          </>
        )}

        {/* 9. CONTRACT & PAYMENT */}
        {activeReport === "contract-payment" && (
          <>
            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Contract Status
              </label>
              <select
                value={filters.contractStatus}
                onChange={(e) =>
                  onUpdateFilter("contractStatus", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active / In Execution</option>
                <option value="Completed">Completed</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Region
              </label>
              <select
                value={filters.region}
                onChange={(e) => onUpdateFilter("region", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Regions</option>
                <option value="Federal">Federal / FPCU</option>
                <option value="Oromia">Oromia</option>
                <option value="Amhara">Amhara</option>
                <option value="Somali">Somali</option>
              </select>
            </div>

            {showMore && (
              <SearchableSelect
                label="Supplier / Contractor"
                value={filters.supplier}
                onChange={(val) => onUpdateFilter("supplier", val)}
                options={supplierOptions}
                searchPlaceholder="Search supplier..."
              />
            )}
          </>
        )}

        {/* 10. REGIONAL / SECTOR SUMMARY */}
        {activeReport === "regional-sector-summary" && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Group Summary By
              </label>
              <select
                value={filters.orgGrouping}
                onChange={(e) =>
                  onUpdateFilter("orgGrouping", e.target.value as any)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="REGION">Regional Scope</option>
                <option value="SECTOR">Sector Scope</option>
                <option value="ORGANIZATION">Organization Unit</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Fiscal Year (EFY)
              </label>
              <select
                value={filters.efy}
                onChange={(e) => onUpdateFilter("efy", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Years</option>
                <option value="2016 EFY">2016 EFY</option>
                <option value="2017 EFY">2017 EFY</option>
                <option value="2018 EFY">2018 EFY</option>
                <option value="2019 EFY">2019 EFY</option>
              </select>
            </div>

            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />
          </>
        )}

        {/* 11. PROJECT SUMMARY */}
        {activeReport === "project-summary" && (
          <>
            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Fiscal Year (EFY)
              </label>
              <select
                value={filters.efy}
                onChange={(e) => onUpdateFilter("efy", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Years</option>
                <option value="2016 EFY">2016 EFY</option>
                <option value="2017 EFY">2017 EFY</option>
                <option value="2018 EFY">2018 EFY</option>
                <option value="2019 EFY">2019 EFY</option>
              </select>
            </div>

            <SearchableSelect
              label="Category"
              value={filters.category}
              onChange={(val) => onUpdateFilter("category", val)}
              options={categoryOptions}
              searchPlaceholder="Search category..."
            />
          </>
        )}

        {/* 12. OFFICER SUMMARY & PROJECT OFFICER */}
        {(activeReport === "officer-summary" ||
          activeReport === "project-officer") && (
          <>
            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <SearchableSelect
              label="Assigned Officer"
              value={filters.officer}
              onChange={(val) => onUpdateFilter("officer", val)}
              options={officerOptions}
              searchPlaceholder="Search officer..."
            />

            {showMore && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Fiscal Year (EFY)
                </label>
                <select
                  value={filters.efy}
                  onChange={(e) => onUpdateFilter("efy", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
                >
                  <option value="ALL">All Years</option>
                  <option value="2016 EFY">2016 EFY</option>
                  <option value="2017 EFY">2017 EFY</option>
                  <option value="2018 EFY">2018 EFY</option>
                </select>
              </div>
            )}
          </>
        )}

        {/* 13. COMMITTEE / APPROVAL PROGRESS */}
        {activeReport === "committee-approval" && (
          <>
            <SearchableSelect
              label="Project"
              value={filters.project}
              onChange={(val) => onUpdateFilter("project", val)}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Committee Result
              </label>
              <select
                value={filters.committeeResult}
                onChange={(e) =>
                  onUpdateFilter("committeeResult", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Results</option>
                <option value="ENDORSED">Endorsed (3+ votes)</option>
                <option value="REJECTED">Rejected (3+ votes)</option>
                <option value="IN_VOTING">Voting in Progress</option>
                <option value="PENDING">Pending Review</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Management Decision
              </label>
              <select
                value={filters.managementDecision}
                onChange={(e) =>
                  onUpdateFilter("managementDecision", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Decisions</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PENDING">Pending Decision</option>
              </select>
            </div>

            <SearchableSelect
              label="Assigned Officer"
              value={filters.officer}
              onChange={(val) => onUpdateFilter("officer", val)}
              options={officerOptions}
              searchPlaceholder="Search officer..."
            />
          </>
        )}

        {/* 14. SUPPLIER PERFORMANCE */}
        {activeReport === "supplier-performance" && (
          <>
            <SearchableSelect
              label="Supplier / Contractor"
              value={filters.supplier}
              onChange={(val) => onUpdateFilter("supplier", val)}
              options={supplierOptions}
              searchPlaceholder="Search supplier..."
            />

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Region
              </label>
              <select
                value={filters.region}
                onChange={(e) => onUpdateFilter("region", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Regions</option>
                <option value="Federal">Federal / FPCU</option>
                <option value="Oromia">Oromia</option>
                <option value="Amhara">Amhara</option>
                <option value="Somali">Somali</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Contract Status
              </label>
              <select
                value={filters.contractStatus}
                onChange={(e) =>
                  onUpdateFilter("contractStatus", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 bg-white outline-none text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
