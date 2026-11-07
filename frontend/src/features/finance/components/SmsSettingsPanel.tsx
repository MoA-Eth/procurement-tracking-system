"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  ShieldCheck,
  Plus,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  fetchSmsSettings,
  updateSmsSettings,
  sendTestSms,
  formatEtb,
  type SmsSettings,
  type SmsRecipient,
} from "../api/financeApi";

export function SmsSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<SmsSettings>({
    smsEnabled: false,
    gatewayUrl: "",
    gatewayApiKey: "",
    thresholdEtb: 20000000,
    recipients: [],
    mockMode: true,
  });

  const [newRecipientName, setNewRecipientName] = useState("");
  const [newRecipientPhone, setNewRecipientPhone] = useState("");

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSmsSettings();
      setSettings(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load SMS settings · ቅንብሩን መጫን አልተቻለም");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function handleAddRecipient() {
    if (!newRecipientPhone.trim()) return;
    const item: SmsRecipient = {
      name: newRecipientName.trim() || "Executive Recipient",
      phone: newRecipientPhone.trim(),
    };
    setSettings((prev) => ({
      ...prev,
      recipients: [...prev.recipients, item],
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await updateSmsSettings({
        smsEnabled: settings.smsEnabled,
        gatewayUrl: settings.gatewayUrl,
        gatewayApiKey: settings.gatewayApiKey || undefined,
        thresholdEtb: Number(settings.thresholdEtb),
        recipients: settings.recipients,
        mockMode: settings.mockMode,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save SMS settings · ቅንብሩን ማስቀመጥ አልተቻለም");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    if (!testPhone.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await sendTestSms(testPhone.trim());
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Test failed · የሙከራ መልዕክቱ አልተሳካም",
      });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-emerald-600" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Executive High-Value SMS Alert Gateway · የከፍተኛ ክፍያ የኤስኤምኤስ ማስጠንቀቂያ ጌትዌይ
              </h2>
              <p className="text-sm text-slate-500">
                Dispatches urgent SMS notifications to executives when disbursements exceed the threshold.
                (ክፍያዎች ከተፈቀደው ወሰን በላይ ሲሆኑ ለተቆጣጣሪ ኃላፊዎች አፋጣኝ የኤስኤምኤስ ማሳወቂያ ይልካል።)
              </p>
            </div>
          </div>
          <button
            onClick={loadSettings}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            title="Refresh settings · አድስ"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {saveSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={16} /> SMS settings updated successfully · የኤስኤምኤስ ቅንብር በተሳካ ሁኔታ ተቀምጧል።
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          {/* Toggles */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  SMS Notifications · የኤስኤምኤስ ማሳወቂያዎች
                </p>
                <p className="text-xs text-slate-500">
                  Enable automatic SMS dispatch on high payment · በከፍተኛ ክፍያ ወቅት ራስ-ሰር ማሳወቂያ ላክ
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
                  Mock / Console Mode · የሙከራ ሁነታ (Mock Mode)
                </p>
                <p className="text-xs text-slate-500">
                  Logs SMS to system without calling physical gateway · እውነተኛ ኤስኤምኤስ ሳይላክ በሲስተም ውስጥ መዝግብ
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

          {/* Threshold input */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notification Threshold (ETB) · የማሳወቂያ መነሻ ወሰን (በብር)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="100000"
                value={settings.thresholdEtb}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    thresholdEtb: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Currently · በአሁን ወቅት: <span className="font-semibold text-slate-800">ETB {formatEtb(settings.thresholdEtb)}</span> — payments equal to or exceeding this trigger SMS. (ይህን መጠን ወይም ከዚያ በላይ የሆኑ ክፍያዎች የSMS ማሳወቂያ ያስነሳሉ።)
            </p>
          </div>

          {/* Gateway details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Gateway URL · የኤስኤምኤስ ጌትዌይ አድራሻ (URL)
              </label>
              <input
                type="text"
                value={settings.gatewayUrl}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, gatewayUrl: e.target.value }))
                }
                placeholder="http://192.168.1.50:8080/sms/send or https://sms.moa.gov.et"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Gateway API Key / Token · የኤፒአይ ቁልፍ (ምስጢራዊ ኮድ)
              </label>
              <input
                type="password"
                value={settings.gatewayApiKey}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, gatewayApiKey: e.target.value }))
                }
                placeholder="Leave blank or enter secret token · የይለፍ ቁልፍ ያስገቡ"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Recipients List */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Executive Recipients ({settings.recipients.length}) · የማሳወቂያ ተቀባዮች ማውጫ
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Authorized phone numbers that will receive high-value disbursement alerts. (የከፍተኛ ክፍያ ማሳወቂያ የሚደርሳቸው የተፈቀደላቸው ስልክ ቁጥሮች።)
            </p>

            <div className="mt-3 space-y-2">
              {settings.recipients.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-800">{r.name}</span>
                    <span className="ml-3 font-mono text-xs text-slate-500">{r.phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(idx)}
                    className="text-slate-400 hover:text-red-600 p-1"
                    title="Remove recipient · ሰርዝ"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add recipient row */}
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Recipient name / የተቆጣጣሪ ኃላፊ ስም (e.g. State Minister)"
                value={newRecipientName}
                onChange={(e) => setNewRecipientName(e.target.value)}
                className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <input
                type="tel"
                placeholder="+251911234567"
                value={newRecipientPhone}
                onChange={(e) => setNewRecipientPhone(e.target.value)}
                className="flex-1 min-w-[140px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={handleAddRecipient}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-900"
              >
                <Plus size={15} /> Add
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Saving…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Save SMS Configuration
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Gateway Connectivity Test */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          Test SMS Gateway Connectivity · የጌትዌይ ግንኙነት ሙከራ
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Send a verification test message to confirm network reachability to the SMS gateway. (የጌትዌይ ኔትወርክ ግንኙነቱን ለማረጋገጥ የሙከራ መልዕክት ይላኩ።)
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="tel"
            placeholder="+251911234567"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            type="button"
            onClick={handleSendTest}
            disabled={testing || !testPhone.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="animate-spin" size={14} /> Testing…
              </>
            ) : (
              <>
                <Send size={14} /> Send Test SMS
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-3 rounded-lg p-3 text-xs font-mono ${
              testResult.success
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
