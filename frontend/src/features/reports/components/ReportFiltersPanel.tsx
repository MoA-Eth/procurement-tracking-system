"use client";

import { useState } from "react";
import {
  Calendar,
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
import { SearchableMultiSelect } from "./SearchableMultiSelect";
import { DualCalendarField } from "@/features/projects/components/DualCalendarField";

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
  sectorOptions?: SearchableSelectOption[];
  fundingSourceOptions: SearchableSelectOption[];
  fundingTypeOptions?: SearchableSelectOption[];
  methodOptions: SearchableSelectOption[];
  officerOptions: SearchableSelectOption[];
  categoryOptions: SearchableSelectOption[];
  supplierOptions?: SearchableSelectOption[];
}

interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

function FilterSelect({
  label,
  children,
  className = "",
  ...props
}: FilterSelectProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          {...props}
          className={`w-full appearance-none rounded-xl border border-slate-300 px-3 py-1.5 pr-8 font-semibold text-slate-800 bg-white outline-none hover:border-slate-400 transition-colors text-xs cursor-pointer ${className}`}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      </div>
    </div>
  );
}

export function ReportFiltersPanel({
  activeReport,
  filters,
  onUpdateFilter,
  onReset,
  exportError,
  activeFilterCount,
  projectOptions,
  sectorOptions = [{ value: "ALL", label: "All Sectors" }],
  fundingSourceOptions,
  fundingTypeOptions,
  methodOptions,
  officerOptions,
  categoryOptions,
  supplierOptions = [],
}: ReportFiltersPanelProps) {
  const [showMore, setShowMore] = useState(false);

  const handleProjectsChange = (vals: string[]) => {
    onUpdateFilter("projects", vals);
    onUpdateFilter(
      "project",
      vals.length === 1 ? vals[0] : vals.length > 1 ? vals.join(",") : "ALL",
    );
  };

  const selectedProjectValues =
    filters.projects && filters.projects.length > 0
      ? filters.projects
      : filters.project && filters.project !== "ALL"
        ? filters.project.split(",")
        : [];

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#00843D]" />
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Filters
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              activeFilterCount > 0
                ? "bg-[#00843D] text-white"
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

      {/* Date Interval / Range Filter (Dual Ethiopian & Gregorian Calendar) — Available across all reports */}
      <div className="mb-3 p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/80 shadow-2xs w-full lg:w-1/2 max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-slate-200/60">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-md bg-emerald-100/70 flex items-center justify-center text-[#00843D]">
              <Calendar className="h-3 w-3" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-800 tracking-tight">
                Date Range / Interval Filter
              </span>
              <span className="ml-1.5 text-[10px] font-medium text-slate-500">
                (Dual Ethiopian &amp; Gregorian Calendar)
              </span>
            </div>
            {(filters.fromDate || filters.toDate) && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                <span className="h-1 w-1 rounded-full bg-emerald-600 animate-pulse" />
                Interval Active
              </span>
            )}
          </div>
          {(filters.fromDate || filters.toDate) && (
            <button
              type="button"
              onClick={() => {
                onUpdateFilter("fromDate", "");
                onUpdateFilter("toDate", "");
                onUpdateFilter("fromEthiopianDate", "");
                onUpdateFilter("toEthiopianDate", "");
              }}
              className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 underline cursor-pointer transition-colors"
            >
              Clear Date Interval
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <DualCalendarField
            id="report-filter-from-date"
            label="From Date (የመነሻ ቀን)"
            gregorianValue={filters.fromDate || ""}
            ethiopianValue={filters.fromEthiopianDate || ""}
            onChange={(gregVal, ethVal) => {
              onUpdateFilter("fromDate", gregVal);
              onUpdateFilter("fromEthiopianDate", ethVal);
            }}
            required={false}
            variant="compact"
          />
          <DualCalendarField
            id="report-filter-to-date"
            label="To Date (የመጨረሻ ቀን)"
            gregorianValue={filters.toDate || ""}
            ethiopianValue={filters.toEthiopianDate || ""}
            onChange={(gregVal, ethVal) => {
              onUpdateFilter("toDate", gregVal);
              onUpdateFilter("toEthiopianDate", ethVal);
            }}
            required={false}
            variant="compact"
          />
        </div>
      </div>

      {/* Dynamic Filter Controls Wrapping Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
        {/* 1. ANNUAL PROCUREMENT PLAN */}
        {activeReport === "annual-plan" && (
          <>
            <FilterSelect
              label="Fiscal Year (EFY)"
              value={filters.efy}
              onChange={(e) => onUpdateFilter("efy", e.target.value)}
            >
              <option value="ALL">All Years</option>
              <option value="2016 EFY">2016 EFY</option>
              <option value="2017 EFY">2017 EFY</option>
              <option value="2018 EFY">2018 EFY</option>
              <option value="2019 EFY">2019 EFY</option>
            </FilterSelect>

            <SearchableSelect
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
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
                <FilterSelect
                  label="Plan Status"
                  value={filters.planStatus}
                  onChange={(e) => onUpdateFilter("planStatus", e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </FilterSelect>
              </>
            )}
          </>
        )}

        {/* 2. PLAN VS ACTUAL */}
        {activeReport === "plan-vs-actual" && (
          <>
            <FilterSelect
              label="Fiscal Year (EFY)"
              value={filters.efy}
              onChange={(e) => onUpdateFilter("efy", e.target.value)}
            >
              <option value="ALL">All Years</option>
              <option value="2016 EFY">2016 EFY</option>
              <option value="2017 EFY">2017 EFY</option>
              <option value="2018 EFY">2018 EFY</option>
              <option value="2019 EFY">2019 EFY</option>
            </FilterSelect>

            <SearchableSelect
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
              options={projectOptions}
              searchPlaceholder="Search project..."
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
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <FilterSelect
              label="Market Approach"
              value={filters.marketApproach}
              onChange={(e) => onUpdateFilter("marketApproach", e.target.value)}
            >
              <option value="ALL">All Approaches</option>
              <option value="Open - National">Open - National</option>
              <option value="Open - International">Open - International</option>
              <option value="Limited">Limited</option>
              <option value="Direct">Direct</option>
            </FilterSelect>

            <FilterSelect
              label="Review Type"
              value={filters.reviewType}
              onChange={(e) => onUpdateFilter("reviewType", e.target.value)}
            >
              <option value="ALL">All Reviews</option>
              <option value="Prior Review">Prior Review</option>
              <option value="Post Review">Post Review</option>
            </FilterSelect>

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
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <FilterSelect
              label="Delay Threshold"
              value={filters.delayRange}
              onChange={(e) => onUpdateFilter("delayRange", e.target.value)}
            >
              <option value="ALL">All Overdue</option>
              <option value="1-7">1 - 7 Days Overdue</option>
              <option value="8-30">8 - 30 Days Overdue</option>
              <option value="31-60">31 - 60 Days Overdue</option>
              <option value="60+">&gt; 60 Days Overdue</option>
            </FilterSelect>

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
            <FilterSelect
              label="EFY"
              value={filters.efy}
              onChange={(e) => onUpdateFilter("efy", e.target.value)}
            >
              <option value="ALL">All Years</option>
              <option value="2016 EFY">2016 EFY</option>
              <option value="2017 EFY">2017 EFY</option>
              <option value="2018 EFY">2018 EFY</option>
              <option value="2019 EFY">2019 EFY</option>
              <option value="2026">2026</option>
            </FilterSelect>

            <SearchableSelect
              label="Funding Type"
              value={filters.fundingType}
              onChange={(val) => onUpdateFilter("fundingType", val)}
              options={fundingTypeOptions || fundingSourceOptions}
              searchPlaceholder="Search funding type or source..."
            />

            <FilterSelect
              label="Currency Output"
              value={filters.currency}
              onChange={(e) => onUpdateFilter("currency", e.target.value)}
            >
              <option value="ETB">ETB (Ethiopian Birr)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound Sterling)</option>
              <option value="JPY">JPY (Japanese Yen)</option>
              <option value="UA">UA (AfDB Unit of Account)</option>
            </FilterSelect>

            <FilterSelect
              label="Reporting Month"
              value={filters.month}
              onChange={(e) => onUpdateFilter("month", e.target.value)}
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
            </FilterSelect>

            {showMore && (
              <>
                <SearchableSelect
                  label="Sector"
                  value={filters.sector}
                  onChange={(val) => onUpdateFilter("sector", val)}
                  options={sectorOptions}
                  searchPlaceholder="Search sector..."
                />
                <SearchableMultiSelect
                  label="Project"
                  values={selectedProjectValues}
                  onChange={handleProjectsChange}
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
            <FilterSelect
              label="Fiscal Year (EFY)"
              value={filters.efy}
              onChange={(e) => onUpdateFilter("efy", e.target.value)}
            >
              <option value="ALL">All Years</option>
              <option value="2016 EFY">2016 EFY</option>
              <option value="2017 EFY">2017 EFY</option>
              <option value="2018 EFY">2018 EFY</option>
              <option value="2019 EFY">2019 EFY</option>
            </FilterSelect>

            <FilterSelect
              label="Quarter / Period"
              value={filters.quarter}
              onChange={(e) => onUpdateFilter("quarter", e.target.value)}
            >
              <option value="ALL">Full Year</option>
              <option value="1">Quarter 1 (Hamle - Tikimt)</option>
              <option value="2">Quarter 2 (Hidar - Tir)</option>
              <option value="3">Quarter 3 (Yakatit - Miyazya)</option>
              <option value="4">Quarter 4 (Ginbot - Sene)</option>
            </FilterSelect>

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
              <>
                <SearchableSelect
                  label="Sector"
                  value={filters.sector}
                  onChange={(val) => onUpdateFilter("sector", val)}
                  options={sectorOptions}
                  searchPlaceholder="Search sector..."
                />
                <SearchableMultiSelect
                  label="Project"
                  values={selectedProjectValues}
                  onChange={handleProjectsChange}
                  options={projectOptions}
                  searchPlaceholder="Search project..."
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

        {/* 7. QUARTERLY DETAILED & DETAILED PROCUREMENT */}
        {(activeReport === "quarterly-detailed" ||
          activeReport === "detailed-procurement") && (
          <>
            <SearchableSelect
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
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

            <FilterSelect
              label="Quarter / Period"
              value={filters.quarter}
              onChange={(e) => onUpdateFilter("quarter", e.target.value)}
            >
              <option value="ALL">Full Year</option>
              <option value="1">Quarter 1</option>
              <option value="2">Quarter 2</option>
              <option value="3">Quarter 3</option>
              <option value="4">Quarter 4</option>
            </FilterSelect>

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
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <FilterSelect
              label="Contract Status"
              value={filters.contractStatus}
              onChange={(e) => onUpdateFilter("contractStatus", e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="TERMINATED">Terminated</option>
            </FilterSelect>

            <SearchableSelect
              label="Supplier / Contractor"
              value={filters.supplier}
              onChange={(val) => onUpdateFilter("supplier", val)}
              options={supplierOptions}
              searchPlaceholder="Search supplier..."
            />

            <FilterSelect
              label="Region"
              value={filters.region}
              onChange={(e) => onUpdateFilter("region", e.target.value)}
            >
              <option value="ALL">All Regions</option>
              <option value="Federal">Federal / FPCU</option>
              <option value="Oromia">Oromia</option>
              <option value="Amhara">Amhara</option>
              <option value="Somali">Somali</option>
            </FilterSelect>

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
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <FilterSelect
              label="Contract Status"
              value={filters.contractStatus}
              onChange={(e) => onUpdateFilter("contractStatus", e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active / In Execution</option>
              <option value="Completed">Completed</option>
              <option value="Terminated">Terminated</option>
            </FilterSelect>

            <FilterSelect
              label="Region"
              value={filters.region}
              onChange={(e) => onUpdateFilter("region", e.target.value)}
            >
              <option value="ALL">All Regions</option>
              <option value="Federal">Federal / FPCU</option>
              <option value="Oromia">Oromia</option>
              <option value="Amhara">Amhara</option>
              <option value="Somali">Somali</option>
            </FilterSelect>

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
            <FilterSelect
              label="Group Summary By"
              value={filters.orgGrouping}
              onChange={(e) =>
                onUpdateFilter("orgGrouping", e.target.value as any)
              }
            >
              <option value="REGION">Regional Scope</option>
              <option value="SECTOR">Sector Scope</option>
              <option value="ORGANIZATION">Organization Unit</option>
            </FilterSelect>

            <FilterSelect
              label="Fiscal Year (EFY)"
              value={filters.efy}
              onChange={(e) => onUpdateFilter("efy", e.target.value)}
            >
              <option value="ALL">All Years</option>
              <option value="2016 EFY">2016 EFY</option>
              <option value="2017 EFY">2017 EFY</option>
              <option value="2018 EFY">2018 EFY</option>
              <option value="2019 EFY">2019 EFY</option>
            </FilterSelect>

            <SearchableSelect
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />
          </>
        )}

        {/* 11. PROJECT SUMMARY */}
        {activeReport === "project-summary" && (
          <>
            <SearchableSelect
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <FilterSelect
              label="Fiscal Year (EFY)"
              value={filters.efy}
              onChange={(e) => onUpdateFilter("efy", e.target.value)}
            >
              <option value="ALL">All Years</option>
              <option value="2016 EFY">2016 EFY</option>
              <option value="2017 EFY">2017 EFY</option>
              <option value="2018 EFY">2018 EFY</option>
              <option value="2019 EFY">2019 EFY</option>
            </FilterSelect>

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
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
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
              <FilterSelect
                label="Fiscal Year (EFY)"
                value={filters.efy}
                onChange={(e) => onUpdateFilter("efy", e.target.value)}
              >
                <option value="ALL">All Years</option>
                <option value="2016 EFY">2016 EFY</option>
                <option value="2017 EFY">2017 EFY</option>
                <option value="2018 EFY">2018 EFY</option>
              </FilterSelect>
            )}
          </>
        )}

        {/* 13. COMMITTEE / APPROVAL PROGRESS */}
        {activeReport === "committee-approval" && (
          <>
            <SearchableSelect
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <FilterSelect
              label="Committee Result"
              value={filters.committeeResult}
              onChange={(e) =>
                onUpdateFilter("committeeResult", e.target.value)
              }
            >
              <option value="ALL">All Results</option>
              <option value="ENDORSED">Endorsed (3+ votes)</option>
              <option value="REJECTED">Rejected (3+ votes)</option>
              <option value="IN_VOTING">Voting in Progress</option>
              <option value="PENDING">Pending Review</option>
            </FilterSelect>

            <FilterSelect
              label="Management Decision"
              value={filters.managementDecision}
              onChange={(e) =>
                onUpdateFilter("managementDecision", e.target.value)
              }
            >
              <option value="ALL">All Decisions</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PENDING">Pending Decision</option>
            </FilterSelect>

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
              label="Sector"
              value={filters.sector}
              onChange={(val) => onUpdateFilter("sector", val)}
              options={sectorOptions}
              searchPlaceholder="Search sector..."
            />

            <SearchableMultiSelect
              label="Project"
              values={selectedProjectValues}
              onChange={handleProjectsChange}
              options={projectOptions}
              searchPlaceholder="Search project..."
            />

            <SearchableSelect
              label="Supplier / Contractor"
              value={filters.supplier}
              onChange={(val) => onUpdateFilter("supplier", val)}
              options={supplierOptions}
              searchPlaceholder="Search supplier..."
            />

            <FilterSelect
              label="Region"
              value={filters.region}
              onChange={(e) => onUpdateFilter("region", e.target.value)}
            >
              <option value="ALL">All Regions</option>
              <option value="Federal">Federal / FPCU</option>
              <option value="Oromia">Oromia</option>
              <option value="Amhara">Amhara</option>
              <option value="Somali">Somali</option>
            </FilterSelect>

            <FilterSelect
              label="Contract Status"
              value={filters.contractStatus}
              onChange={(e) => onUpdateFilter("contractStatus", e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="TERMINATED">Terminated</option>
            </FilterSelect>
          </>
        )}
      </div>
    </div>
  );
}
