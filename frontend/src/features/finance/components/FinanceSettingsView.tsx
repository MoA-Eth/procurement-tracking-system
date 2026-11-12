"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Settings,
  Users,
  MessageSquare,
  ShieldCheck,
  Plus,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Phone,
  Eye,
  EyeOff,
  Radio,
  Sliders,
  Copy,
  Check,
  Server,
  Bell,
  ArrowUpRight,
  Info,
} from "lucide-react";
import type { AuthUser } from "@/lib/authTypes";
import {
  fetchSmsSettings,
  updateSmsSettings,
  sendTestSms,
  formatEtb,
  normalizeEthiopianPhone,
  type SmsSettings,
  type SmsGatewayAuthFormat,
  type SmsRecipient,
} from "../api/financeApi";

interface FinanceSettingsViewProps {
  currentUser: AuthUser;
}

type SettingsTab = "subscribers" | "gateway" | "test";

const PRESET_THRESHOLDS = [
  { label: "10M ETB", value: 10000000 },
  { label: "20M ETB", value: 20000000 },
  { label: "50M ETB", value: 50000000 },
  { label: "100M ETB", value: 100000000 },
];

export function FinanceSettingsView({ currentUser }: FinanceSettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("subscribers");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const [testPhone, setTestPhone] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<SmsSettings>({
    smsEnabled: true,
    gatewayUrl: "",
    gatewayApiKey: "",
    gatewayAuthFormat: "BEARER",
    thresholdEtb: 20000000,
    recipients: [],
    mockMode: true,
  });

  // Track pristine state to detect unsaved changes
  const [originalSettingsJson, setOriginalSettingsJson] = useState("");

  // New subscriber inputs
  const [newRecipientName, setNewRecipientName] = useState("");
  const [newRecipientPhone, setNewRecipientPhone] = useState("");
  const [subscriberFilter, setSubscriberFilter] = useState("");
  const [subscriberError, setSubscriberError] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSmsSettings();
      const normalized: SmsSettings = {
        ...res.data,
        gatewayAuthFormat: res.data.gatewayAuthFormat ?? "BEARER",
      };
      setSettings(normalized);
      setOriginalSettingsJson(JSON.stringify(normalized));
      setShowApiKey(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load SMS settings · ቅንብሩን መጫን አልተቻለም",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const hasUnsavedChanges = useMemo(() => {
    if (!originalSettingsJson) return false;
    return JSON.stringify(settings) !== originalSettingsJson;
  }, [settings, originalSettingsJson]);

  const filteredRecipients = useMemo(() => {
    const q = subscriberFilter.trim().toLowerCase();
    if (!q) return settings.recipients;
    return settings.recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q),
    );
  }, [settings.recipients, subscriberFilter]);

  function handleAddRecipient() {
    setSubscriberError(null);
    const name = newRecipientName.trim();
    const phone = normalizeEthiopianPhone(newRecipientPhone);

    if (!name) {
      setSubscriberError("Recipient name or title is required · ስም ወይም ማዕረግ ያስፈልጋል");
      return;
    }
    if (!phone) {
      setSubscriberError("Phone number is required · ስልክ ቁጥር ያስፈልጋል");
      return;
    }

    if (phone.length < 10) {
      setSubscriberError(
        "Phone number is too short. Use format +251911234567 · ትክክለኛ ስልክ ቁጥር ያስገቡ",
      );
      return;
    }

    // Prevent duplicates
    if (settings.recipients.some((r) => r.phone.replace(/\s+/g, "") === phone)) {
      setSubscriberError("This phone number is already registered · ይህ ስልክ ቁጥር አስቀድሞ ተመዝግቧል");
      return;
    }

    setSettings((prev) => ({
      ...prev,
      recipients: [...prev.recipients, { name, phone }],
    }));
    setNewRecipientName("");
    setNewRecipientPhone("");
  }

  function handleRemoveRecipient(index: number) {
    setSettings((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  }

  async function handleSaveSettings(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const trimmedUrl = settings.gatewayUrl.trim();
      const authFormat: SmsGatewayAuthFormat = settings.gatewayAuthFormat ?? "BEARER";
      const submittedKey = settings.gatewayApiKey;

      await updateSmsSettings({
        smsEnabled: settings.smsEnabled,
        gatewayUrl: trimmedUrl,
        gatewayApiKey: submittedKey,
        gatewayAuthFormat: authFormat,
        thresholdEtb: Number(settings.thresholdEtb),
        recipients: settings.recipients,
        mockMode: settings.mockMode,
      });

      const nextSettings: SmsSettings = {
        ...settings,
        gatewayUrl: trimmedUrl,
        gatewayAuthFormat: authFormat,
        gatewayApiKey: submittedKey.trim() ? "***" : "",
      };
      setSettings(nextSettings);
      setOriginalSettingsJson(JSON.stringify(nextSettings));
      setShowApiKey(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save configuration · ቅንብሩን ማስቀመጥ አልተቻለም",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    const normalizedPhone = normalizeEthiopianPhone(testPhone);
    if (!normalizedPhone) return;
    setTestPhone(normalizedPhone);
    setTesting(true);
    setTestResult(null);
    try {
      const res = await sendTestSms(normalizedPhone);
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Test failed · የሙከራ መልዕክቱ አልተሳካም",
      });
    } finally {
      setTesting(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    setTimeout(() => setCopiedPhone(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-emerald-600" size={32} />
          <p className="mt-3 text-sm text-slate-500">
            Loading settings · ቅንብሮች በመጫን ላይ ናቸው…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Header Info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Sliders size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Settings & SMS Gateway Configuration
                </h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  ማስተካከያዎች
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Manage executive alert subscribers, SMS gateway endpoints, and high-value payment thresholds.
                (የከፍተኛ ክፍያ ማሳወቂያ ተቀባዮች፣ የኤስኤምኤስ ጌትዌይ እና መነሻ ወሰን ቅንብር።)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={loadSettings}
              disabled={loading || saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              title="Refresh from server · አድስ"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            {hasUnsavedChanges && (
              <button
                onClick={() => handleSaveSettings()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 animate-pulse"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Save Changes · ለውጦችን መዝግብ
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Global Alerts */}
        {saveSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>
              Configuration updated successfully · የቅንብር ለውጦች በተሳካ ሁኔታ ተቀምጠዋል።
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-800">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Registered Subscribers · ተመዝጋቢዎች
              </span>
              <Users size={16} className="text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {settings.recipients.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Executive recipients configured
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                SMS Alert Status · የኤስኤምኤስ ሁኔታ
              </span>
              <Radio
                size={16}
                className={settings.smsEnabled ? "text-emerald-600" : "text-slate-400"}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  settings.smsEnabled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    settings.smsEnabled ? "bg-emerald-600" : "bg-slate-400"
                  }`}
                />
                {settings.smsEnabled ? "Active · ንቁ" : "Disabled · ተዘግቷል"}
              </span>
              {settings.mockMode && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  Mock Mode
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {settings.mockMode ? "Logging without external gateway" : "Live gateway connected"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                High-Value Threshold · መነሻ ወሰን
              </span>
              <Bell size={16} className="text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700">
              ETB {formatEtb(settings.thresholdEtb)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Payments ≥ this amount trigger SMS
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mt-6 flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("subscribers")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === "subscribers"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={16} />
            Subscribers & Recipients · የተመዝጋቢዎች ማውጫ
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activeTab === "subscribers"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {settings.recipients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gateway")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === "gateway"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Server size={16} />
            Gateway & Threshold · ጌትዌይ እና ወሰን
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("test")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === "test"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Send size={16} />
            Connectivity Test · የጌትዌይ ሙከራ
          </button>
        </div>
      </div>

      {/* ─── TAB 1: SUBSCRIBERS ────────────────────────────────────────────── */}
      {activeTab === "subscribers" && (
        <div className="space-y-6">
          {/* Add New Subscriber Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Add Executive Subscriber · አዲስ ተቆጣጣሪ ተቀባይ መዝግብ
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Authorized officials and executives who will receive real-time SMS alerts for disbursements ≥ ETB {formatEtb(settings.thresholdEtb)}.
                  (ከብር {formatEtb(settings.thresholdEtb)} በላይ የሆኑ ክፍያዎች ሲፈጸሙ የኤስኤምኤስ መልዕክት የሚደርሳቸው ኃላፊዎች።)
                </p>
              </div>
            </div>

            {subscriberError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{subscriberError}</span>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Subscriber Name & Title · የተመዝጋቢ ስም እና ማዕረግ
                </label>
                <input
                  type="text"
                  placeholder="e.g. H.E. Minister Girma Amente / State Minister"
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddRecipient();
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Phone Number · ስልክ ቁጥር (+2519... / 09...)
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <input
                    type="tel"
                    placeholder="+251911234567"
                    value={newRecipientPhone}
                    onChange={(e) => setNewRecipientPhone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRecipient();
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Subscribers Roster */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Configured Subscribers Directory ({settings.recipients.length}) · የተመዝጋቢዎች ዝርዝር
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {settings.recipients.length} subscriber(s) currently active in this environment.
                </p>
              </div>

              {settings.recipients.length > 3 && (
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={subscriberFilter}
                    onChange={(e) => setSubscriberFilter(e.target.value)}
                    placeholder="Filter by name or phone… · ፈልግ"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {settings.recipients.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto text-slate-300" size={40} />
                <h3 className="mt-3 text-sm font-semibold text-slate-800">
                  No Subscribers Configured · ምንም ተመዝጋቢ አልተገኘም
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Add phone numbers above to ensure ministers and executive leadership receive instant SMS notifications for high-value disbursements.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {filteredRecipients.map((recipient, idx) => {
                  const initials = recipient.name
                    .split(" ")
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "MOA";

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-3.5 px-2 hover:bg-slate-50/70 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900">
                              {recipient.name}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                              Active Recipient
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono text-slate-600">
                              {recipient.phone}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(recipient.phone)}
                              className="text-slate-400 hover:text-slate-600"
                              title="Copy phone number"
                            >
                              {copiedPhone === recipient.phone ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTestPhone(recipient.phone);
                            setActiveTab("test");
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          title="Send test message to this subscriber"
                        >
                          Test SMS
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(idx)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Remove subscriber · አስወግድ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom save bar */}
            {hasUnsavedChanges && (
              <div className="mt-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-800">
                  <AlertTriangle size={15} />
                  <span>
                    You have unsaved changes to the subscribers list. Click Save to persist.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  {saving ? "Saving…" : "Save Subscribers"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: GATEWAY & THRESHOLD ────────────────────────────────────── */}
      {activeTab === "gateway" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-slate-900">
                SMS Gateway Parameters & Alert Rules · የጌትዌይ እና ማሳወቂያ ደንቦች
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Configure the network endpoint, security credentials, and monetary threshold for automated SMS alerts.
              </p>
            </div>

            {/* Master Toggles */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Automated SMS Alerts · ራስ-ሰር የኤስኤምኤስ ማሳወቂያዎች
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    When enabled, high-value payments automatically send SMS to all subscribers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smsEnabled}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, smsEnabled: e.target.checked }))
                  }
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Mock / Sandbox Mode · የሙከራ ሁነታ
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Logs SMS payloads to system audit trails without dispatching physical telecom SMS.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.mockMode}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, mockMode: e.target.checked }))
                  }
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Threshold Configuration */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                High-Value Disbursement Alert Threshold (ETB) · የማሳወቂያ መነሻ ወሰን (ብር)
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-slate-500">Quick presets:</span>
                {PRESET_THRESHOLDS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() =>
                      setSettings((s) => ({ ...s, thresholdEtb: p.value }))
                    }
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      settings.thresholdEtb === p.value
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1000"
                step="500000"
                value={settings.thresholdEtb}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    thresholdEtb: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Current rule: Any payment <span className="font-semibold text-slate-900">≥ ETB {formatEtb(settings.thresholdEtb)}</span> will automatically notify {settings.recipients.length} subscriber(s).
              </p>
            </div>

            {/* Gateway Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Gateway REST / HTTP Endpoint URL · የጌትዌይ አድራሻ
                </label>
                <input
                  type="text"
                  value={settings.gatewayUrl}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, gatewayUrl: e.target.value }))
                  }
                  placeholder="https://sms.moa.gov.et/api/v1/send or http://192.168.1.50:8080/sms/send"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Target API endpoint accepting POST {"{ to, message }"} payloads.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Gateway API Key / Token · የኤፒአይ ቁልፍ (ምስጢራዊ ኮድ)
                </label>
                <div className="relative">
                  <input
                    type={showApiKey && settings.gatewayApiKey !== "***" ? "text" : "password"}
                    value={settings.gatewayApiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings((s) => ({ ...s, gatewayApiKey: val }));
                    }}
                    placeholder="Enter auth token or leave blank if using IP whitelist"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-3.5 pr-10 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {settings.gatewayApiKey !== "***" && (
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title={showApiKey ? "Hide key" : "Show key"}
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {settings.gatewayApiKey === "***"
                    ? "Token saved on server ('***'). Leave as-is to keep it, replace it, or clear the field to remove."
                    : "Sent in Authorization header when dispatching notifications."}
                </p>
              </div>
            </div>

            {/* Authorization Header Format */}
            <div className="max-w-md">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Authorization Header Format · የማረጋገጫ ራስጌ ቅርጸት
              </label>
              <select
                value={settings.gatewayAuthFormat ?? "BEARER"}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    gatewayAuthFormat: e.target.value as SmsGatewayAuthFormat,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="BEARER">
                  Bearer Token (Authorization: Bearer &lt;token&gt;)
                </option>
                <option value="RAW">
                  Raw Token (Authorization: &lt;token&gt;)
                </option>
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                Choose how the API token is sent in the HTTP Authorization header.
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Saving Configuration…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Save Gateway Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ─── TAB 3: CONNECTIVITY TEST ──────────────────────────────────────── */}
      {activeTab === "test" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-slate-900">
              SMS Gateway Connectivity & Reachability Test · የጌትዌይ ግንኙነት ሙከራ
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Transmit a diagnostic verification SMS to confirm end-to-end network reachability, gateway response time, and credentials validity.
            </p>
          </div>

          {hasUnsavedChanges && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-800">
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  You have unsaved gateway changes. Save settings first so the connectivity test uses your latest configuration.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSaveSettings()}
                disabled={saving}
                className="shrink-0 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 text-emerald-600 shrink-0" size={18} />
              <div className="text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800">
                  Gateway Diagnostic Information:
                </p>
                <p className="mt-1">
                  • Target URL: <span className="font-mono">{settings.gatewayUrl || "Not configured (Mock mode will be used)"}</span>
                </p>
                <p>
                  • Auth Header: <span className="font-semibold">{(settings.gatewayAuthFormat ?? "BEARER") === "RAW" ? "Raw Token" : "Bearer Token"}</span>
                </p>
                <p>
                  • Operational Mode: <span className="font-semibold">{settings.mockMode ? "Mock Mode (Simulated)" : "Live Gateway Dispatch"}</span>
                </p>
                <p>
                  • Message Content: <span className="font-mono text-slate-700">[MoA Test] SMS gateway connectivity check from Procurement System.</span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Target Phone Number · የሙከራ ስልክ ቁጥር
            </label>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={15}
                />
                <input
                  type="tel"
                  placeholder="+251911234567"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm font-mono text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {settings.recipients.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) setTestPhone(e.target.value);
                  }}
                  value=""
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Or pick subscriber… · ከተመዝጋቢ ምረጥ</option>
                  {settings.recipients.map((r, i) => (
                    <option key={i} value={r.phone}>
                      {r.name} ({r.phone})
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handleSendTest}
                disabled={testing || !testPhone.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 shadow-sm"
              >
                {testing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Transmitting…
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send Test SMS
                  </>
                )}
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`rounded-xl border p-4 text-xs font-mono leading-relaxed ${
                testResult.success
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-red-300 bg-red-50 text-red-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {testResult.success ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>GATEWAY TEST SUCCESSFUL · ግንኙነቱ ተሳክቷል</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} className="text-red-600" />
                    <span>GATEWAY TEST FAILED · ግንኙነቱ አልተሳካም</span>
                  </>
                )}
              </div>
              <p className="mt-1">{testResult.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

