"use client";

import { useState, useRef, useEffect } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Info,
} from "lucide-react";
import {
  ETHIOPIAN_MONTHS,
  daysInEthiopianMonth,
  ethiopianWeekday,
  formatEthiopianDate,
  gregorianToEthiopian,
  ethiopianToGregorian,
  parseEthiopianDate,
  type EthiopianDate,
} from "@/features/projects/utils/ethiopianCalendar";

export interface DualCalendarInputProps {
  id: string;
  label: string;
  gregorianValue: string;
  ethiopianValue: string;
  onChange: (gregorianValue: string, ethiopianValue: string) => void;
  errorMessage?: string;
  required?: boolean;
}

export function DualCalendarInput({
  id,
  label,
  gregorianValue,
  ethiopianValue,
  onChange,
  errorMessage,
  required = false,
}: DualCalendarInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedValue = parseEthiopianDate(ethiopianValue);
  const todayEth = gregorianToEthiopian(
    new Date().toISOString().slice(0, 10),
  ) ?? {
    day: 1,
    month: 1,
    year: 2017,
  };

  const [visibleMonth, setVisibleMonth] = useState(
    parsedValue?.month ?? todayEth.month,
  );
  const [visibleYear, setVisibleYear] = useState(
    parsedValue?.year ?? todayEth.year,
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleGregorianChange(val: string) {
    if (!val) {
      onChange("", "");
      return;
    }
    const converted = gregorianToEthiopian(val);
    onChange(val, converted ? formatEthiopianDate(converted) : "");
  }

  function handleEthiopianSelect(val: EthiopianDate) {
    onChange(
      ethiopianToGregorian(val.year, val.month, val.day),
      formatEthiopianDate(val),
    );
    setOpen(false);
  }

  function moveMonth(offset: number) {
    const monthIndex = visibleMonth - 1 + offset;
    const yearOffset = Math.floor(monthIndex / 13);
    setVisibleYear((curr) => curr + yearOffset);
    setVisibleMonth((((monthIndex % 13) + 13) % 13) + 1);
  }

  const leadingDays = ethiopianWeekday(visibleYear, visibleMonth);
  const monthDays = daysInEthiopianMonth(visibleYear, visibleMonth);

  return (
    <div className="w-full">
      <label
        htmlFor={`${id}-gregorian`}
        className="mb-1.5 block text-xs font-bold text-slate-800"
      >
        {label} {required && <span className="text-red-600 font-bold">*</span>}
      </label>

      <div className="flex items-end gap-2 border border-slate-300 bg-[#f0f3ff] p-3 rounded-xl">
        {/* Gregorian Side */}
        <div className="min-w-0 flex-1">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Gregorian
          </span>
          <input
            id={`${id}-gregorian`}
            type="date"
            value={gregorianValue}
            onChange={(e) => handleGregorianChange(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-400 bg-white px-2.5 text-xs text-slate-900 font-semibold outline-none focus:border-[#176c55]"
          />
        </div>

        <ArrowRightLeft className="mb-2.5 h-4 w-4 text-slate-500 shrink-0" />

        {/* Ethiopian Side */}
        <div className="relative min-w-0 flex-1" ref={containerRef}>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Ethiopian
          </span>
          <button
            type="button"
            onClick={() => {
              const current = parseEthiopianDate(ethiopianValue) ?? todayEth;
              setVisibleMonth(current.month);
              setVisibleYear(current.year);
              setOpen((p) => !p);
            }}
            className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-400 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#176c55] cursor-pointer"
          >
            <span
              className={
                ethiopianValue
                  ? "truncate"
                  : "truncate text-slate-400 font-normal"
              }
            >
              {ethiopianValue || "Select Ethiopian date"}
            </span>
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          </button>

          {/* Interactive Popover Dialog */}
          {open && (
            <div className="absolute bottom-full right-0 z-[100] mb-2 w-64 rounded-xl border border-slate-300 bg-white p-3 text-slate-700 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-xs font-bold text-slate-900">
                  {ETHIOPIAN_MONTHS[visibleMonth - 1]} {visibleYear}
                </p>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-7 text-center text-[9px] font-extrabold text-slate-400 uppercase">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="py-1">
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
                {Array.from({ length: leadingDays }, (_, i) => (
                  <span key={`empty-${i}`} />
                ))}
                {Array.from({ length: monthDays }, (_, i) => i + 1).map(
                  (day) => {
                    const selected =
                      parsedValue?.year === visibleYear &&
                      parsedValue.month === visibleMonth &&
                      parsedValue.day === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          handleEthiopianSelect({
                            day,
                            month: visibleMonth,
                            year: visibleYear,
                          })
                        }
                        className={`h-7 rounded-lg transition-colors cursor-pointer ${selected ? "bg-[#176c55] font-bold text-white" : "hover:bg-emerald-50 hover:text-[#176c55] font-semibold text-slate-700"}`}
                      >
                        {day}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600 font-medium">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {errorMessage}
        </p>
      )}
    </div>
  );
}
