"use client";

import { DualCalendarField } from "../../projects/components/CreateProcurementPlanView";
import {
  OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY,
  parseSavedActivityRecords,
  type ProcurementActivitySummary,
  type SavedOfficerActivityRecord,
} from "../../projects/data/officerActivityDrafts";
import {
  mergeSavedPlans,
  OFFICER_PLAN_DRAFTS_STORAGE_KEY,
  parseSavedPlanRecords,
  type SavedOfficerPlanRecord,
} from "../../projects/data/officerPlanDrafts";
import {
  officerProjects,
  type OfficerProject,
  type ProcurementPlanSummary,
} from "../../projects/data/officerProjects";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDollarSign,
  ClipboardCheck,
  FileSignature,
  FileText,
  Info,
  LockKeyhole,
  Plus,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  ContractCurrency,
  ContractDateValue,
  ContractStatus,
  OfficerContract,
} from "../data/officerContracts";

interface ActivityContext {
  activity: ProcurementActivitySummary;
  plan: ProcurementPlanSummary;
  project: OfficerProject;
}

interface AmendmentInput {
  amount: string;
  id: number;
}

interface ContractFormState {
  activityKey: string;
  actualCompletionDate: ContractDateValue;
  amendments: AmendmentInput[];
  awardDate: ContractDateValue;
  contractNumber: string;
  currency: ContractCurrency;
  organizationRegion: string;
  originalAmount: string;
  plannedCompletionDate: ContractDateValue;
  remarks: string;
  signatureDate: ContractDateValue;
  startDate: ContractDateValue;
  status: ContractStatus;
  subcomponent: string;
  supplier: string;
  vatRate: string;
}

const emptyDate = (): ContractDateValue => ({ ethiopian: "", gregorian: "" });

const inputClasses =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15";
const textareaClasses =
  "min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15";

const statusOptions: readonly ContractStatus[] = [
  "Planned / Prepared",
  "Signed",
  "Active / Under Implementation",
  "Completed",
  "Partially Terminated",
  "Terminated",
];

export function RegisterContractView({
  existingContracts,
  fromTracker,
  onSave,
}: {
  existingContracts: readonly OfficerContract[];
  fromTracker?: boolean;
  onSave: (contract: OfficerContract) => void;
}) {
  const [savedPlans, setSavedPlans] = useState<SavedOfficerPlanRecord[]>([]);
  const [savedActivities, setSavedActivities] = useState<
    SavedOfficerActivityRecord[]
  >([]);
  const [attempted, setAttempted] = useState(false);
  const [form, setForm] = useState<ContractFormState>(() => ({
    activityKey: "",
    actualCompletionDate: emptyDate(),
    amendments: [],
    awardDate: emptyDate(),
    contractNumber: nextContractNumber(existingContracts),
    currency: "ETB",
    organizationRegion: "",
    originalAmount: "",
    plannedCompletionDate: emptyDate(),
    remarks: "",
    signatureDate: emptyDate(),
    startDate: emptyDate(),
    status: "Signed",
    subcomponent: "",
    supplier: "",
    vatRate: "15",
  }));

  useEffect(() => {
    const loadSavedRecords = window.setTimeout(() => {
      setSavedPlans(
        parseSavedPlanRecords(
          window.localStorage.getItem(OFFICER_PLAN_DRAFTS_STORAGE_KEY),
        ),
      );
      setSavedActivities(
        parseSavedActivityRecords(
          window.localStorage.getItem(OFFICER_ACTIVITY_DRAFTS_STORAGE_KEY),
        ),
      );
    }, 0);

    return () => window.clearTimeout(loadSavedRecords);
  }, []);

  const projects = useMemo(
    () => mergeSavedPlans(officerProjects, savedPlans),
    [savedPlans],
  );
  const eligibleActivities = useMemo(
    () => buildEligibleActivities(projects, savedActivities),
    [projects, savedActivities],
  );
  const selectedContext = eligibleActivities.find(
    (context) => activityKey(context) === form.activityKey,
  );
  const originalAmount = toAmount(form.originalAmount);
  const vatRate = Math.max(0, toAmount(form.vatRate));
  const netOfVat =
    vatRate > 0 ? originalAmount / (1 + vatRate / 100) : originalAmount;
  const vatAmount = Math.max(0, originalAmount - netOfVat);
  const amendmentTotal = form.amendments.reduce(
    (sum, amendment) => sum + toAmount(amendment.amount),
    0,
  );
  const finalAmount = originalAmount + amendmentTotal;
  const numberIsUnique = !existingContracts.some(
    (contract) =>
      contract.contractNumber.trim().toLowerCase() ===
      form.contractNumber.trim().toLowerCase(),
  );
  const contextComplete = Boolean(selectedContext);
  const identificationComplete =
    Boolean(form.contractNumber.trim()) &&
    numberIsUnique &&
    Boolean(form.supplier.trim());
  const financialComplete = originalAmount > 0 && Boolean(form.currency);
  const signatureRequired = form.status !== "Planned / Prepared";
  const actualCompletionRequired = form.status === "Completed";
  const datesComplete =
    Boolean(form.plannedCompletionDate.gregorian) &&
    (!signatureRequired || Boolean(form.signatureDate.gregorian)) &&
    (!actualCompletionRequired || Boolean(form.actualCompletionDate.gregorian));
  const dateOrderValid = validateDateOrder(form);
  const canSave =
    contextComplete &&
    identificationComplete &&
    financialComplete &&
    datesComplete &&
    dateOrderValid;

  function updateField<K extends keyof ContractFormState>(
    field: K,
    value: ContractFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectActivity(key: string) {
    const context = eligibleActivities.find(
      (option) => activityKey(option) === key,
    );

    setForm((current) => ({
      ...current,
      activityKey: key,
      currency: context?.plan.currency ?? current.currency,
      organizationRegion:
        context?.plan.organizationRegion ||
        context?.project.organizationRegion ||
        current.organizationRegion,
      originalAmount: context
        ? String(context.activity.estimatedAmount)
        : current.originalAmount,
      subcomponent:
        context?.activity.details?.form.subcomponent || current.subcomponent,
    }));
  }

  function addAmendment() {
    setForm((current) => ({
      ...current,
      amendments: [
        ...current.amendments,
        {
          amount: "",
          id:
            current.amendments.reduce(
              (highest, amendment) => Math.max(highest, amendment.id),
              0,
            ) + 1,
        },
      ],
    }));
  }

  function saveContract() {
    setAttempted(true);
    if (!canSave || !selectedContext) return;

    onSave({
      completionDate: form.plannedCompletionDate,
      contractNumber: form.contractNumber.trim(),
      currency: form.currency,
      currentAmount: finalAmount,
      details: {
        activityReference: selectedContext.activity.reference,
        actualCompletionDate: form.actualCompletionDate.gregorian
          ? form.actualCompletionDate
          : undefined,
        amendments: form.amendments
          .filter((amendment) => toAmount(amendment.amount) !== 0)
          .map((amendment) => ({
            amount: toAmount(amendment.amount),
            id: amendment.id,
          })),
        amountWithVat: originalAmount,
        awardDate: form.awardDate.gregorian ? form.awardDate : undefined,
        netOfVat,
        organizationRegion: form.organizationRegion.trim() || undefined,
        planReference: selectedContext.plan.reference,
        projectCode: selectedContext.project.code,
        remarks: form.remarks.trim() || undefined,
        startDate: form.startDate.gregorian ? form.startDate : undefined,
        subcomponent: form.subcomponent.trim() || undefined,
        vatRate: vatRate || undefined,
      },
      id: `contract-${Date.now()}`,
      originalAmount,
      procurementActivity: selectedContext.activity.description,
      project: selectedContext.project.shortName,
      remainingBalance: finalAmount,
      signingDate: form.signatureDate,
      status: form.status,
      supplier: form.supplier.trim(),
      totalPaid: 0,
    });
  }

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
              Register Contract
            </li>
          </ol>
        </nav>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
          Register Contract
        </h1>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Record the signed agreement against an eligible procurement activity.
        </p>
      </header>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <main className="min-w-0 space-y-4">
          <FormSection
            description="Select an awarded or signed activity. Project, plan, category, and method are inherited automatically."
            icon={<FileSignature aria-hidden="true" className="h-4 w-4" />}
            title="Contract & Procurement Activity"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  error={
                    attempted && !selectedContext
                      ? "Select the procurement activity covered by this contract."
                      : undefined
                  }
                  label="Procurement Activity"
                  required
                >
                  <SelectControl
                    onChange={selectActivity}
                    value={form.activityKey}
                  >
                    <option value="">Select an eligible activity</option>
                    {eligibleActivities.map((context) => (
                      <option
                        key={activityKey(context)}
                        value={activityKey(context)}
                      >
                        {context.project.shortName} ·{" "}
                        {context.activity.reference}
                        {" · "}
                        {context.activity.description}
                      </option>
                    ))}
                  </SelectControl>
                </Field>
              </div>

              {selectedContext ? (
                <InheritedContext context={selectedContext} />
              ) : null}

              <Field
                error={
                  attempted && !form.contractNumber.trim()
                    ? "Enter a unique contract number."
                    : attempted && !numberIsUnique
                      ? "This contract number is already registered."
                      : undefined
                }
                hint="Generated for convenience and editable before registration."
                label="Contract Number"
                required
              >
                <input
                  className={inputClasses + " font-mono"}
                  onChange={(event) =>
                    updateField("contractNumber", event.target.value)
                  }
                  value={form.contractNumber}
                />
              </Field>
              <Field
                error={
                  attempted && !form.supplier.trim()
                    ? "Enter the supplier, contractor, or consultant."
                    : undefined
                }
                label="Supplier / Contractor / Consultant"
                required
              >
                <div className="relative">
                  <UserRound
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className={inputClasses + " pl-9"}
                    onChange={(event) =>
                      updateField("supplier", event.target.value)
                    }
                    placeholder="Enter legal entity name"
                    value={form.supplier}
                  />
                </div>
              </Field>
              <Field
                hint="Inherited from the activity or project and editable where permitted."
                label="Organization / Region"
              >
                <div className="relative">
                  <Building2
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className={inputClasses + " pl-9"}
                    onChange={(event) =>
                      updateField("organizationRegion", event.target.value)
                    }
                    placeholder="Optional"
                    value={form.organizationRegion}
                  />
                </div>
              </Field>
              <Field label="Subcomponent">
                {selectedContext?.project.subcomponents?.length ? (
                  <SelectControl
                    onChange={(value) => updateField("subcomponent", value)}
                    value={form.subcomponent}
                  >
                    <option value="">Select subcomponent</option>
                    {selectedContext.project.subcomponents.map(
                      (subcomponent) => (
                        <option key={subcomponent} value={subcomponent}>
                          {subcomponent}
                        </option>
                      ),
                    )}
                  </SelectControl>
                ) : (
                  <input
                    className={inputClasses}
                    onChange={(event) =>
                      updateField("subcomponent", event.target.value)
                    }
                    placeholder="Optional"
                    value={form.subcomponent}
                  />
                )}
              </Field>
            </div>
          </FormSection>
          <FormSection
            description="Capture the signed value and VAT treatment. Calculated values are read-only for a new contract."
            icon={<CircleDollarSign aria-hidden="true" className="h-4 w-4" />}
            title="Financial Details"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                error={
                  attempted && !(originalAmount > 0)
                    ? "Enter an original contract amount greater than zero."
                    : undefined
                }
                label="Original Contract Amount"
                required
              >
                <input
                  className={
                    inputClasses + " text-right font-mono tabular-nums"
                  }
                  min="0"
                  onChange={(event) =>
                    updateField("originalAmount", event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                      event.preventDefault();
                    }
                  }}
                  onWheel={(event) => event.currentTarget.blur()}
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={form.originalAmount}
                />
              </Field>
              <Field label="Currency" required>
                <SelectControl
                  onChange={(value) =>
                    updateField("currency", value as ContractCurrency)
                  }
                  value={form.currency}
                >
                  <option value="ETB">ETB - Ethiopian Birr</option>
                  <option value="USD">USD - United States Dollar</option>
                  <option value="UA">UA - Unit of Account</option>
                </SelectControl>
              </Field>
              <Field hint="Use 0 when VAT does not apply." label="VAT Rate">
                <div className="relative">
                  <input
                    className={
                      inputClasses + " pr-8 text-right font-mono tabular-nums"
                    }
                    min="0"
                    onChange={(event) =>
                      updateField("vatRate", event.target.value)
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
                    step="0.01"
                    type="number"
                    value={form.vatRate}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-500">
                    %
                  </span>
                </div>
              </Field>
            </div>

            <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-4">
              <CalculatedValue
                currency={form.currency}
                label="Net of VAT"
                value={netOfVat}
              />
              <CalculatedValue
                currency={form.currency}
                label="VAT Amount"
                value={vatAmount}
              />
              <CalculatedValue
                currency={form.currency}
                label="Contract Amount with VAT"
                value={originalAmount}
              />
              <CalculatedValue
                currency={form.currency}
                emphasized
                label="Final Contract Amount"
                value={finalAmount}
              />
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    Amendments
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Add approved increases or reductions. The final amount
                    updates automatically.
                  </p>
                </div>
                <button
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#a9cbbd] bg-white px-3 text-[11px] font-bold text-[#07523f] hover:bg-[#f2f8f5]"
                  onClick={addAmendment}
                  type="button"
                >
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                  Add amendment
                </button>
              </div>
              {form.amendments.length ? (
                <div className="mt-3 space-y-2">
                  {form.amendments.map((amendment, index) => (
                    <div className="flex items-center gap-3" key={amendment.id}>
                      <span className="w-24 shrink-0 text-[11px] font-semibold text-slate-600">
                        Amendment {index + 1}
                      </span>
                      <input
                        aria-label={`Amendment ${index + 1} amount`}
                        className={
                          inputClasses +
                          " max-w-xs text-right font-mono tabular-nums"
                        }
                        onChange={(event) =>
                          updateField(
                            "amendments",
                            form.amendments.map((item) =>
                              item.id === amendment.id
                                ? { ...item, amount: event.target.value }
                                : item,
                            ),
                          )
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
                        placeholder="Negative value for a reduction"
                        step="0.01"
                        type="number"
                        value={amendment.amount}
                      />
                      <button
                        aria-label={`Remove amendment ${index + 1}`}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        onClick={() =>
                          updateField(
                            "amendments",
                            form.amendments.filter(
                              (item) => item.id !== amendment.id,
                            ),
                          )
                        }
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-md border border-dashed border-slate-200 px-3 py-3 text-[10px] text-slate-500">
                  No amendments recorded.
                </p>
              )}
            </div>
          </FormSection>
          <FormSection
            description="Select either Gregorian or Ethiopian dates; the paired calendar value stays synchronized."
            icon={<ClipboardCheck aria-hidden="true" className="h-4 w-4" />}
            title="Contract Dates & Status"
          >
            <div className="grid items-start gap-4 md:grid-cols-2">
              <DualCalendarField
                ethiopianValue={form.awardDate.ethiopian}
                gregorianValue={form.awardDate.gregorian}
                id="contract-award-date"
                label="Award Date"
                onChange={(gregorian, ethiopian) =>
                  updateField("awardDate", { ethiopian, gregorian })
                }
                required={false}
              />
              <DualCalendarField
                errorMessage={
                  attempted &&
                  signatureRequired &&
                  !form.signatureDate.gregorian
                    ? "Signature date is required for a signed or active contract."
                    : undefined
                }
                ethiopianValue={form.signatureDate.ethiopian}
                gregorianValue={form.signatureDate.gregorian}
                id="contract-signature-date"
                label="Signature Date"
                onChange={(gregorian, ethiopian) =>
                  updateField("signatureDate", { ethiopian, gregorian })
                }
                required={signatureRequired}
              />
              <DualCalendarField
                errorMessage={
                  attempted && !dateOrderValid && form.startDate.gregorian
                    ? "Start date must follow the award and signature dates."
                    : undefined
                }
                ethiopianValue={form.startDate.ethiopian}
                gregorianValue={form.startDate.gregorian}
                id="contract-start-date"
                label="Start Date"
                onChange={(gregorian, ethiopian) =>
                  updateField("startDate", { ethiopian, gregorian })
                }
                required={false}
              />
              <DualCalendarField
                errorMessage={
                  attempted && !form.plannedCompletionDate.gregorian
                    ? "Enter the planned completion date."
                    : attempted && !dateOrderValid
                      ? "Planned completion must follow the contract start or signature date."
                      : undefined
                }
                ethiopianValue={form.plannedCompletionDate.ethiopian}
                gregorianValue={form.plannedCompletionDate.gregorian}
                id="contract-completion-date"
                label="Planned Completion / End Date"
                onChange={(gregorian, ethiopian) =>
                  updateField("plannedCompletionDate", {
                    ethiopian,
                    gregorian,
                  })
                }
              />
              <DualCalendarField
                errorMessage={
                  attempted &&
                  actualCompletionRequired &&
                  !form.actualCompletionDate.gregorian
                    ? "Actual completion date is required when status is Completed."
                    : attempted &&
                        !dateOrderValid &&
                        form.actualCompletionDate.gregorian
                      ? "Actual completion must not be before the contract start date."
                      : undefined
                }
                ethiopianValue={form.actualCompletionDate.ethiopian}
                gregorianValue={form.actualCompletionDate.gregorian}
                id="contract-actual-completion-date"
                label="Actual Completion Date"
                onChange={(gregorian, ethiopian) =>
                  updateField("actualCompletionDate", {
                    ethiopian,
                    gregorian,
                  })
                }
                required={actualCompletionRequired}
              />
              <Field label="Contract Status" required>
                <SelectControl
                  onChange={(value) =>
                    updateField("status", value as ContractStatus)
                  }
                  value={form.status}
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectControl>
              </Field>
            </div>
          </FormSection>

          <FormSection
            icon={<FileText aria-hidden="true" className="h-4 w-4" />}
            title="Remarks"
          >
            <Field label="Contract Remarks">
              <textarea
                className={textareaClasses}
                onChange={(event) => updateField("remarks", event.target.value)}
                placeholder="Optional notes, conditions, or migration remarks"
                value={form.remarks}
              />
            </Field>
          </FormSection>
        </main>
        <aside className="sticky top-4 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-[#edf5f1] px-3 py-3 text-xs font-extrabold text-slate-900">
            <ClipboardCheck
              aria-hidden="true"
              className="h-4 w-4 text-[#176c55]"
            />
            Check Entries
          </div>
          <div className="space-y-3 p-3">
            <ChecklistItem
              complete={contextComplete}
              label="Eligible activity selected"
            />
            <ChecklistItem
              complete={identificationComplete}
              label="Contract identification"
            />
            <ChecklistItem
              complete={financialComplete}
              label="Financial terms"
            />
            <ChecklistItem
              complete={datesComplete && dateOrderValid}
              label="Required dates"
            />
          </div>
          <div className="border-t border-slate-200 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
              Final Contract Amount
            </p>
            <p className="mt-1 font-mono text-base font-bold tabular-nums text-slate-900">
              {formatAmount(finalAmount)}{" "}
              <span className="text-xs text-slate-500">{form.currency}</span>
            </p>
          </div>
          <div className="border-t border-slate-200 p-3">
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
              ) : attempted ? (
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                />
              ) : (
                <Info
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                />
              )}
              {canSave
                ? "Ready to register."
                : attempted
                  ? "Correct the highlighted entries before registering."
                  : "Complete the required contract details."}
            </div>
          </div>
        </aside>
      </div>
      <footer className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-5px_18px_rgba(15,23,42,0.06)] backdrop-blur md:left-[17rem]">
        <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-3">
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            href={
              fromTracker
                ? selectedContext
                  ? `/workspace/activity-tracker?project=${encodeURIComponent(
                      selectedContext.project.code,
                    )}&plan=${encodeURIComponent(
                      selectedContext.plan.reference,
                    )}&activity=${encodeURIComponent(
                      selectedContext.activity.reference,
                    )}`
                  : "/workspace/activity-tracker"
                : "/workspace/contracts"
            }
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            {fromTracker ? "Back to Tracker" : "Back"}
          </Link>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#125442] bg-[#176c55] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#125442] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
            onClick={saveContract}
            type="button"
          >
            <Save aria-hidden="true" className="h-3.5 w-3.5" />
            Register Contract
          </button>
        </div>
      </footer>
    </div>
  );
}

function FormSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="overflow-visible rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-[#f8faf9] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <span className="text-[#176c55]">{icon}</span>
          <h2>{title}</h2>
        </div>
        {description ? (
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  children,
  error,
  hint,
  label,
  required = false,
}: {
  children: ReactNode;
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0 text-[11px] font-medium text-slate-600">
      <span className={error ? "text-red-600" : undefined}>
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <span className="mt-2 block">{children}</span>
      {error ? (
        <span className="mt-1.5 flex items-start gap-1 text-[10px] leading-4 text-red-600">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[9px] leading-4 text-slate-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function SelectControl({
  children,
  onChange,
  value,
}: {
  children: ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      className={inputClasses + " cursor-pointer pr-9"}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </select>
  );
}

function InheritedContext({ context }: { context: ActivityContext }) {
  const entries = [
    ["Project", `${context.project.shortName} · ${context.project.code}`],
    ["Procurement Plan", `${context.plan.name} · ${context.plan.reference}`],
    ["Category", context.activity.category],
    ["Procurement Method", context.activity.method],
    ["Responsible Officer", context.project.assignedOfficers.join(", ")],
    ["Funding Source", context.project.fundingSource],
  ];

  return (
    <div className="rounded-md border border-[#c9d8ec] bg-[#f0f3ff] p-3 sm:col-span-2">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#07523f]">
        <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
        Inherited Procurement Context
      </div>
      <dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([label, value]) => (
          <div className="min-w-0" key={label}>
            <dt className="text-[9px] uppercase tracking-wide text-slate-500">
              {label}
            </dt>
            <dd
              className="mt-1 truncate text-[11px] font-semibold text-slate-800"
              title={value}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
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
    <div className="flex items-center gap-2 text-[10px] text-slate-700">
      {complete ? (
        <CheckCircle2
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-[#176c55]"
        />
      ) : (
        <Circle
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-slate-400"
        />
      )}
      <span className={complete ? "font-semibold" : undefined}>{label}</span>
    </div>
  );
}

function CalculatedValue({
  currency,
  emphasized = false,
  label,
  value,
}: {
  currency: ContractCurrency;
  emphasized?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div className={emphasized ? "bg-[#edf5f1] p-3" : "bg-slate-50 p-3"}>
      <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-xs font-bold tabular-nums ${
          emphasized ? "text-[#07523f]" : "text-slate-800"
        }`}
      >
        {formatAmount(value)}{" "}
        <span className="text-[9px] text-slate-500">{currency}</span>
      </p>
    </div>
  );
}

export function buildEligibleActivities(
  projects: readonly OfficerProject[],
  savedActivities: readonly SavedOfficerActivityRecord[],
) {
  return projects.flatMap((project) =>
    project.plans
      .filter((plan) => plan.status === "Approved")
      .flatMap((plan) => {
        const savedForPlan = savedActivities
          .filter(
            (record) =>
              record.projectCode === project.code &&
              record.planReference === plan.reference,
          )
          .map((record) => record.activity);

        return savedForPlan
          .filter(isContractReadyActivity)
          .map((activity) => ({ activity, plan, project }));
      }),
  );
}

function isContractReadyActivity(activity: ProcurementActivitySummary) {
  const stage = activity.currentStage.toLowerCase();
  return (
    activity.status === "Completed" ||
    stage.includes("contract") ||
    stage.includes("site handover") ||
    stage.includes("final report")
  );
}

function activityKey(context: ActivityContext) {
  return `${context.project.code}::${context.plan.reference}::${context.activity.reference}`;
}

function nextContractNumber(contracts: readonly OfficerContract[]) {
  const currentYear = new Date().getFullYear();
  const highest = contracts.reduce((maximum, contract) => {
    const match = contract.contractNumber.match(
      new RegExp(`^MOA-CON-${currentYear}-(\\d+)$`, "i"),
    );
    return match ? Math.max(maximum, Number(match[1])) : maximum;
  }, 0);
  return `MOA-CON-${currentYear}-${String(highest + 1).padStart(3, "0")}`;
}

function validateDateOrder(form: ContractFormState) {
  const award = form.awardDate.gregorian;
  const signature = form.signatureDate.gregorian;
  const start = form.startDate.gregorian;
  const plannedCompletion = form.plannedCompletionDate.gregorian;
  const actualCompletion = form.actualCompletionDate.gregorian;

  if (award && signature && signature < award) return false;
  if (signature && start && start < signature) return false;
  if (award && start && start < award) return false;
  const effectiveStart = start || signature || award;
  if (
    effectiveStart &&
    plannedCompletion &&
    plannedCompletion < effectiveStart
  ) {
    return false;
  }
  if (effectiveStart && actualCompletion && actualCompletion < effectiveStart) {
    return false;
  }
  return true;
}

function toAmount(value: string) {
  const amount = Number(value.replaceAll(",", ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}
