"use client";

import { DualCalendarField } from "../../projects/components/CreateProcurementPlanView";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileEdit,
  History,
  Loader2,
  Minus,
  Plus,
  Save,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type {
  ContractDateValue,
  OfficerContract,
} from "../data/officerContracts";
import {
  fetchContractAmendments,
  type BackendContractAmendment,
} from "@/lib/contractsApi";

interface AmendmentFormState {
  variationType: "ADDITION" | "REDUCTION";
  amount: string;
  date: ContractDateValue;
  approvalRef: string;
  reason: string;
  notes: string;
}

const inputClasses =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15";
const textareaClasses =
  "min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15";

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function AddContractAmendmentView({
  contract,
  fromTracker,
  onSave,
}: {
  contract: OfficerContract;
  fromTracker?: boolean;
  onSave: (amendmentData: {
    variationAmount: number;
    reason: string;
    effectiveDate?: string;
    approvalRef?: string;
    notes?: string;
    newTotalAmount: number;
    newRemainingBalance: number;
  }) => Promise<void> | void;
}) {
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<BackendContractAmendment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [form, setForm] = useState<AmendmentFormState>({
    variationType: "ADDITION",
    amount: "",
    date: { ethiopian: "", gregorian: "" },
    approvalRef: "",
    reason: "",
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      if (!contract.id) return;
      setIsLoadingHistory(true);
      try {
        const amendments = await fetchContractAmendments(contract.id);
        if (isMounted) {
          setHistory(amendments);
        }
      } catch (err) {
        console.warn("Failed to load amendment history:", err);
      } finally {
        if (isMounted) setIsLoadingHistory(false);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [contract.id]);

  const contractCurrentAmount = Number(contract.currentAmount) || 0;
  const contractOriginalAmount =
    Number(contract.originalAmount) || contractCurrentAmount;
  const contractTotalPaid = Number(contract.totalPaid) || 0;
  const contractRemainingBalance =
    contract.remainingBalance !== null &&
    contract.remainingBalance !== undefined
      ? Number(contract.remainingBalance)
      : Math.max(0, contractCurrentAmount - contractTotalPaid);

  const amountEntered = form.amount.trim().length > 0;
  const parsedAmount = Number(form.amount.replaceAll(",", ""));
  const amountValid =
    amountEntered && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const variationMagnitude = amountValid ? parsedAmount : 0;
  const signedVariation =
    form.variationType === "REDUCTION"
      ? -variationMagnitude
      : variationMagnitude;

  const newTotalAmount = contractCurrentAmount + signedVariation;
  const newRemainingBalance = newTotalAmount - contractTotalPaid;

  // Business logic validations
  const validReduction =
    form.variationType === "ADDITION" || newTotalAmount >= contractTotalPaid;
  const dateComplete = Boolean(form.date.gregorian);
  const reasonComplete = form.reason.trim().length >= 3;

  const canSave =
    amountValid &&
    validReduction &&
    dateComplete &&
    reasonComplete &&
    !isSubmitting;

  function updateField<K extends keyof AmendmentFormState>(
    field: K,
    value: AmendmentFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    setAttempted(true);
    if (!canSave) return;

    setIsSubmitting(true);
    try {
      await onSave({
        variationAmount: signedVariation,
        reason: form.reason.trim(),
        effectiveDate: form.date.gregorian || undefined,
        approvalRef: form.approvalRef.trim() || undefined,
        notes: form.notes.trim() || undefined,
        newTotalAmount,
        newRemainingBalance,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextAmendmentNo =
    history.length > 0
      ? Math.max(...history.map((h) => h.amendmentNo)) + 1
      : (contract.details?.amendments?.length || 0) + 1;

  return (
    <div className="min-w-0 space-y-5 pb-20">
      <header>
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link className="hover:text-[#176c55]" href="/dashboard/officer">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                className="hover:text-[#176c55]"
                href={
                  fromTracker
                    ? "/workspace/activity-tracker"
                    : "/workspace/contracts"
                }
              >
                {fromTracker ? "Activity Tracker" : "Contracts"}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-semibold text-slate-800">
              Contract Amendment #{nextAmendmentNo}
            </li>
          </ol>
        </nav>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Contract Amendment / Variation
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Record an approved cost addition (+) or reduction (-) for contract{" "}
              <span className="font-mono font-bold text-slate-700">
                {contract.contractNumber}
              </span>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-[#edf5f1] px-2.5 py-1 text-xs font-bold text-[#176c55] border border-[#a9cbbd]">
              Amendment #{nextAmendmentNo}
            </span>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <main className="min-w-0 space-y-4">
          {/* Baseline Contract Overview */}
          <section className="overflow-visible rounded-md border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-[#f8faf9] px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <FileEdit
                    aria-hidden="true"
                    className="h-4 w-4 text-[#176c55]"
                  />
                  <h2>Contract Baseline & Context</h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  Status:{" "}
                  <strong className="text-slate-800">{contract.status}</strong>
                </span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded border border-slate-200 bg-slate-50/60 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Contract Number
                  </span>
                  <p className="mt-0.5 font-mono text-xs font-bold text-slate-900 truncate">
                    {contract.contractNumber}
                  </p>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50/60 p-2.5 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Procurement Activity
                  </span>
                  <p
                    className="mt-0.5 text-xs font-medium text-slate-800 truncate"
                    title={contract.procurementActivity}
                  >
                    {contract.procurementActivity}
                  </p>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50/60 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Supplier / Contractor
                  </span>
                  <p
                    className="mt-0.5 text-xs font-semibold text-slate-800 truncate"
                    title={contract.supplier}
                  >
                    {contract.supplier}
                  </p>
                </div>
              </div>

              {/* Baseline Financial Indicators */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Current Financial Baseline
                </p>
                <div className="grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-4">
                  <BaselineCard
                    currency={contract.currency}
                    label="Original Amount"
                    value={contractOriginalAmount}
                  />
                  <BaselineCard
                    currency={contract.currency}
                    label="Current Total Amount"
                    value={contractCurrentAmount}
                  />
                  <BaselineCard
                    currency={contract.currency}
                    label="Total Paid To Date"
                    value={contractTotalPaid}
                  />
                  <BaselineCard
                    currency={contract.currency}
                    emphasized
                    label="Current Balance"
                    value={contractRemainingBalance}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Amendment History Section */}
          {(history.length > 0 ||
            (contract.details?.amendments &&
              contract.details.amendments.length > 0)) && (
            <section className="overflow-visible rounded-md border border-slate-300 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-[#f8faf9] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                  <History
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-slate-600"
                  />
                  <h3>
                    Previous Amendments History (
                    {history.length ||
                      contract.details?.amendments?.length ||
                      0}
                    )
                  </h3>
                </div>
                {isLoadingHistory && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {history.length > 0
                  ? history.map((amend) => (
                      <div
                        key={amend.id}
                        className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              Amendment #{amend.amendmentNo}
                            </span>
                            {amend.variationAmount >= 0 ? (
                              <span className="inline-flex items-center gap-0.5 rounded bg-[#edf5f1] px-1.5 py-0.5 text-[10px] font-semibold text-[#176c55] border border-[#a9cbbd]">
                                <TrendingUp className="h-2.5 w-2.5" /> +
                                {formatAmount(amend.variationAmount)}{" "}
                                {contract.currency}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                                <TrendingDown className="h-2.5 w-2.5" />{" "}
                                {formatAmount(amend.variationAmount)}{" "}
                                {contract.currency}
                              </span>
                            )}
                            {amend.approvalRef && (
                              <span className="text-[10px] font-mono text-slate-400">
                                Ref: {amend.approvalRef}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            {amend.reason}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-slate-800 font-semibold text-xs">
                            New Value: {formatAmount(amend.newValue)}{" "}
                            {contract.currency}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {amend.effectiveDate
                              ? new Date(
                                  amend.effectiveDate,
                                ).toLocaleDateString("en-GB")
                              : new Date(amend.createdAt).toLocaleDateString(
                                  "en-GB",
                                )}
                            {amend.amendedBy?.fullName
                              ? ` • by ${amend.amendedBy.fullName}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    ))
                  : (contract.details?.amendments || []).map((amend) => (
                      <div
                        key={amend.id}
                        className="p-3 text-xs flex items-center justify-between gap-2 hover:bg-slate-50"
                      >
                        <span className="font-bold text-slate-800">
                          Amendment #{amend.id}
                        </span>
                        <span className="font-mono font-semibold text-slate-700">
                          Variation: {amend.amount >= 0 ? "+" : ""}
                          {formatAmount(amend.amount)} {contract.currency}
                        </span>
                      </div>
                    ))}
              </div>
            </section>
          )}

          {/* Amendment Form */}
          <section className="overflow-visible rounded-md border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-[#f8faf9] px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <FileEdit
                  aria-hidden="true"
                  className="h-4 w-4 text-[#176c55]"
                />
                <h2>Amendment Details</h2>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Specify whether this amendment increases or decreases the
                contract price, along with justification and approval
                references.
              </p>
            </div>
            <div className="p-4 space-y-5">
              {/* Variation Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Variation Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => updateField("variationType", "ADDITION")}
                    className={`flex items-center justify-center gap-2 rounded-md border p-3 text-xs font-bold transition cursor-pointer ${
                      form.variationType === "ADDITION"
                        ? "border-[#176c55] bg-[#edf5f1] text-[#07523f] ring-1 ring-[#176c55]/20 shadow-xs"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <Plus
                      className={`h-4 w-4 ${
                        form.variationType === "ADDITION"
                          ? "text-[#176c55]"
                          : "text-slate-500"
                      }`}
                    />
                    <span>Cost Addition (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("variationType", "REDUCTION")}
                    className={`flex items-center justify-center gap-2 rounded-md border p-3 text-xs font-bold transition cursor-pointer ${
                      form.variationType === "REDUCTION"
                        ? "border-[#176c55] bg-[#edf5f1] text-[#07523f] ring-1 ring-[#176c55]/20 shadow-xs"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <Minus
                      className={`h-4 w-4 ${
                        form.variationType === "REDUCTION"
                          ? "text-[#176c55]"
                          : "text-slate-500"
                      }`}
                    />
                    <span>Cost Reduction (-)</span>
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {form.variationType === "ADDITION"
                    ? "Addition: Expands the contract scope or rates, increasing the total contract value."
                    : "Reduction: Decreases total value due to de-scoped items or price adjustments. Cannot reduce below amount already paid."}
                </p>
              </div>

              <div className="grid items-start gap-4 md:grid-cols-2">
                {/* Variation Amount */}
                <Field
                  error={
                    attempted && !amountValid
                      ? "Enter a positive variation amount."
                      : attempted && !validReduction
                        ? `Cannot reduce below total paid amount (${formatAmount(contractTotalPaid)} ${contract.currency}).`
                        : undefined
                  }
                  hint={
                    form.variationType === "ADDITION"
                      ? "Will be added to the current contract total."
                      : `Max reduction: ${formatAmount(contractRemainingBalance)} ${contract.currency} (remaining balance).`
                  }
                  label={
                    form.variationType === "ADDITION"
                      ? "Additional Amount (+)"
                      : "Reduction Amount (-)"
                  }
                  required
                >
                  <div className="relative">
                    <input
                      className={
                        inputClasses +
                        " pr-14 text-right font-mono tabular-nums font-semibold text-slate-800"
                      }
                      min="0"
                      onChange={(event) =>
                        updateField("amount", event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "ArrowUp" ||
                          event.key === "ArrowDown"
                        ) {
                          event.preventDefault();
                        }
                      }}
                      onWheel={(event) => event.currentTarget.blur()}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={form.amount}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-semibold text-slate-500">
                      {contract.currency}
                    </span>
                  </div>
                </Field>

                {/* Approval Reference */}
                <Field
                  hint="e.g. Variation Order #2, MoA/Proc/Minute/2026-05"
                  label="Approval / Order Reference"
                >
                  <input
                    className={inputClasses}
                    onChange={(event) =>
                      updateField("approvalRef", event.target.value)
                    }
                    placeholder="Reference number or minute ref"
                    value={form.approvalRef}
                  />
                </Field>

                {/* Effective Date */}
                <div className="md:col-span-2">
                  <DualCalendarField
                    errorMessage={
                      attempted && !dateComplete
                        ? "Select the amendment effective date."
                        : undefined
                    }
                    ethiopianValue={form.date.ethiopian}
                    gregorianValue={form.date.gregorian}
                    id="contract-amendment-date"
                    label="Effective Date"
                    onChange={(gregorian, ethiopian) =>
                      updateField("date", { ethiopian, gregorian })
                    }
                  />
                </div>

                {/* Reason for Amendment */}
                <div className="md:col-span-2">
                  <Field
                    error={
                      attempted && !reasonComplete
                        ? "Please enter a detailed reason or justification for this variation."
                        : undefined
                    }
                    hint="Explain why the contract amount was changed (e.g. bill of quantities alteration, scope extension, contingency utilization)."
                    label="Reason / Justification for Amendment"
                    required
                  >
                    <textarea
                      className={textareaClasses}
                      onChange={(event) =>
                        updateField("reason", event.target.value)
                      }
                      placeholder="Describe the approved justification for this price adjustment..."
                      value={form.reason}
                    />
                  </Field>
                </div>

                {/* Additional Notes */}
                <div className="md:col-span-2">
                  <Field
                    hint="Optional notes on revised delivery timeline, committee approval details, etc."
                    label="Additional Notes / Scope Details"
                  >
                    <textarea
                      className={textareaClasses}
                      onChange={(event) =>
                        updateField("notes", event.target.value)
                      }
                      placeholder="Optional notes"
                      value={form.notes}
                    />
                  </Field>
                </div>
              </div>

              {/* Calculated Impact Preview */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-xs font-bold text-slate-800">
                  Calculated Amendment Impact
                </h3>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Shows how this variation updates the total contract value and
                  remaining balance.
                </p>
                <div className="mt-3 grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-4">
                  <SummaryValue
                    currency={contract.currency}
                    label="Current Contract Amount"
                    value={contractCurrentAmount}
                  />
                  <SummaryValue
                    currency={contract.currency}
                    label={
                      form.variationType === "ADDITION"
                        ? "Variation Addition (+)"
                        : "Variation Reduction (-)"
                    }
                    value={signedVariation}
                    highlightType={form.variationType}
                  />
                  <SummaryValue
                    currency={contract.currency}
                    emphasized
                    label="New Contract Value"
                    value={newTotalAmount}
                  />
                  <SummaryValue
                    currency={contract.currency}
                    emphasized
                    error={!validReduction && attempted}
                    label="New Remaining Balance"
                    value={newRemainingBalance}
                  />
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Sidebar Verification & Save */}
        <aside className="sticky top-4 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm space-y-0">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-[#edf5f1] px-3 py-3 text-xs font-extrabold text-slate-900">
            <ClipboardCheck
              aria-hidden="true"
              className="h-4 w-4 text-[#176c55]"
            />
            Amendment Checklist
          </div>
          <div className="space-y-3 p-3">
            <ChecklistItem
              complete={amountValid}
              label={
                form.variationType === "ADDITION"
                  ? "Addition amount entered"
                  : "Reduction amount entered"
              }
            />
            <ChecklistItem
              complete={validReduction}
              label="Remaining balance >= 0"
            />
            <ChecklistItem
              complete={dateComplete}
              label="Effective date selected"
            />
            <ChecklistItem complete={reasonComplete} label="Reason provided" />
          </div>

          <div className="border-t border-slate-200 p-3 bg-slate-50/50">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
              New Total Contract Value
            </p>
            <p className="mt-1 font-mono text-base font-bold tabular-nums text-slate-900">
              {formatAmount(newTotalAmount)}{" "}
              <span className="text-xs font-normal text-slate-500">
                {contract.currency}
              </span>
            </p>
            <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 text-[11px]">New Balance:</span>
              <span
                className={`font-mono font-bold ${newRemainingBalance < 0 ? "text-red-600" : "text-slate-800"}`}
              >
                {formatAmount(newRemainingBalance)} {contract.currency}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 p-3 space-y-3">
            <div
              className={`flex items-start gap-2 rounded px-2.5 py-2 text-[10px] leading-4 ${
                canSave
                  ? "bg-[#e5f3ee] text-[#07523f]"
                  : attempted
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-50 text-slate-600"
              }`}
            >
              {canSave ? (
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                />
              ) : (
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                />
              )}
              <span>
                {canSave
                  ? "Ready to apply amendment to contract."
                  : attempted && !validReduction
                    ? "Reduction amount exceeds remaining balance."
                    : "Complete required fields marked with *"}
              </span>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#125442] bg-[#176c55] px-4 text-xs font-bold text-white shadow-sm hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55] transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Applying Amendment...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Apply Amendment #{nextAmendmentNo}</span>
                </>
              )}
            </button>

            <Link
              href={
                fromTracker
                  ? "/workspace/activity-tracker"
                  : "/workspace/contracts"
              }
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BaselineCard({
  currency,
  emphasized,
  label,
  value,
}: {
  currency: string;
  emphasized?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div className={`p-3 ${emphasized ? "bg-[#f2f8f5]" : "bg-white"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-sm font-bold tabular-nums ${
          emphasized ? "text-[#176c55]" : "text-slate-900"
        }`}
      >
        {formatAmount(value)}{" "}
        <span className="text-[10px] font-normal text-slate-500">
          {currency}
        </span>
      </p>
    </div>
  );
}

function SummaryValue({
  currency,
  emphasized,
  error,
  label,
  value,
}: {
  currency: string;
  emphasized?: boolean;
  error?: boolean;
  highlightType?: "ADDITION" | "REDUCTION";
  label: string;
  value: number;
}) {
  return (
    <div
      className={`p-3 ${
        error ? "bg-red-50" : emphasized ? "bg-[#edf5f1]" : "bg-white"
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wider ${
          error ? "text-red-700" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-xs font-bold tabular-nums ${
          error
            ? "text-red-700"
            : emphasized
              ? "text-[#125442] text-sm"
              : "text-slate-900"
        }`}
      >
        {value >= 0 ? "" : "-"}
        {formatAmount(Math.abs(value))}{" "}
        <span className="text-[10px] font-normal text-slate-500">
          {currency}
        </span>
      </p>
    </div>
  );
}

function ChecklistItem({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {complete ? (
        <CheckCircle2
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-[#176c55]"
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-3.5 w-3.5 rounded-full border border-slate-300"
        />
      )}
      <span
        className={complete ? "font-semibold text-slate-800" : "text-slate-500"}
      >
        {label}
      </span>
    </div>
  );
}

function Field({
  children,
  error,
  hint,
  label,
  required,
}: {
  children: ReactNode;
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-bold text-slate-800">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="block text-[10px] text-slate-500">{hint}</span>
      )}
      {error && (
        <span className="block text-[11px] font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
