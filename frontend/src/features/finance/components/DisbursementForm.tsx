"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Building2,
  FileCheck2,
  Banknote,
  Search,
  X,
  Info,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_LABELS_AM,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_LABELS_AM,
  CONTRACT_PAYMENT_TYPE_LABELS,
  CONTRACT_PAYMENT_TYPE_LABELS_AM,
  buildSmsPreview,
  createDisbursement,
  fetchContractsLookup,
  formatEtb,
  type DisbursementCategory,
  type DisbursementFormData,
  type PaymentMethod,
  type ContractPaymentType,
  type ContractLookupItem,
} from "../api/financeApi";

interface DisbursementFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  smsThreshold?: number;
  smsRecipientCount?: number;
}

type DisbursementOrigin = "CONTRACT" | "DIRECT";

const DEFAULT_THRESHOLD = 20_000_000;

function parseAmount(raw: string): number {
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
  const [origin, setOrigin] = useState<DisbursementOrigin>("CONTRACT");

  // Contract lookup state
  const [contracts, setContracts] = useState<ContractLookupItem[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [contractSearch, setContractSearch] = useState("");
  const [selectedContract, setSelectedContract] =
    useState<ContractLookupItem | null>(null);

  const [form, setForm] = useState({
    referenceNo: "",
    payeeName: "",
    amountRaw: "",
    category: "PROCUREMENT_GOODS" as DisbursementCategory | "",
    paymentMethod: "BANK_TRANSFER" as PaymentMethod | "",
    paymentType: "INTERIM_1" as ContractPaymentType | "",
    paymentDate: new Date().toISOString().slice(0, 10),
    remarks: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Load contracts for lookup
  useEffect(() => {
    let active = true;
    setLoadingContracts(true);
    fetchContractsLookup()
      .then((res) => {
        if (active && res.data) {
          setContracts(res.data);
        }
      })
      .catch((err) => {
        console.warn("Failed to load contracts for lookup:", err);
      })
      .finally(() => {
        if (active) setLoadingContracts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredContracts = useMemo(() => {
    const q = contractSearch.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter(
      (c) =>
        c.contractNo.toLowerCase().includes(q) ||
        c.supplierName.toLowerCase().includes(q) ||
        (c.purchaseOrderNo && c.purchaseOrderNo.toLowerCase().includes(q)),
    );
  }, [contracts, contractSearch]);

  function handleSelectContract(c: ContractLookupItem) {
    setSelectedContract(c);
    setForm((prev) => ({
      ...prev,
      payeeName: c.supplierName,
      category:
        c.sector?.toUpperCase().includes("WORK") ||
        c.sector?.toUpperCase().includes("CONSTRUCT")
          ? "CONTRACTOR_WORKS"
          : "PROCUREMENT_GOODS",
    }));
  }

  function handleClearContract() {
    setSelectedContract(null);
    setContractSearch("");
  }

  function handleSwitchOrigin(newOrigin: DisbursementOrigin) {
    setOrigin(newOrigin);
    if (newOrigin === "DIRECT") {
      setSelectedContract(null);
      setForm((prev) => ({
        ...prev,
        category: "OPERATIONAL_ADMIN",
        paymentType: "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        category: "PROCUREMENT_GOODS",
        paymentType: "INTERIM_1",
      }));
    }
  }

  const amount = parseAmount(form.amountRaw);
  const willTriggerSms =
    amount >= smsThreshold && form.payeeName && form.referenceNo && form.category;

  const isExceedingContractBalance =
    origin === "CONTRACT" &&
    selectedContract &&
    amount > selectedContract.remainingValue;

  const smsPreview =
    willTriggerSms && form.category
      ? buildSmsPreview(
          amount,
          form.payeeName || "Payee",
          form.referenceNo || "REF-XXX",
          form.category as DisbursementCategory,
          origin === "CONTRACT" ? selectedContract?.contractNo : null,
        )
      : null;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.referenceNo.trim()) {
      e.referenceNo = "Voucher reference is required · የማጣቀሻ ቁጥር ያስፈልጋል";
    }
    if (!form.payeeName.trim()) {
      e.payeeName = "Payee name is required · የክፍያ ተቀባይ ስም ያስፈልጋል";
    }
    if (!amount || amount <= 0) {
      e.amount = "A positive amount is required · ትክክለኛ የክፍያ መጠን ያስገቡ";
    }
    if (!form.category) {
      e.category = "Payment category is required · የክፍያ ምድብ ይምረጡ";
    }
    if (!form.paymentMethod) {
      e.paymentMethod = "Payment method is required · የክፍያ ዘዴ ይምረጡ";
    }
    if (!form.paymentDate) {
      e.paymentDate = "Payment date is required · የክፍያ ቀን ያስገቡ";
    }
    if (origin === "CONTRACT" && !selectedContract) {
      e.contractId = "Please select a contract · እባክዎ የተያያዘውን ውል ይምረጡ";
    }
    if (isExceedingContractBalance && !form.remarks.trim()) {
      e.remarks =
        "Amount exceeds remaining balance. Explanation is required in remarks · ክፍያው ከቀሪው ሂሳብ በላይ በመሆኑ ማብራሪያ ያስፈልጋል";
    }
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
      paymentType:
        origin === "CONTRACT" && form.paymentType
          ? (form.paymentType as ContractPaymentType)
          : null,
      paymentDate: new Date(form.paymentDate).toISOString(),
      remarks: form.remarks.trim() || undefined,
      contractId: origin === "CONTRACT" ? selectedContract?.id ?? null : null,
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
      <div className="flex flex-1 flex-col items-center gap-4 p-8 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="text-emerald-600" size={36} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">
          Disbursement Recorded · ክፍያው ተመዝግቧል
        </h3>
        <p className="text-sm text-slate-500">
          ETB {formatEtb(amount)} payment to {form.payeeName} has been saved
          {willTriggerSms ? " and SMS alert dispatched · የኤስኤምኤስ ማሳወቂያ ተልኳል." : "."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col min-h-0 overflow-hidden"
    >
      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
        {/* Origin Selector: Contract vs Direct */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Disbursement Origin · የክፍያ ምንጭ ዓይነት
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSwitchOrigin("CONTRACT")}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                origin === "CONTRACT"
                  ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/20"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  origin === "CONTRACT"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <FileCheck2 size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Procurement Contract
                </p>
                <p className="text-xs text-slate-500">
                  ከኮንትራት ጋር የተያያዘ ክፍያ
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchOrigin("DIRECT")}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                origin === "DIRECT"
                  ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/20"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  origin === "DIRECT"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Banknote size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Direct / Non-Contract
                </p>
                <p className="text-xs text-slate-500">
                  ቀጥታ / አጠቃላይ የሚኒስቴር ክፍያ
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Contract Selector in CONTRACT mode */}
        {origin === "CONTRACT" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Active Contract · ውል ይምረጡ <span className="text-red-500">*</span>
              </label>
              {selectedContract && (
                <button
                  type="button"
                  onClick={handleClearContract}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  <X size={13} /> Change Contract
                </button>
              )}
            </div>

            {!selectedContract ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={15}
                  />
                  <input
                    type="text"
                    value={contractSearch}
                    onChange={(e) => setContractSearch(e.target.value)}
                    placeholder="Search contract number or vendor name… · በውል ቁጥር ወይም በድርጅት ስም ፈልግ"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                  {loadingContracts ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Loading active contracts…
                    </div>
                  ) : filteredContracts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No matching contracts found.
                    </div>
                  ) : (
                    filteredContracts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectContract(c)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">
                              {c.contractNo}
                            </span>
                            {c.purchaseOrderNo && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-mono">
                                PO: {c.purchaseOrderNo}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {c.supplierName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-slate-800">
                            ETB {formatEtb(c.remainingValue)}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            Remaining Balance
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {errors.contractId && (
                  <p className="text-xs text-red-600">{errors.contractId}</p>
                )}
              </div>
            ) : (
              /* Selected Contract Info Card */
              <div className="rounded-lg border border-emerald-200 bg-white p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {selectedContract.contractNo}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Linked Contract
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    Vendor: <strong className="text-slate-800">{selectedContract.supplierName}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Contract</span>
                    <span className="font-semibold text-slate-800">
                      ETB {formatEtb(selectedContract.totalValue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Paid to Date</span>
                    <span className="font-semibold text-slate-700">
                      ETB {formatEtb(selectedContract.paidAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Remaining</span>
                    <span className="font-bold text-emerald-700">
                      ETB {formatEtb(selectedContract.remainingValue)}
                    </span>
                  </div>
                </div>

                {isExceedingContractBalance && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                    <span>
                      Entered amount exceeds remaining balance. Please explain in remarks. (ክፍያው ከቀሪው ሂሳብ በላይ በመሆኑ ማብራሪያ ያስገቡ።)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                  High-Value Payment — SMS Alert Will Be Sent · የከፍተኛ ክፍያ ማሳወቂያ ይላካል
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                  This payment exceeds ETB {formatEtb(smsThreshold)}. An automated SMS
                  alert will be dispatched to {smsRecipientCount} executive recipient(s).
                  (ይህ ክፍያ ከተቀመጠው ወሰን በላይ በመሆኑ ለኃላፊዎች አፋጣኝ የኤስኤምኤስ መልዕክት ይላካል።)
                </p>
                {smsPreview && (
                  <div className="mt-2.5 rounded-lg border border-amber-300 bg-white p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                      <MessageSquare size={13} /> SMS Message Preview · የተዘጋጀው መልዕክት:
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-700 leading-relaxed">
                      {smsPreview}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Reference / Voucher No */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Payment Voucher Reference · የማጣቀሻ ቁጥር <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.referenceNo}
              onChange={(e) =>
                setForm((f) => ({ ...f, referenceNo: e.target.value }))
              }
              placeholder="e.g. VOUCH-2026-0041"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {errors.referenceNo && (
              <p className="mt-1 text-xs text-red-600">{errors.referenceNo}</p>
            )}
          </div>

          {/* Payee / Vendor Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Payee / Vendor Name · የክፍያ ተቀባይ ስም <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.payeeName}
              onChange={(e) =>
                setForm((f) => ({ ...f, payeeName: e.target.value }))
              }
              placeholder="e.g. Ethiopian Construction Works Corp"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {errors.payeeName && (
              <p className="mt-1 text-xs text-red-600">{errors.payeeName}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Disbursement Amount · የክፍያ መጠን (ETB / በብር){" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-slate-400">
                ETB
              </span>
              <input
                type="text"
                value={form.amountRaw}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setForm((f) => ({ ...f, amountRaw: val }));
                }}
                onBlur={() => {
                  if (form.amountRaw) {
                    setForm((f) => ({
                      ...f,
                      amountRaw: formatAmountDisplay(f.amountRaw),
                    }));
                  }
                }}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-12 pr-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            {amount >= smsThreshold && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                ⚡ Exceeds high-value threshold (ETB {formatEtb(smsThreshold)}) · የከፍተኛ ክፍያ ወሰን አልፏል
              </p>
            )}
            {errors.amount && (
              <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Payment Date · የክፍያ ቀን <span className="text-red-500">*</span>
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

          {/* Payment Method */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Payment Method · የክፍያ ዘዴ <span className="text-red-500">*</span>
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
              <option value="">ዘዴ ይምረጡ · Select method…</option>
              {(
                Object.entries(PAYMENT_METHOD_LABELS) as [
                  PaymentMethod,
                  string,
                ][]
              ).map(([val, label]) => (
                <option key={val} value={val}>
                  {label} ({PAYMENT_METHOD_LABELS_AM[val]})
                </option>
              ))}
            </select>
            {errors.paymentMethod && (
              <p className="mt-1 text-xs text-red-600">
                {errors.paymentMethod}
              </p>
            )}
          </div>

          {/* Contract Milestone / Payment Type if in CONTRACT mode */}
          {origin === "CONTRACT" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Contract Milestone / Type · የውል ምዕራፍ ክፍያ ዓይነት
              </label>
              <select
                value={form.paymentType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    paymentType: e.target.value as ContractPaymentType,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {(
                  Object.entries(CONTRACT_PAYMENT_TYPE_LABELS) as [
                    ContractPaymentType,
                    string,
                  ][]
                ).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label} ({CONTRACT_PAYMENT_TYPE_LABELS_AM[val]})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Category selector in DIRECT mode */
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Payment Category · የክፍያ ምድብ <span className="text-red-500">*</span>
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
                <option value="">ምድብ ይምረጡ · Select category…</option>
                {(
                  Object.entries(CATEGORY_LABELS) as [
                    DisbursementCategory,
                    string,
                  ][]
                ).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label} ({CATEGORY_LABELS_AM[val]})
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-xs text-red-600">{errors.category}</p>
              )}
            </div>
          )}

          {/* Remarks */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Purpose / Remarks · የክፍያው ዓላማ / ማስታወሻ
              {isExceedingContractBalance && (
                <span className="text-red-500 font-normal"> (Required: justification for exceeding contract balance)</span>
              )}
            </label>
            <textarea
              value={form.remarks}
              onChange={(e) =>
                setForm((f) => ({ ...f, remarks: e.target.value }))
              }
              rows={3}
              placeholder="የዚህን ክፍያ ዓላማና ዝርዝር እዚህ ያብራሩ · Describe the purpose of this disbursement…"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {errors.remarks && (
              <p className="mt-1 text-xs text-red-600">{errors.remarks}</p>
            )}
          </div>
        </div>

        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
      </div>

      {/* Sticky Actions Footer */}
      <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/90 px-6 py-4">
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
