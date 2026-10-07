"use client";

import { StatusText } from "../../../components/dashboard/StatusText";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileEdit,
  FileText,
  FolderOpen,
  Info,
  Plus,
  Receipt,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ContractAmendment,
  OfficerContract,
} from "../data/officerContracts";
import type { OfficerContractPayment } from "../data/officerPayments";
import {
  fetchContractAmendments,
  fetchContractPayments,
  mapBackendPaymentType,
  type BackendPayment,
} from "@/lib/contractsApi";
import {
  formatEthiopianDate,
  gregorianToEthiopian,
} from "@/features/projects/utils/ethiopianCalendar";

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(val: number | string | undefined | null): string {
  const num = Number(val);
  if (isNaN(num)) return "0.00";
  return amountFormatter.format(num);
}

function paymentTypeBadgeClass(paymentType: string): string {
  const lower = paymentType.toLowerCase();
  if (lower.includes("advance")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (
    lower.includes("interim") ||
    lower.includes("1st") ||
    lower.includes("2nd")
  ) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
  if (lower.includes("final")) {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  if (lower.includes("retention")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function OfficerContractDetailView({
  contract,
  fromTracker,
  payments: initialPayments = [],
}: {
  contract: OfficerContract;
  fromTracker?: boolean;
  payments?: readonly OfficerContractPayment[];
}) {
  const [payments, setPayments] = useState<OfficerContractPayment[]>(() => [
    ...initialPayments,
  ]);

  // Merge any payments that may exist on the backend for this contract
  useEffect(() => {
    let isMounted = true;
    async function loadBackendPayments() {
      if (!contract.id) return;
      try {
        const data = await fetchContractPayments(contract.id);
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const mapped: OfficerContractPayment[] = data.map(
            (p: BackendPayment) => ({
              id: p.id,
              contractNumber: contract.contractNumber,
              amount: Number(p.amount) || 0,
              currency: contract.currency || "ETB",
              date: {
                ethiopian: "",
                gregorian: p.paymentDate
                  ? new Date(p.paymentDate).toLocaleDateString("en-GB")
                  : p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString("en-GB")
                    : "-",
              },
              paymentType: mapBackendPaymentType(p.paymentType),
              reference: p.referenceNo,
              remarks: (p as any).remarks,
            }),
          );

          setPayments((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const existingRefs = new Set(
              prev.map((item) => item.reference).filter(Boolean),
            );
            const combined = [...prev];
            for (const item of mapped) {
              if (
                !existingIds.has(item.id) &&
                (!item.reference || !existingRefs.has(item.reference))
              ) {
                combined.push(item);
              }
            }
            return combined;
          });
        }
      } catch {
        // Fall back to initialPayments
      }
    }
    loadBackendPayments();
    return () => {
      isMounted = false;
    };
  }, [contract.id, contract.contractNumber]);

  useEffect(() => {
    setPayments((prev) => {
      const mergedMap = new Map<string, OfficerContractPayment>();
      initialPayments.forEach((p) => mergedMap.set(p.id, p));
      prev.forEach((p) => {
        if (!mergedMap.has(p.id)) {
          mergedMap.set(p.id, p);
        }
      });
      return Array.from(mergedMap.values());
    });
  }, [initialPayments]);

  const [loadedAmendments, setLoadedAmendments] = useState<ContractAmendment[]>(
    [],
  );

  useEffect(() => {
    let isMounted = true;
    async function loadBackendAmendments() {
      if (!contract.id) return;
      try {
        const backendAmendments = await fetchContractAmendments(contract.id);
        if (isMounted && backendAmendments && backendAmendments.length > 0) {
          setLoadedAmendments(
            backendAmendments.map((ba) => ({
              id: ba.amendmentNo,
              amount: Number(ba.variationAmount) || 0,
              reason: ba.reason,
              effectiveDate: ba.effectiveDate || undefined,
              approvalRef: ba.approvalRef || undefined,
              notes: ba.notes || undefined,
            })),
          );
        }
      } catch {
        // Fall back to contract.details?.amendments
      }
    }
    loadBackendAmendments();
    return () => {
      isMounted = false;
    };
  }, [contract.id]);

  const mergedAmendments = useMemo(() => {
    const local = contract.details?.amendments || [];
    if (loadedAmendments.length === 0) return local;

    const map = new Map<number, ContractAmendment>();
    for (const ba of loadedAmendments) {
      map.set(ba.id, ba);
    }
    for (const la of local) {
      const existing = map.get(la.id);
      map.set(la.id, {
        id: la.id,
        amount: la.amount,
        reason: la.reason || existing?.reason,
        effectiveDate: la.effectiveDate || existing?.effectiveDate,
        ethiopianDate: la.ethiopianDate || existing?.ethiopianDate,
        approvalRef: la.approvalRef || existing?.approvalRef,
        notes: la.notes || existing?.notes,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [contract.details?.amendments, loadedAmendments]);

  const totalVariationAmount = useMemo(() => {
    return mergedAmendments.reduce(
      (sum, amendment) => sum + (Number(amendment.amount) || 0),
      0,
    );
  }, [mergedAmendments]);

  const currency = contract.currency || "ETB";
  const originalAmount = Number(contract.originalAmount) || 0;
  const currentAmount = Number(contract.currentAmount) || 0;

  const totalPaymentsAmount = useMemo(() => {
    return payments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0,
    );
  }, [payments]);

  const effectiveTotalPaid = Math.max(
    Number(contract.totalPaid) || 0,
    totalPaymentsAmount,
  );
  const effectiveRemainingBalance = Math.max(
    0,
    currentAmount - effectiveTotalPaid,
  );
  const paidPercent =
    currentAmount > 0
      ? Math.min(100, Math.round((effectiveTotalPaid / currentAmount) * 100))
      : 0;

  const backHref = fromTracker
    ? "/workspace/activity-tracker"
    : "/workspace/contracts";

  const addPaymentHref = `/workspace/contracts?mode=add-payment&contract=${encodeURIComponent(contract.contractNumber)}&from=open${fromTracker ? "&origin=tracker" : ""}`;
  const addAmendmentHref = `/workspace/contracts?mode=add-amendment&contract=${encodeURIComponent(contract.contractNumber)}&from=open${fromTracker ? "&origin=tracker" : ""}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Header & Breadcrumb */}
      <header className="space-y-3">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link className="hover:text-[#0A3C2F]" href="/dashboard/officer">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link className="hover:text-[#0A3C2F]" href={backHref}>
                {fromTracker ? "Activity Tracker" : "Contracts"}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-semibold text-slate-800">
              {contract.contractNumber}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                {contract.contractNumber}
              </span>
              <StatusText className="text-xs" label={contract.status} />
              <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                Project: {contract.project}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 wrap-break-word">
              {contract.procurementActivity}
            </h1>
            <p className="mt-1 text-xs text-slate-600 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              Supplier / Contractor:{" "}
              <span className="font-semibold text-slate-800">
                {contract.supplier}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
              href={backHref}
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Back to Contracts
            </Link>
            <Link
              aria-label={`Amend contract ${contract.contractNumber}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
              href={addAmendmentHref}
            >
              <FileEdit
                aria-hidden="true"
                className="h-3.5 w-3.5 text-slate-500"
              />
              Amend
            </Link>
            <Link
              aria-label={`Add payment to contract ${contract.contractNumber}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-300 bg-[#0A3C2F] text-xs font-semibold text-white hover:bg-[#072a21] transition-colors shadow-2xs"
              href={addPaymentHref}
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              Add Payment
            </Link>
          </div>
        </div>
      </header>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Original Amount
            </span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-slate-900">
            {formatAmount(originalAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Currency: {currency}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Current Contract Amount
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-slate-900">
            {formatAmount(currentAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            {currentAmount !== originalAmount
              ? `Amended (${currency})`
              : `Base value (${currency})`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Total Paid to Date
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-slate-900">
            {formatAmount(effectiveTotalPaid)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
            <span className="text-2xs font-semibold text-slate-600">
              {paidPercent}%
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/40 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-900">
              Remaining Balance
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-100/80 flex items-center justify-center text-[#0A3C2F]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-[#0A3C2F]">
            {formatAmount(effectiveRemainingBalance)}
          </p>
          <p className="mt-1 text-xs text-emerald-800 font-medium">
            Outstanding ({currency})
          </p>
        </div>
      </div>

      {/* Contract Details Section */}
      <section className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              Contract Specifications & Dates
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Status:{" "}
            <span className="font-semibold text-slate-700">
              {contract.status}
            </span>
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-xs">
          <div>
            <span className="text-slate-500 block">Contract Number</span>
            <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
              {contract.contractNumber}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Project Code & Name</span>
            <span className="font-medium text-slate-900 mt-0.5 block">
              {contract.project}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Supplier / Contractor</span>
            <span className="font-medium text-slate-900 mt-0.5 block">
              {contract.supplier}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Signing Date</span>
            <span className="font-medium text-slate-900 mt-0.5 block">
              {contract.signingDate?.gregorian || "—"}
              {contract.signingDate?.ethiopian
                ? ` (${contract.signingDate.ethiopian})`
                : ""}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">
              Planned Completion Date
            </span>
            <span className="font-medium text-slate-900 mt-0.5 block">
              {contract.completionDate?.gregorian || "—"}
              {contract.completionDate?.ethiopian
                ? ` (${contract.completionDate.ethiopian})`
                : ""}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Contract Currency</span>
            <span className="font-medium text-slate-900 mt-0.5 block">
              {currency}
            </span>
          </div>

          {contract.details?.exchangeRate ? (
            <div>
              <span className="text-slate-500 block">Exchange Rate to ETB</span>
              <span className="font-medium text-slate-900 mt-0.5 block">
                1 {currency} = {formatAmount(contract.details.exchangeRate)} ETB
                {contract.details.equivalentAmountETB ? (
                  <span className="text-slate-500 ml-1 font-mono text-[11px]">
                    (≈ {formatAmount(contract.details.equivalentAmountETB)} ETB)
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}

          {contract.details?.activityReference ? (
            <div>
              <span className="text-slate-500 block">
                Procurement Activity Reference
              </span>
              <span className="font-mono text-slate-900 mt-0.5 block">
                {contract.details.activityReference}
              </span>
            </div>
          ) : null}

          {contract.details?.planReference ? (
            <div>
              <span className="text-slate-500 block">
                Procurement Plan Reference
              </span>
              <span className="font-mono text-slate-900 mt-0.5 block">
                {contract.details.planReference}
              </span>
            </div>
          ) : null}

          {contract.details?.subcomponent ? (
            <div>
              <span className="text-slate-500 block">Subcomponent</span>
              <span className="font-medium text-slate-900 mt-0.5 block">
                {contract.details.subcomponent}
              </span>
            </div>
          ) : null}

          {contract.details?.organizationRegion ? (
            <div>
              <span className="text-slate-500 block">
                Region / Organization
              </span>
              <span className="font-medium text-slate-900 mt-0.5 block">
                {contract.details.organizationRegion}
              </span>
            </div>
          ) : null}

          {contract.details?.amountWithVat ? (
            <div>
              <span className="text-slate-500 block">Amount with VAT</span>
              <span className="font-mono font-medium text-slate-900 mt-0.5 block">
                {formatAmount(contract.details.amountWithVat)} {currency}
              </span>
            </div>
          ) : null}

          {contract.details?.netOfVat ? (
            <div>
              <span className="text-slate-500 block">Net of VAT</span>
              <span className="font-mono font-medium text-slate-900 mt-0.5 block">
                {formatAmount(contract.details.netOfVat)} {currency}
              </span>
            </div>
          ) : null}
        </div>

        {contract.details?.remarks ? (
          <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Remarks: </span>
            {contract.details.remarks}
          </div>
        ) : null}
      </section>

      {/* Contract Amendments (if any) */}
      {mergedAmendments.length > 0 ? (
        <section className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-amber-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Contract Amendments
              </h2>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                {mergedAmendments.length}{" "}
                {mergedAmendments.length === 1 ? "Amendment" : "Amendments"}
              </span>
            </div>
            <Link
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs shrink-0"
              href={addAmendmentHref}
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              Add Amendment
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600">
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Variation Type</th>
                  <th className="px-4 py-3 text-right">Variation Amount</th>
                  <th className="px-4 py-3 text-center">Currency</th>
                  <th className="px-4 py-3">Effective Date</th>
                  <th className="px-4 py-3">Approval / Ref No.</th>
                  <th className="px-4 py-3 min-w-[200px]">
                    Justification Reason
                  </th>
                  <th className="px-4 py-3 min-w-[150px]">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mergedAmendments.map((amendment, index) => {
                  const isAddition = amendment.amount > 0;
                  const isReduction = amendment.amount < 0;
                  const absAmount = Math.abs(amendment.amount);
                  const formattedVariation = `${amendment.amount > 0 ? "+" : amendment.amount < 0 ? "-" : ""}${formatAmount(absAmount)}`;

                  let ethDate = amendment.ethiopianDate;
                  if (!ethDate && amendment.effectiveDate) {
                    const eth = gregorianToEthiopian(amendment.effectiveDate);
                    if (eth) ethDate = formatEthiopianDate(eth);
                  }

                  return (
                    <tr
                      key={amendment.id || `amendment-${index}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-4 py-3 text-center font-mono text-slate-400 text-xs">
                        {amendment.id || index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                            isAddition
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : isReduction
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isAddition ? (
                            <>
                              <TrendingUp className="h-3 w-3 text-emerald-600" />
                              Addition
                            </>
                          ) : isReduction ? (
                            <>
                              <TrendingDown className="h-3 w-3 text-amber-600" />
                              Reduction
                            </>
                          ) : (
                            "No Change"
                          )}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${
                          isAddition
                            ? "text-emerald-700"
                            : isReduction
                              ? "text-amber-700"
                              : "text-slate-800"
                        }`}
                      >
                        {formattedVariation}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-600">
                        {currency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {amendment.effectiveDate ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {amendment.effectiveDate}
                              {ethDate ? ` (${ethDate})` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {amendment.approvalRef ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                            {amendment.approvalRef}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {amendment.reason ? (
                          <p className="font-semibold text-slate-900 leading-snug">
                            {amendment.reason}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic">
                            No justification recorded
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {amendment.notes ? (
                          <p className="text-slate-600 leading-snug">
                            {amendment.notes}
                          </p>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800">
                  <td className="px-4 py-3 text-center text-slate-500">Σ</td>
                  <td className="px-4 py-3">
                    Total Net Variation ({mergedAmendments.length})
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono text-sm tabular-nums ${
                      totalVariationAmount > 0
                        ? "text-emerald-800"
                        : totalVariationAmount < 0
                          ? "text-amber-800"
                          : "text-slate-800"
                    }`}
                  >
                    {totalVariationAmount > 0
                      ? "+"
                      : totalVariationAmount < 0
                        ? "-"
                        : ""}
                    {formatAmount(Math.abs(totalVariationAmount))}
                  </td>
                  <td className="px-4 py-3 text-center">{currency}</td>
                  <td className="px-4 py-3" colSpan={4}>
                    <span className="text-xs font-normal text-slate-500">
                      Revised contract value:{" "}
                      <span className="font-semibold text-slate-800">
                        {formatAmount(contract.currentAmount)} {currency}
                      </span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ) : null}

      {/* REGISTERED PAYMENTS SECTION (REQUIRED) */}
      <section className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Registered Payments & Disbursements
              </h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                {payments.length}{" "}
                {payments.length === 1 ? "Payment" : "Payments"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              List of all registered payment transactions, payment types,
              amounts, and dates.
            </p>
          </div>

          <Link
            aria-label={`Add payment to contract ${contract.contractNumber}`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-[#0A3C2F] hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-2xs shrink-0"
            href={addPaymentHref}
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            Add Payment
          </Link>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-600">
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Payment Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Currency</th>
                  <th className="px-4 py-3">Payment Date</th>
                  <th className="px-4 py-3">Reference / Voucher No.</th>
                  <th className="px-4 py-3">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment, index) => {
                  const paymentCurrency =
                    payment.currency || contract.currency || "ETB";
                  return (
                    <tr
                      key={payment.id || `payment-${index}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-4 py-3 text-center font-mono text-slate-400 text-xs">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${paymentTypeBadgeClass(
                            payment.paymentType,
                          )}`}
                        >
                          {payment.paymentType === "Other" &&
                          payment.otherPaymentType
                            ? payment.otherPaymentType
                            : payment.paymentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatAmount(payment.amount)}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-600">
                        {paymentCurrency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {payment.date?.gregorian || "—"}
                            {payment.date?.ethiopian
                              ? ` (${payment.date.ethiopian})`
                              : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {payment.reference ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {payment.reference}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {payment.remarks || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800">
                  <td className="px-4 py-3 text-center text-slate-500">Σ</td>
                  <td className="px-4 py-3">
                    Total Registered ({payments.length})
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-emerald-800 tabular-nums">
                    {formatAmount(totalPaymentsAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">{currency}</td>
                  <td className="px-4 py-3" colSpan={3}>
                    <span className="text-xs font-normal text-slate-500">
                      Remaining contract payable:{" "}
                      <span className="font-semibold text-slate-800">
                        {formatAmount(effectiveRemainingBalance)} {currency}
                      </span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Banknote className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              No payments registered yet
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              No payment transactions have been recorded for this contract.
              Record payment disbursements as they are processed.
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A3C2F] text-white text-xs font-semibold hover:bg-[#072a21] transition-colors shadow-2xs"
              href={addPaymentHref}
            >
              <Plus className="h-3.5 w-3.5" />
              Record First Payment
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
