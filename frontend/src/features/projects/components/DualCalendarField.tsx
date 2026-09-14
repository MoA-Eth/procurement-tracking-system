"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  ArrowRightLeft,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  ETHIOPIAN_MONTHS,
  daysInEthiopianMonth,
  ethiopianToGregorian,
  ethiopianWeekday,
  formatEthiopianDate,
  gregorianToEthiopian,
  parseEthiopianDate,
  type EthiopianDate,
} from "../utils/ethiopianCalendar";

export interface DualCalendarFieldProps {
  id: string;
  label?: string | ReactNode;
  gregorianValue: string;
  ethiopianValue?: string;
  onChange: (gregorianValue: string, ethiopianValue: string) => void;
  required?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  readOnly?: boolean;
  icon?: ReactNode;
  variant?: "default" | "director";
  popDirection?: "up" | "down" | "auto";
  className?: string;
}

export function DualCalendarField({
  id,
  label,
  gregorianValue,
  ethiopianValue,
  onChange,
  required = true,
  errorMessage,
  disabled = false,
  readOnly = false,
  icon,
  variant = "director",
  popDirection = "up",
  className = "",
}: DualCalendarFieldProps) {
  const error = Boolean(errorMessage);

  // Compute effective Ethiopian value if not passed explicitly
  const effectiveEthiopian =
    ethiopianValue ||
    (gregorianValue && gregorianToEthiopian(gregorianValue)
      ? formatEthiopianDate(gregorianToEthiopian(gregorianValue)!)
      : "");

  function changeGregorian(value: string) {
    if (!value) {
      onChange("", "");
      return;
    }
    const converted = gregorianToEthiopian(value);
    onChange(value, converted ? formatEthiopianDate(converted) : "");
  }

  function changeEthiopian(value: EthiopianDate) {
    const greg = ethiopianToGregorian(value.year, value.month, value.day);
    const eth = formatEthiopianDate(value);
    onChange(greg, eth);
  }

  function clearBoth() {
    onChange("", "");
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={`${id}-gregorian`}
          className={`block text-xs font-bold flex items-center gap-1.5 ${
            error ? "text-red-600" : "text-slate-800"
          }`}
        >
          {icon || <Calendar className="h-4 w-4 text-[#0A3C2F]" />}
          <span>{label}</span>
          {required ? <span className="text-red-500 ml-0.5">*</span> : null}
        </label>
      )}

      <div
        className={`rounded-xl p-3 space-y-1.5 border transition-all ${
          variant === "director"
            ? "border-indigo-100 bg-indigo-50/40"
            : "border-slate-300 bg-[#f0f3ff]"
        }`}
      >
        <div className="flex items-center justify-between text-[10px] font-extrabold tracking-wider text-slate-500 uppercase px-1">
          <span>GREGORIAN</span>
          <span>ETHIOPIAN</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Gregorian Input */}
          <div className="min-w-0">
            <input
              id={`${id}-gregorian`}
              type="date"
              value={gregorianValue}
              onChange={(e) => changeGregorian(e.target.value)}
              disabled={disabled || readOnly}
              className={`w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none transition-colors ${
                disabled || readOnly
                  ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                  : "focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]/20 cursor-pointer"
              }`}
            />
          </div>

          {/* Exchange Icon */}
          <ArrowRightLeft className="h-4 w-4 text-slate-400 shrink-0" />

          {/* Ethiopian Date Picker */}
          <div className="min-w-0">
            <EthiopianCalendarPicker
              id={`${id}-ethiopian`}
              value={effectiveEthiopian}
              onSelect={changeEthiopian}
              onClear={clearBoth}
              disabled={disabled || readOnly}
              popDirection={popDirection}
            />
          </div>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <Info aria-hidden="true" className="h-3.5 w-3.5" />
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

const ETHIOPIAN_YEARS = Array.from({ length: 41 }, (_, idx) => 2000 + idx);

function EthiopianCalendarPicker({
  id,
  value,
  onSelect,
  onClear,
  disabled,
  popDirection = "up",
}: {
  id: string;
  value: string;
  onSelect: (value: EthiopianDate) => void;
  onClear?: () => void;
  disabled?: boolean;
  popDirection?: "up" | "down" | "auto";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoPlacement, setAutoPlacement] = useState<"up" | "down">("up");
  const effectivePlacement =
    popDirection === "auto" ? autoPlacement : popDirection;

  const parsedValue = parseEthiopianDate(value);
  const today = gregorianToEthiopian(new Date().toISOString().slice(0, 10)) ?? {
    day: 1,
    month: 1,
    year: 2017,
  };

  const [visibleMonth, setVisibleMonth] = useState(
    parsedValue?.month ?? today.month,
  );
  const [visibleYear, setVisibleYear] = useState(
    parsedValue?.year ?? today.year,
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function moveMonth(offset: number) {
    const monthIndex = visibleMonth - 1 + offset;
    const yearOffset = Math.floor(monthIndex / 13);
    setVisibleYear((current) => current + yearOffset);
    setVisibleMonth((((monthIndex % 13) + 13) % 13) + 1);
  }

  const leadingDays = ethiopianWeekday(visibleYear, visibleMonth);
  const monthDays = daysInEthiopianMonth(visibleYear, visibleMonth);

  const placementClass =
    effectivePlacement === "up"
      ? "bottom-full mb-2 right-0 origin-bottom-right"
      : "top-full mt-2 right-0 origin-top-right";

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (!open) {
              const current = parseEthiopianDate(value) ?? today;
              setVisibleMonth(current.month);
              setVisibleYear(current.year);
              if (popDirection === "auto" && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const spaceAbove = rect.top;
                const spaceBelow = window.innerHeight - rect.bottom;
                setAutoPlacement(
                  spaceAbove > 280 || spaceAbove >= spaceBelow ? "up" : "down",
                );
              }
            }
            setOpen((prev) => !prev);
          }
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs font-semibold outline-none flex items-center justify-between text-left transition-colors ${
          disabled
            ? "bg-slate-100 text-slate-500 cursor-not-allowed"
            : "hover:border-slate-400 focus:border-[#0A3C2F] focus:ring-1 focus:ring-[#0A3C2F]/20 cursor-pointer text-slate-900"
        }`}
      >
        <span
          className={
            value ? "truncate text-slate-900" : "truncate text-slate-400"
          }
        >
          {value || "DD-Month-YYYY"}
        </span>
        <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1.5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Ethiopian calendar"
          className={`absolute ${placementClass} z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl animate-in fade-in zoom-in-95`}
        >
          {/* Header Month / Year controls with interactive dropdowns */}
          <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-100">
            <button
              type="button"
              aria-label="Previous Ethiopian month"
              onClick={() => moveMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                aria-label="Select Ethiopian month"
                value={visibleMonth}
                onChange={(e) => setVisibleMonth(Number(e.target.value))}
                className="text-xs font-bold text-[#0A3C2F] bg-slate-100 hover:bg-slate-200/80 px-2 py-1 rounded-md border-0 outline-none cursor-pointer transition-colors"
              >
                {ETHIOPIAN_MONTHS.map((monthName, idx) => (
                  <option key={monthName} value={idx + 1}>
                    {monthName}
                  </option>
                ))}
              </select>

              <select
                aria-label="Select Ethiopian year"
                value={visibleYear}
                onChange={(e) => setVisibleYear(Number(e.target.value))}
                className="text-xs font-bold text-[#0A3C2F] bg-slate-100 hover:bg-slate-200/80 px-2 py-1 rounded-md border-0 outline-none cursor-pointer transition-colors"
              >
                {ETHIOPIAN_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              aria-label="Next Ethiopian month"
              onClick={() => moveMonth(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: leadingDays }, (_, idx) => (
              <span key={`empty-${idx}`} aria-hidden="true" />
            ))}

            {Array.from({ length: monthDays }, (_, idx) => idx + 1).map(
              (day) => {
                const isSelected =
                  parsedValue?.year === visibleYear &&
                  parsedValue.month === visibleMonth &&
                  parsedValue.day === day;
                const isToday =
                  today.year === visibleYear &&
                  today.month === visibleMonth &&
                  today.day === day;

                return (
                  <button
                    key={day}
                    type="button"
                    aria-label={`${day} ${ETHIOPIAN_MONTHS[visibleMonth - 1]} ${visibleYear}`}
                    onClick={() => {
                      onSelect({ day, month: visibleMonth, year: visibleYear });
                      setOpen(false);
                    }}
                    className={`flex h-7 w-full items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#0A3C2F] font-bold text-white shadow-xs"
                        : isToday
                          ? "border border-[#0A3C2F] font-bold text-[#0A3C2F] hover:bg-emerald-50"
                          : "hover:bg-slate-100 text-slate-700 font-medium"
                    }`}
                  >
                    {day}
                  </button>
                );
              },
            )}
          </div>

          {/* Bottom Actions: Clear & Today */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClear?.();
                setOpen(false);
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onSelect(today);
                setOpen(false);
              }}
              className="text-[11px] font-bold text-[#0A3C2F] hover:text-emerald-800 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
