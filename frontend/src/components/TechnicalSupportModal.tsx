import { Headphones, Mail, Phone, X } from "lucide-react";
import { useEffect } from "react";

interface TechnicalSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TechnicalSupportModal({
  isOpen,
  onClose,
}: TechnicalSupportModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="rounded-xl bg-emerald-50 p-2 text-[#064e3b]">
              <Headphones />
            </span>
            <div>
              <h2
                id="support-title"
                className="text-lg font-bold text-slate-900"
              >
                MoA ICT Technical Support
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Account access, password and system assistance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close technical support"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <a
            href="tel:+251116460128"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-600"
          >
            <Phone size={20} className="text-emerald-700" />
            <span>
              <span className="block text-xs font-semibold uppercase text-slate-500">
                Hotline
              </span>
              <span className="font-medium text-slate-900">
                9090 / +251 11 646 0128
              </span>
            </span>
          </a>
          <a
            href="mailto:support@moa.gov.et"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-emerald-600"
          >
            <Mail size={20} className="text-emerald-700" />
            <span>
              <span className="block text-xs font-semibold uppercase text-slate-500">
                Support email
              </span>
              <span className="font-medium text-slate-900">
                support@moa.gov.et
              </span>
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}
