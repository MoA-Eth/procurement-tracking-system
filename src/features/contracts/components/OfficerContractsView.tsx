"use client";

import { StatusText } from "../../../components/dashboard/StatusText";
import {
  Banknote,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AddContractPaymentView } from "./AddContractPaymentView";
import { RegisterContractView } from "./RegisterContractView";
import { ContractExcelImportModal } from "./ContractExcelImportModal";
import { exportContractsToExcel } from "../utils/contractExcelUtils";
import {
  addSavedContract,
  OFFICER_CONTRACTS_STORAGE_KEY,
  officerContracts,
  parseSavedContracts,
  type ContractStatus,
  type OfficerContract,
} from "../data/officerContracts";
import {
  addSavedPayment,
  applyPaymentsToContract,
  OFFICER_PAYMENTS_STORAGE_KEY,
  parseSavedPayments,
  type OfficerContractPayment,
} from "../data/officerPayments";
import {
  createContract,
  recordContractPayment,
  fetchContracts,
  mapBackendContractToOfficerContract,
  importContracts,
} from "@/lib/contractsApi";
import { BACKEND_API_URL } from "@/lib/apiClient";
import { authTokenManager } from "@/lib/authTokenManager";
import {
  contractFiscalYear,
  filterOfficerContracts,
} from "../data/contractFilters";

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function OfficerContractsView({
  fromTracker,
  initialActivityReference,
  initialPlanReference,
  initialProjectCode,
  mode,
  selectedContractNumber,
}: {
  fromTracker?: boolean;
  initialActivityReference?: string;
  initialPlanReference?: string;
  initialProjectCode?: string;
  mode?: "add-payment" | "register";
  selectedContractNumber?: string;
}) {
  const router = useRouter();
  const [savedContracts, setSavedContracts] = useState<OfficerContract[]>([]);
  const [savedPayments, setSavedPayments] = useState<OfficerContractPayment[]>(
    [],
  );
  const [prevSelectedContractNumber, setPrevSelectedContractNumber] = useState(
    selectedContractNumber,
  );
  const [fiscalYear, setFiscalYear] = useState("all");
  const [searchQuery, setSearchQuery] = useState(
    () => selectedContractNumber ?? "",
  );
  const [status, setStatus] = useState<"all" | ContractStatus>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importNotification, setImportNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadContractsData = useCallback(async () => {
    const localContracts = parseSavedContracts(
      window.localStorage.getItem(OFFICER_CONTRACTS_STORAGE_KEY),
    );
    const localPayments = parseSavedPayments(
      window.localStorage.getItem(OFFICER_PAYMENTS_STORAGE_KEY),
    );

    try {
      const backendContracts = await fetchContracts();
      if (backendContracts && backendContracts.length > 0) {
        const mappedBackend = backendContracts.map(
          mapBackendContractToOfficerContract,
        );
        const mapByNum = new Map<string, OfficerContract>();
        localContracts.forEach((c) =>
          mapByNum.set(c.contractNumber.toLowerCase(), c),
        );
        mappedBackend.forEach((c) =>
          mapByNum.set(c.contractNumber.toLowerCase(), c),
        );
        setSavedContracts(Array.from(mapByNum.values()));
      } else {
        setSavedContracts(localContracts);
      }
    } catch {
      setSavedContracts(localContracts);
    }
    setSavedPayments(localPayments);
  }, []);

  useEffect(() => {
    loadContractsData();
  }, [loadContractsData]);

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleImportSuccess = async (result: {
    created: number;
    updated: number;
  }) => {
    setImportNotification({
      type: "success",
      message: `Contracts imported successfully! (${result.created} created, ${result.updated} updated)`,
    });
    await loadContractsData();
  };

  if (selectedContractNumber !== prevSelectedContractNumber) {
    setPrevSelectedContractNumber(selectedContractNumber);
    if (selectedContractNumber) {
      setSearchQuery(selectedContractNumber);
    }
  }

  const contracts = useMemo(() => {
    const savedByNumber = new Map(
      savedContracts.map((contract) => [
        contract.contractNumber.toLowerCase(),
        contract,
      ]),
    );
    const mergedContracts = [
      ...officerContracts.map(
        (fixture) =>
          savedByNumber.get(fixture.contractNumber.toLowerCase()) ?? fixture,
      ),
      ...savedContracts.filter(
        (saved) =>
          !officerContracts.some(
            (fixture) =>
              fixture.contractNumber.toLowerCase() ===
              saved.contractNumber.toLowerCase(),
          ),
      ),
    ];

    return mergedContracts.map((contract) =>
      applyPaymentsToContract(contract, savedPayments),
    );
  }, [savedContracts, savedPayments]);

  const selectedContract = contracts.find(
    (contract) => contract.contractNumber === selectedContractNumber,
  );

  const fiscalYearOptions = useMemo(
    () =>
      Array.from(
        new Set(contracts.map(contractFiscalYear).filter(Boolean)),
      ).sort((left, right) => right.localeCompare(left)),
    [contracts],
  );

  const filteredContracts = useMemo(() => {
    return filterOfficerContracts(contracts, {
      currency: "all",
      fiscalYear,
      organization: "all",
      project: "all",
      searchQuery,
      status,
    });
  }, [contracts, fiscalYear, searchQuery, status]);

  async function saveContract(contract: OfficerContract) {
    const nextContracts = addSavedContract(savedContracts, contract);
    setSavedContracts(nextContracts);
    window.localStorage.setItem(
      OFFICER_CONTRACTS_STORAGE_KEY,
      JSON.stringify(nextContracts),
    );

    // Async backend contract creation
    try {
      await createContract({
        contractNo: contract.contractNumber,
        totalValue: contract.originalAmount || 100000,
        currency: contract.currency || "ETB",
        region: contract.details?.organizationRegion || "Federal",
        sector: "Agriculture",
      });
    } catch (err) {
      console.warn("Backend createContract note:", err);
    }

    router.push("/workspace/contracts");
  }

  async function savePayment(payment: OfficerContractPayment) {
    const nextPayments = addSavedPayment(savedPayments, payment);
    setSavedPayments(nextPayments);
    window.localStorage.setItem(
      OFFICER_PAYMENTS_STORAGE_KEY,
      JSON.stringify(nextPayments),
    );

    // Async backend payment creation
    try {
      await recordContractPayment(payment.contractNumber || "contract-id", {
        amount: payment.amount,
        referenceNo: payment.reference || `VOU-${Date.now()}`,
        idempotencyKey: `pay-${Date.now()}`,
      });
    } catch (err) {
      console.warn("Backend recordContractPayment note:", err);
    }

    router.push("/workspace/contracts");
  }

  const allVisibleSelected =
    filteredContracts.length > 0 &&
    filteredContracts.every((contract) => selectedIds.has(contract.id));

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        filteredContracts.forEach((contract) => next.delete(contract.id));
      } else {
        filteredContracts.forEach((contract) => next.add(contract.id));
      }
      return next;
    });
  }

  function toggleContract(contractId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(contractId)) next.delete(contractId);
      else next.add(contractId);
      return next;
    });
  }

  function handleExportContracts(selectedOnly = false) {
    const contractsToExport =
      selectedOnly && selectedIds.size > 0
        ? filteredContracts.filter((contract) => selectedIds.has(contract.id))
        : filteredContracts;

    if (contractsToExport.length === 0) {
      setImportNotification({
        type: "error",
        message: "No contracts available to export.",
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename =
        selectedOnly && selectedIds.size > 0
          ? `Contracts_Selected_Export_${timestamp}.xlsx`
          : `Contracts_Export_${timestamp}.xlsx`;

      exportContractsToExcel(contractsToExport, savedPayments, filename);

      setImportNotification({
        type: "success",
        message: `Successfully exported ${contractsToExport.length} contract${
          contractsToExport.length > 1 ? "s" : ""
        } to Excel.`,
      });
    } catch (err) {
      console.error("Failed to export contracts to Excel:", err);
      setImportNotification({
        type: "error",
        message: "An error occurred while exporting contracts to Excel.",
      });
    }
  }

  const visibleCount = filteredContracts.length;
  const hasActiveFilters =
    Boolean(searchQuery.trim()) || fiscalYear !== "all" || status !== "all";
  const totalResults = hasActiveFilters ? visibleCount : contracts.length;
  const entrySummary =
    visibleCount === 0
      ? "Showing 0 results"
      : `Showing 1 to ${visibleCount} of ${totalResults} results`;
  const wrappingCellStyle = {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
  } as const;

  if (mode === "register") {
    return (
      <RegisterContractView
        existingContracts={contracts}
        fromTracker={fromTracker}
        initialActivityReference={initialActivityReference}
        initialPlanReference={initialPlanReference}
        initialProjectCode={initialProjectCode}
        onSave={saveContract}
      />
    );
  }

  if (mode === "add-payment" && selectedContract) {
    return (
      <AddContractPaymentView
        contract={selectedContract}
        fromTracker={fromTracker}
        onSave={savePayment}
      />
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden pb-6">
      <header className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
            <ol className="flex items-center gap-2">
              <li>
                <Link
                  className="hover:text-[#176c55] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
                  href="/dashboard/officer"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-slate-300">
                /
              </li>
              <li aria-current="page" className="font-bold text-[#176c55]">
                Contracts
              </li>
            </ol>
          </nav>
          <h1 className="sr-only">Contracts</h1>
        </div>

        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            className="inline-flex h-10 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-700 shadow-xs hover:border-[#176c55] hover:bg-[#edf5f1] hover:text-[#176c55] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55] cursor-pointer"
            onClick={() => handleExportContracts(selectedIds.size > 0)}
            type="button"
          >
            <Download aria-hidden="true" className="h-4 w-4 text-slate-500" />
            {selectedIds.size > 0
              ? `Export Selected (${selectedIds.size})`
              : "Export Contracts"}
          </button>
          <button
            className="inline-flex h-10 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-700 shadow-xs hover:border-[#176c55] hover:bg-[#edf5f1] hover:text-[#176c55] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55] cursor-pointer"
            onClick={handleImportClick}
            type="button"
          >
            <Upload aria-hidden="true" className="h-4 w-4 text-slate-500" />
            Import Contracts
          </button>
          <Link
            className="inline-flex h-10 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-md border border-[#125442] bg-[#176c55] px-4 text-sm font-bold text-white shadow-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55] transition"
            href="/workspace/contracts?mode=register"
            style={{ backgroundColor: "#176c55", color: "#ffffff" }}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Register Contract
          </Link>
        </div>
      </header>

      {importNotification && (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 text-xs font-medium ${
            importNotification.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span>{importNotification.message}</span>
          <button
            className="font-bold underline cursor-pointer"
            onClick={() => setImportNotification(null)}
            type="button"
          >
            Dismiss
          </button>
        </div>
      )}

      <section
        aria-label="Contract filters and table controls"
        className="w-full min-w-0 rounded-md border border-slate-300 bg-white p-3 shadow-sm"
      >
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(20rem,1fr)_8.5rem_10rem]">
          <label className="relative block min-w-0 sm:col-span-2 xl:col-span-1">
            <span className="sr-only">
              Search by contract number, activity reference, activity, or
              supplier
            </span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500"
            />
            <input
              className="h-10 w-full rounded-sm border border-slate-300 bg-[#fbfcfd] pr-3 pl-10 text-xs text-slate-800 outline-none transition placeholder:text-slate-500 hover:border-[#9fb8ad] focus:border-[#176c55] focus:bg-white focus:ring-2 focus:ring-[#176c55]/15"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Contract #, Ref, or Supplier..."
              type="search"
              value={searchQuery}
            />
          </label>

          <LabeledSelect
            compact
            label="Fiscal Year"
            onChange={setFiscalYear}
            options={[
              { label: "Fiscal Year", value: "all" },
              ...fiscalYearOptions.map((year) => ({
                label: year,
                value: year,
              })),
            ]}
            minimumWidth="8.5rem"
            value={fiscalYear}
          />

          <LabeledSelect
            compact
            label="Status"
            onChange={(value) => setStatus(value as "all" | ContractStatus)}
            options={[
              { label: "Status", value: "all" },
              { label: "Active", value: "Active" },
              {
                label: "Active / Under Implementation",
                value: "Active / Under Implementation",
              },
              { label: "Completed", value: "Completed" },
              { label: "Delayed", value: "Delayed" },
              { label: "Signed", value: "Signed" },
              {
                label: "Planned / Prepared",
                value: "Planned / Prepared",
              },
              { label: "Terminated", value: "Terminated" },
              {
                label: "Partially Terminated",
                value: "Partially Terminated",
              },
            ]}
            minimumWidth="10rem"
            value={status}
          />
        </div>
      </section>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2.5 text-xs font-semibold text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#176c55] text-white text-[10px] font-bold">
              {selectedIds.size}
            </span>
            <span>
              {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "contract" : "contracts"} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-md bg-[#176c55] px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#125442] transition cursor-pointer"
              onClick={() => handleExportContracts(true)}
              type="button"
            >
              <Download aria-hidden="true" className="h-3.5 w-3.5" />
              Export Selected ({selectedIds.size})
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-50 transition cursor-pointer"
              onClick={() => handleExportContracts(false)}
              type="button"
            >
              Export All ({filteredContracts.length})
            </button>
            <button
              className="rounded-md px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-950 transition cursor-pointer underline"
              onClick={() => setSelectedIds(new Set())}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <section
        className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs"
        style={{ minHeight: "max(36rem, calc(100dvh - 9rem))" }}
      >
        <h2 className="sr-only">Contract register</h2>
        <div
          aria-label="Contract register table"
          className="max-w-full min-w-0 flex-1 overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#176c55]"
          role="region"
          tabIndex={0}
        >
          <table className="w-full min-w-[2200px] table-fixed border-collapse text-left">
            <thead>
              <tr className="bg-[#0A3C2F] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="w-12 px-3 py-3 text-center" scope="col">
                  <input
                    aria-label="Select all visible contracts"
                    checked={allVisibleSelected}
                    className="h-4 w-4 accent-emerald-500"
                    onChange={toggleAllVisible}
                    type="checkbox"
                  />
                </th>
                <th className="w-72 min-w-[280px] px-3.5 py-3" scope="col">
                  Contract number
                </th>
                <th className="w-80 min-w-[320px] px-3.5 py-3" scope="col">
                  Procurement activity
                </th>
                <th className="w-28 min-w-[110px] px-3 py-3" scope="col">
                  Project
                </th>
                <th className="w-60 min-w-[240px] px-3.5 py-3" scope="col">
                  Supplier/contractor
                </th>
                <th
                  className="w-40 min-w-[160px] px-3 py-3 text-right"
                  scope="col"
                >
                  Original amount
                </th>
                <th
                  className="w-40 min-w-[160px] px-3 py-3 text-right"
                  scope="col"
                >
                  Current amount
                </th>
                <th
                  className="w-16 min-w-[64px] px-3 py-3 text-center"
                  scope="col"
                >
                  Curr
                </th>
                <th
                  className="w-36 min-w-[144px] px-3 py-3 text-right"
                  scope="col"
                >
                  Total paid
                </th>
                <th
                  className="w-40 min-w-[160px] px-3 py-3 text-right"
                  scope="col"
                >
                  Remaining balance
                </th>
                <th className="w-40 min-w-[160px] px-3 py-3" scope="col">
                  Signing date (GC/EC)
                </th>
                <th className="w-40 min-w-[160px] px-3 py-3" scope="col">
                  Completion date
                </th>
                <th className="w-36 min-w-[140px] px-3 py-3" scope="col">
                  Status
                </th>
                <th
                  className="w-32 min-w-[128px] px-3 py-3 text-center"
                  scope="col"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract) => {
                  const isDelayed = contract.status === "Delayed";

                  return (
                    <tr
                      key={contract.id}
                      className="even:bg-[#fbfcff] hover:bg-[#f7fbf9]"
                    >
                      <td className="px-3 py-2.5 text-center align-top">
                        <input
                          aria-label={`Select contract ${contract.contractNumber}`}
                          checked={selectedIds.has(contract.id)}
                          className="h-4 w-4 accent-[#176c55]"
                          onChange={() => toggleContract(contract.id)}
                          type="checkbox"
                        />
                      </td>
                      <td className="w-72 min-w-[280px] whitespace-nowrap px-3.5 py-2.5 align-top font-mono text-xs font-bold text-slate-800">
                        {contract.contractNumber}
                      </td>
                      <td className="w-80 min-w-[320px] px-3.5 py-2.5 align-top text-xs leading-5 text-slate-700 wrap-break-word">
                        <span
                          className="wrap-break-word line-clamp-2 block"
                          title={contract.procurementActivity}
                        >
                          {contract.procurementActivity}
                        </span>
                      </td>
                      <td className="w-28 min-w-[110px] px-3 py-2.5 align-top text-xs font-semibold text-slate-500">
                        {contract.project}
                      </td>
                      <td className="w-60 min-w-[240px] px-3.5 py-2.5 align-top text-xs leading-5 text-slate-700 wrap-break-word">
                        <span
                          className="wrap-break-word line-clamp-2 block"
                          title={contract.supplier}
                        >
                          {contract.supplier}
                        </span>
                      </td>
                      <AmountCell value={contract.originalAmount} />
                      <td className="px-3 py-2.5 text-right align-top font-mono text-sm tabular-nums text-slate-700">
                        {amountFormatter.format(contract.currentAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-center align-top text-sm font-medium text-slate-500">
                        {contract.currency}
                      </td>
                      <AmountCell muted value={contract.totalPaid} />
                      <AmountCell
                        emphasized
                        value={contract.remainingBalance}
                      />
                      <DateCell date={contract.signingDate} />
                      <DateCell
                        date={contract.completionDate}
                        delayed={isDelayed}
                      />
                      <td className="whitespace-nowrap px-3 py-2.5 align-top">
                        <StatusText
                          className="text-xs"
                          label={contract.status}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center align-top">
                        <Link
                          aria-label={`Add payment to contract ${contract.contractNumber}`}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#a9cbbd] bg-white px-3 text-[11px] font-bold whitespace-nowrap text-[#07523f] shadow-xs hover:border-[#176c55] hover:bg-[#edf5f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
                          href={`/workspace/contracts?mode=add-payment&contract=${encodeURIComponent(contract.contractNumber)}`}
                        >
                          <Banknote
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                          Add Payment
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    className="px-4 py-14 text-center text-sm text-slate-500"
                    colSpan={14}
                  >
                    No contracts match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-[#fbfcff] px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite">{entrySummary}</p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              Rows per page:
              <select
                aria-label="Rows per page"
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:border-[#348267] focus:ring-2 focus:ring-[#348267]/15"
                defaultValue="50"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </label>
            <div aria-label="Contract table pagination" className="flex gap-1">
              <button
                aria-label="Previous page"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300"
                disabled
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                aria-label="Next page"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
                type="button"
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </footer>
      </section>

      <ContractExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}

function LabeledSelect({
  compact = false,
  label,
  options,
  minimumWidth,
  value,
  onChange,
}: {
  compact?: boolean;
  label: string;
  options: readonly { label: string; value: string }[];
  minimumWidth: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedOption = options[selectedIndex] ?? options[0];
  const longestOption = options.reduce(
    (longest, option) =>
      option.label.length > longest.length ? option.label : longest,
    "",
  );
  const triggerWidth = `${Math.max(longestOption.length + 5, 10)}ch`;

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(() => {
      optionRefs.current[selectedIndex]?.focus();
    });

    function closeOnOutsidePress(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOnOutsidePress);
    };
  }, [isOpen, selectedIndex]);

  function closeAndRestoreFocus() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function focusOption(index: number) {
    const normalizedIndex =
      (index + options.length) % Math.max(options.length, 1);
    optionRefs.current[normalizedIndex]?.focus();
  }

  return (
    <div
      className={
        compact
          ? "block min-w-0 text-xs font-semibold text-slate-600"
          : "flex items-center gap-4 whitespace-nowrap text-sm font-semibold text-slate-600"
      }
      ref={rootRef}
      style={
        compact
          ? { minWidth: minimumWidth, width: "100%" }
          : { columnGap: "1rem" }
      }
    >
      <span
        className={compact ? "sr-only" : undefined}
        id={`${listboxId}-label`}
      >
        {label}:
      </span>
      <span className="relative block min-w-0">
        <button
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-labelledby={`${listboxId}-label ${listboxId}-value`}
          className={`relative inline-flex cursor-pointer items-center border border-slate-300 text-left font-medium text-slate-700 shadow-xs hover:border-[#8db7a6] focus-visible:border-[#348267] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#348267]/15 ${
            compact
              ? "h-10 w-full rounded-sm bg-[#fbfcfd] py-2 pr-9 pl-3 text-xs"
              : "h-11 rounded-md bg-white py-2.5 pr-11 pl-4 text-sm"
          }`}
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          ref={triggerRef}
          style={{
            alignItems: "center",
            boxSizing: "border-box",
            display: "inline-flex",
            height: compact ? "2.5rem" : "2.75rem",
            justifyContent: "flex-start",
            minWidth: minimumWidth,
            paddingLeft: compact ? "0.75rem" : "1rem",
            paddingRight: compact ? "2.25rem" : "2.75rem",
            position: "relative",
            width: compact ? "100%" : triggerWidth,
          }}
          type="button"
        >
          <span
            className="min-w-0 flex-1 truncate whitespace-nowrap"
            id={`${listboxId}-value`}
            title={selectedOption?.label}
          >
            {selectedOption?.label}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute h-4 w-4 text-slate-500 transition-transform"
            style={{
              right: compact ? "0.65rem" : "0.75rem",
              top: "50%",
              transform: isOpen
                ? "translateY(-50%) rotate(180deg)"
                : "translateY(-50%)",
            }}
          />
        </button>

        {isOpen ? (
          <div
            aria-labelledby={`${listboxId}-label`}
            className="absolute top-full left-0 z-50 mt-1.5 w-max max-w-[min(24rem,calc(100vw-2rem))] min-w-full rounded-md border border-slate-200 bg-white p-1 shadow-lg"
            id={listboxId}
            role="listbox"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;

              return (
                <button
                  aria-selected={isSelected}
                  className={`flex w-full items-center justify-between gap-6 rounded px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap outline-none ${
                    isSelected
                      ? "bg-[#edf5f1] text-[#07523f]"
                      : "text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50"
                  }`}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    closeAndRestoreFocus();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusOption(index + 1);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      focusOption(index - 1);
                    } else if (event.key === "Home") {
                      event.preventDefault();
                      focusOption(0);
                    } else if (event.key === "End") {
                      event.preventDefault();
                      focusOption(options.length - 1);
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      closeAndRestoreFocus();
                    } else if (event.key === "Tab") {
                      setIsOpen(false);
                    }
                  }}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  role="option"
                  type="button"
                >
                  {option.label}
                  <span className="flex h-4 w-4 items-center justify-center">
                    {isSelected ? (
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </span>
    </div>
  );
}

function AmountCell({
  value,
  muted = false,
  emphasized = false,
}: {
  value: number;
  muted?: boolean;
  emphasized?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2.5 text-right align-top font-mono text-sm tabular-nums ${
        emphasized
          ? "font-bold text-slate-800"
          : muted
            ? "text-slate-500"
            : "text-slate-700"
      }`}
    >
      {amountFormatter.format(value)}
    </td>
  );
}

function DateCell({
  date,
  delayed = false,
}: {
  date: OfficerContract["signingDate"];
  delayed?: boolean;
}) {
  return (
    <td className="px-3 py-2.5 align-top">
      <p
        className={`whitespace-nowrap text-sm font-medium ${
          delayed ? "text-red-600" : "text-slate-700"
        }`}
      >
        {date.gregorian}
      </p>
      <p className="mt-1 whitespace-nowrap text-[11px] text-slate-500">
        {date.ethiopian}
      </p>
    </td>
  );
}
