"use client";

import { DualCalendarField } from "../../projects/components/CreateProcurementPlanView";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Circle,
  CircleAlert,
  ClipboardCheck,
  Info,
  LockKeyhole,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import type {
  ContractDateValue,
  OfficerContract,
} from "../data/officerContracts";
import type {
  ContractPaymentType,
  OfficerContractPayment,
} from "../data/officerPayments";

interface PaymentFormState {
  amount: string;
  date: ContractDateValue;
  paymentType: ContractPaymentType | "";
  reference: string;
  remarks: string;
}

const paymentTypes: readonly ContractPaymentType[] = [
  "Advance",
  "1st / Interim",
  "2nd / Interim",
  "Final",
  "Retention Payment",
  "Retention Withholding",
  "Other",
];

const inputClasses =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15";
const textareaClasses =
  "min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#176c55] focus:ring-2 focus:ring-[#176c55]/15";

export function AddContractPaymentView({
  contract,
  fromTracker,
  onSave,
}: {
  contract: OfficerContract;
  fromTracker?: boolean;
  onSave: (payment: OfficerContractPayment) => void;
}) {
  const [attempted, setAttempted] = useState(false);
  const [form, setForm] = useState<PaymentFormState>({
    amount: "",
    date: { ethiopian: "", gregorian: "" },
    paymentType: "",
    reference: "",
    remarks: "",
  });
  const contractTotalPaid = Number(contract.totalPaid) || 0;
  const contractCurrentAmount = Number(contract.currentAmount) || 0;
  const contractRemainingBalance =
    contract.remainingBalance !== null &&
    contract.remainingBalance !== undefined
      ? Number(contract.remainingBalance)
      : Math.max(0, contractCurrentAmount - contractTotalPaid);

  const amountEntered = form.amount.trim().length > 0;
  const parsedAmount = Number(form.amount.replaceAll(",", ""));
  const amountValid =
    amountEntered && Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const amount = amountValid ? parsedAmount : 0;
  const withinContractBalance = amount <= contractRemainingBalance;
  const typeComplete = Boolean(form.paymentType);
  const dateComplete = Boolean(form.date.gregorian);
  const canSave =
    typeComplete && amountValid && withinContractBalance && dateComplete;
  const updatedTotalPaid = contractTotalPaid + (amountValid ? amount : 0);
  const updatedBalance = Math.max(0, contractCurrentAmount - updatedTotalPaid);

  function updateField<K extends keyof PaymentFormState>(
    field: K,
    value: PaymentFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function savePayment() {
    setAttempted(true);
    if (!canSave || !form.paymentType) return;

    onSave({
      amount,
      contractNumber: contract.contractNumber,
      date: form.date,
      id: `payment-${Date.now()}`,
      paymentType: form.paymentType,
      reference: form.reference.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
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
              Add Payment
            </li>
          </ol>
        </nav>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
          Add Payment
        </h1>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Record a payment transaction against {contract.contractNumber}.
        </p>
      </header>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <main className="min-w-0 space-y-4">
          <section className="overflow-visible rounded-md border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-[#f8faf9] px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Banknote
                  aria-hidden="true"
                  className="h-4 w-4 text-[#176c55]"
                />
                <h2>Payment Details</h2>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                The contract context is inherited. Enter only this payment
                transaction details.
              </p>
            </div>
            <div className="p-4">
              <ContractContext contract={contract} />

              <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
                <Field
                  error={
                    attempted && !typeComplete
                      ? "Select the payment type."
                      : undefined
                  }
                  label="Payment Type"
                  required
                >
                  <select
                    className={inputClasses + " cursor-pointer pr-9"}
                    onChange={(event) =>
                      updateField(
                        "paymentType",
                        event.target.value as ContractPaymentType | "",
                      )
                    }
                    value={form.paymentType}
                  >
                    <option value="">Select payment type</option>
                    {paymentTypes.map((paymentType) => (
                      <option key={paymentType} value={paymentType}>
                        {paymentType}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  error={
                    attempted && !amountValid
                      ? "Enter a zero or positive payment amount."
                      : attempted && !withinContractBalance
                        ? "Payment cannot exceed the remaining contract balance."
                        : undefined
                  }
                  hint={`Available balance: ${formatAmount(contractRemainingBalance)} ${contract.currency}`}
                  label="Amount"
                  required
                >
                  <div className="relative">
                    <input
                      className={
                        inputClasses +
                        " pr-14 text-right font-mono tabular-nums"
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

                <div className="md:col-span-2">
                  <DualCalendarField
                    errorMessage={
                      attempted && !dateComplete
                        ? "Select the payment date."
                        : undefined
                    }
                    ethiopianValue={form.date.ethiopian}
                    gregorianValue={form.date.gregorian}
                    id="contract-payment-date"
                    label="Payment Date"
                    onChange={(gregorian, ethiopian) =>
                      updateField("date", { ethiopian, gregorian })
                    }
                  />
                </div>

                <Field
                  hint="Voucher, payment certificate, or bank reference where available."
                  label="Payment Reference / Voucher No."
                >
                  <input
                    className={inputClasses}
                    onChange={(event) =>
                      updateField("reference", event.target.value)
                    }
                    placeholder="Optional reference"
                    value={form.reference}
                  />
                </Field>

                <Field label="Remarks">
                  <textarea
                    className={textareaClasses}
                    onChange={(event) =>
                      updateField("remarks", event.target.value)
                    }
                    placeholder="Optional payment-specific note"
                    value={form.remarks}
                  />
                </Field>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <h3 className="text-xs font-bold text-slate-800">
                  Calculated Contract Balance
                </h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  Total Paid and Remaining Balance are calculated from payment
                  transactions and cannot be entered manually.
                </p>
                <div className="mt-3 grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-4">
                  <SummaryValue
                    currency={contract.currency}
                    label="Current Total Paid"
                    value={contractTotalPaid}
                  />
                  <SummaryValue
                    currency={contract.currency}
                    label="This Payment"
                    value={amountValid ? amount : 0}
                  />
                  <SummaryValue
                    currency={contract.currency}
                    label="Updated Total Paid"
                    value={updatedTotalPaid}
                  />
                  <SummaryValue
                    currency={contract.currency}
                    emphasized
                    label="Remaining Balance"
                    value={updatedBalance}
                  />
                </div>
              </div>
            </div>
          </section>
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
            <ChecklistItem complete={typeComplete} label="Payment type" />
            <ChecklistItem complete={amountValid} label="Payment amount" />
            <ChecklistItem
              complete={amountValid && withinContractBalance}
              label="Within contract balance"
            />
            <ChecklistItem complete={dateComplete} label="Payment date" />
          </div>
          <div className="border-t border-slate-200 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
              Remaining After Payment
            </p>
            <p className="mt-1 font-mono text-base font-bold tabular-nums text-slate-900">
              {formatAmount(updatedBalance)}{" "}
              <span className="text-xs text-slate-500">
                {contract.currency}
              </span>
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
                ? "Ready to save payment."
                : attempted
                  ? "Correct the highlighted entries before saving."
                  : "Complete the required payment details."}
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
                ? `/workspace/contracts?contract=${encodeURIComponent(
                    contract.contractNumber,
                  )}&from=tracker`
                : "/workspace/contracts"
            }
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            {fromTracker ? "Back to Tracker" : "Back"}
          </Link>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#125442] bg-[#176c55] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#125442] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c55]"
            onClick={savePayment}
            type="button"
          >
            <Save aria-hidden="true" className="h-3.5 w-3.5" />
            Save Payment
          </button>
        </div>
      </footer>
    </div>
  );
}

function ContractContext({ contract }: { contract: OfficerContract }) {
  const entries = [
    ["Contract Number", contract.contractNumber],
    ["Project", contract.project],
    ["Procurement Activity", contract.procurementActivity],
    ["Supplier / Contractor", contract.supplier],
    [
      "Final Contract Amount",
      `${formatAmount(contract.currentAmount)} ${contract.currency}`,
    ],
    [
      "Remaining Balance",
      `${formatAmount(contract.remainingBalance)} ${contract.currency}`,
    ],
  ];

  return (
    <div className="rounded-md border border-[#c9d8ec] bg-[#f0f3ff] p-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#07523f]">
        <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
        Inherited Contract Context
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

function SummaryValue({
  currency,
  emphasized = false,
  label,
  value,
}: {
  currency: OfficerContract["currency"];
  emphasized?: boolean;
  label: string;
  value: number | string;
}) {
  return (
    <div
      className={
        emphasized
          ? "min-w-0 overflow-hidden bg-[#edf5f1] p-3"
          : "min-w-0 overflow-hidden bg-slate-50 p-3"
      }
    >
      <p className="truncate text-[9px] font-bold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 truncate font-mono text-xs font-bold tabular-nums ${
          emphasized ? "text-[#07523f]" : "text-slate-800"
        }`}
        title={`${formatAmount(value)} ${currency}`}
      >
        {formatAmount(value)}{" "}
        <span className="text-[9px] text-slate-500">{currency}</span>
      </p>
    </div>
  );
}

function formatAmount(value: number | string) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(num);
}
