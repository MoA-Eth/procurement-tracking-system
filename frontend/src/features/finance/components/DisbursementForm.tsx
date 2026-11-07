"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  MessageSquare,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  buildSmsPreview,
  createDisbursement,
  formatEtb,
  type DisbursementCategory,
  type DisbursementFormData,
  type PaymentMethod,
} from "../api/financeApi";

interface DisbursementFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  smsThreshold?: number;
  smsRecipientCount?: number;
}

const DEFAULT_THRESHOLD = 20_000_000;

function parseAmount(raw: string): number {
  // Strip commas/spaces, parse float
  return parseFloat(raw.replace(/[,\s]/g, "")) || 0;
}

function formatAmountDisplay(raw: string): string {
  const num = parseFloat(raw.replace(/[,\s]/g, ""));
  if (isNaN(num) || raw === "") return raw;
  return new Intl.NumberFormat("en-US").format(num);
}

export function DisbursementForm({
  onSuccess,
  onCancel,
  smsThreshold = DEFAULT_THRESHOLD,
  smsRecipientCount = 0,
}: DisbursementFormProps) {
  const [form, setForm] = useState({
    referenceNo: "",
    payeeName: "",
    amountRaw: "",
    category: "" as DisbursementCategory | "",
    paymentMethod: "" as PaymentMethod | "",
    paymentDate: new Date().toISOString().slice(0, 10),
    remarks: "",
    contractId: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const amount = parseAmount(form.amountRaw);
  const willTriggerSms = amount >= smsThreshold && form.payeeName && form.referenceNo && form.category;

  const smsPreview =
    willTriggerSms && form.category
      ? buildSmsPreview(
          amount,
          form.payeeName || "Payee",
          form.referenceNo || "REF-XXX",
          form.category as DisbursementCategory,
        )
      : null;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.referenceNo.trim()) e.referenceNo = "Voucher reference is required";
    if (!form.payeeName.trim()) e.payeeName = "Payee / Beneficiary name is required";
    if (!amount || amount <= 0) e.amount = "A positive amount is required";
    if (!form.category) e.category = "Payment category is required";
    if (!form.paymentMethod) e.paymentMethod = "Payment method is required";
    if (!form.paymentDate) e.paymentDate = "Payment date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload: DisbursementFormData = {
      referenceNo: form.referenceNo.trim(),
      payeeName: form.payeeName.trim(),
      amount,
      category: form.category as DisbursementCategory,
      paymentMethod: form.paymentMethod as PaymentMethod,
      paymentDate: new Date(form.paymentDate).toISOString(),
      remarks: form.remarks.trim() || undefined,
      contractId: form.contractId.trim() || null,
    };

    try {
      await createDisbursement(payload);
      setSubmitted(true);
      setTimeout(() => onSuccess(), 1500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to record disbursement";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="text-emerald-600" size={36} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">
          Disbursement Recorded
        </h3>
        <p className="text-sm text-slate-500">
          ETB {formatEtb(amount)} payment to {form.payeeName} has been saved
          {willTriggerSms ? " and SMS alert dispatched." : "."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* SMS Threshold Banner */}
      {willTriggerSms && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 shrink-0 text-amber-600"
              size={18}
            />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                High-Value Payment — SMS Alert Will Be Sent
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                This payment exceeds ETB {new Intl.NumberFormat("en-US").format(smsThreshold)}.
                {smsRecipientCount > 0
                  ? ` An SMS alert will be dispatched to ${smsRecipientCount} executive recipient${smsRecipientCount !== 1 ? "s" : ""} upon submission.`
                  : " No recipients configured yet — configure in SMS Settings."}
              </p>
              {smsPreview && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-100 px-3 py-2">
                  <MessageSquare
                    className="mt-0.5 shrink-0 text-amber-700"
                    size={14}
                  />
                  <p className="font-mono text-xs leading-5 text-amber-800">
                    {smsPreview}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two-column grid for main fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Voucher Reference */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Voucher Reference No. <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.referenceNo}
            onChange={(e) =>
              setForm((f) => ({ ...f, referenceNo: e.target.value }))
            }
            placeholder="e.g. MoA-FIN-2024-00123"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {errors.referenceNo && (
            <p className="mt-1 text-xs text-red-600">{errors.referenceNo}</p>
          )}
        </div>

        {/* Payee */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Payee / Beneficiary <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.payeeName}
            onChange={(e) =>
              setForm((f) => ({ ...f, payeeName: e.target.value }))
            }
            placeholder="e.g. Addis Construction PLC"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {errors.payeeName && (
            <p className="mt-1 text-xs text-red-600">{errors.payeeName}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Amount (ETB) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form.amountRaw}
            onChange={(e) =>
              setForm((f) => ({ ...f, amountRaw: e.target.value }))
            }
            onBlur={() =>
              setForm((f) => ({
                ...f,
                amountRaw: amount > 0 ? formatAmountDisplay(f.amountRaw) : f.amountRaw,
              }))
            }
            placeholder="0.00"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              amount >= smsThreshold
                ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20"
            }`}
          />
          {amount > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              ETB {formatEtb(amount)}
              {amount >= smsThreshold && (
                <span className="ml-2 font-medium text-amber-600">
                  ≥ Threshold
                </span>
              )}
            </p>
          )}
          {errors.amount && (
            <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
          )}
        </div>

        {/* Payment Date */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Payment Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.paymentDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, paymentDate: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {errors.paymentDate && (
            <p className="mt-1 text-xs text-red-600">{errors.paymentDate}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Payment Category <span className="text-red-500">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                category: e.target.value as DisbursementCategory,
              }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select category…</option>
            {(
              Object.entries(CATEGORY_LABELS) as [
                DisbursementCategory,
                string,
              ][]
            ).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-xs text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <select
            value={form.paymentMethod}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                paymentMethod: e.target.value as PaymentMethod,
              }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select method…</option>
            {(
              Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]
            ).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          {errors.paymentMethod && (
            <p className="mt-1 text-xs text-red-600">
              {errors.paymentMethod}
            </p>
          )}
        </div>

        {/* Optional Contract Link */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Linked Contract ID{" "}
            <span className="text-xs font-normal text-slate-400">
              (optional — for procurement-related payments)
            </span>
          </label>
          <input
            type="text"
            value={form.contractId}
            onChange={(e) =>
              setForm((f) => ({ ...f, contractId: e.target.value }))
            }
            placeholder="Paste contract UUID if applicable"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Remarks */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Purpose / Remarks
          </label>
          <textarea
            value={form.remarks}
            onChange={(e) =>
              setForm((f) => ({ ...f, remarks: e.target.value }))
            }
            rows={3}
            placeholder="Describe the purpose of this disbursement…"
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Recording…
            </>
          ) : willTriggerSms ? (
            <>
              <MessageSquare size={16} />
              Record & Send SMS Alert
            </>
          ) : (
            "Record Disbursement"
          )}
        </button>
      </div>
    </form>
  );
}

