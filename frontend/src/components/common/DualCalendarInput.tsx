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
  GREGORIAN_MONTHS,
  daysInEthiopianMonth,
  daysInGregorianMonth,
  ethiopianWeekday,
  gregorianWeekday,
  formatEthiopianDate,
  formatGregorianDate,
  gregorianToEthiopian,
  ethiopianToGregorian,
  gregorianToIso,
  parseEthiopianDate,
  parseGregorianDate,
  type EthiopianDate,
  type GregorianDate,
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
  const [gregOpen, setGregOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gregContainerRef = useRef<HTMLDivElement>(null);

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

  const parsedGregValue = parseGregorianDate(gregorianValue);
  const now = new Date();
  const todayGreg: GregorianDate = {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };

  const [gregVisibleMonth, setGregVisibleMonth] = useState(
    parsedGregValue?.month ?? todayGreg.month,
  );
  const [gregVisibleYear, setGregVisibleYear] = useState(
    parsedGregValue?.year ?? todayGreg.year,
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
      if (
        gregContainerRef.current &&
        !gregContainerRef.current.contains(event.target as Node)
      ) {
        setGregOpen(false);
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
    const parsed = parseGregorianDate(val);
    const isoVal = parsed ? gregorianToIso(parsed) : val;
    const converted = gregorianToEthiopian(isoVal);
    onChange(isoVal, converted ? formatEthiopianDate(converted) : "");
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

  function moveGregMonth(offset: number) {
    const monthIndex = gregVisibleMonth - 1 + offset;
    const yearOffset = Math.floor(monthIndex / 12);
    setGregVisibleYear((curr) => curr + yearOffset);
    setGregVisibleMonth((((monthIndex % 12) + 12) % 12) + 1);
  }

  const leadingDays = ethiopianWeekday(visibleYear, visibleMonth);
  const monthDays = daysInEthiopianMonth(visibleYear, visibleMonth);

  const gregLeadingDays = gregorianWeekday(gregVisibleYear, gregVisibleMonth);
  const gregMonthDays = daysInGregorianMonth(gregVisibleYear, gregVisibleMonth);
  const gregFormatted = parsedGregValue
    ? formatGregorianDate(parsedGregValue)
    : "";

  const GREG_YEARS = Array.from({ length: 51 }, (_, idx) => 2000 + idx);
  const gregYearsList = GREG_YEARS.includes(gregVisibleYear)
    ? GREG_YEARS
    : [...GREG_YEARS, gregVisibleYear].sort((a, b) => a - b);

  return (
    <div className="w-full">
      <label
        htmlFor={`${id}-gregorian`}
        className="mb-1.5 block text-xs font-semibold text-slate-800"
      >
        {label}{" "}
        {required && <span className="text-red-600 font-semibold">*</span>}
      </label>

      <div
        className={`flex items-end gap-2 border p-3 rounded-xl transition-colors ${
          errorMessage
            ? "border-red-400 bg-red-50/40"
            : "border-slate-300 bg-[#f0f3ff]"
        }`}
      >
        {/* Gregorian Side */}
        <div className="relative min-w-0 flex-1" ref={gregContainerRef}>
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Gregorian
          </span>
          <input
            type="hidden"
            id={`${id}-gregorian-value`}
            name={`${id}-gregorian`}
            value={gregorianValue || ""}
          />
          <button
            id={`${id}-gregorian`}
            type="button"
            onClick={() => {
              const current = parseGregorianDate(gregorianValue) ?? todayGreg;
              setGregVisibleMonth(current.month);
              setGregVisibleYear(current.year);
              setGregOpen((p) => !p);
            }}
            className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-400 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0A3C2F] cursor-pointer"
          >
            <span
              className={
                gregFormatted
                  ? "truncate"
                  : "truncate text-slate-400 font-normal"
              }
            >
              {gregFormatted || "DD-Month-YYYY"}
            </span>
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          </button>

          {/* Interactive Popover Dialog */}
          {gregOpen && (
            <div className="absolute bottom-full left-0 z-[100] mb-2 w-64 rounded-xl border border-slate-300 bg-white p-3 text-slate-700 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => moveGregMonth(-1)}
                  className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1">
                  <select
                    value={gregVisibleMonth}
                    onChange={(e) =>
                      setGregVisibleMonth(Number(e.target.value))
                    }
                    className="text-xs font-semibold text-[#0A3C2F] bg-slate-100 px-1 py-0.5 rounded border-0 outline-none cursor-pointer"
                  >
                    {GREGORIAN_MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={gregVisibleYear}
                    onChange={(e) => setGregVisibleYear(Number(e.target.value))}
                    className="text-xs font-semibold text-[#0A3C2F] bg-slate-100 px-1 py-0.5 rounded border-0 outline-none cursor-pointer"
                  >
                    {gregYearsList.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => moveGregMonth(1)}
                  className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-7 text-center text-[9px] font-semibold text-slate-400 uppercase">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="py-1">
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
                {Array.from({ length: gregLeadingDays }, (_, i) => (
                  <span key={`empty-greg-${i}`} />
                ))}
                {Array.from({ length: gregMonthDays }, (_, i) => i + 1).map(
                  (day) => {
                    const selected =
                      parsedGregValue?.year === gregVisibleYear &&
                      parsedGregValue.month === gregVisibleMonth &&
                      parsedGregValue.day === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const iso = gregorianToIso({
                            day,
                            month: gregVisibleMonth,
                            year: gregVisibleYear,
                          });
                          handleGregorianChange(iso);
                          setGregOpen(false);
                        }}
                        className={`h-7 rounded-lg transition-colors cursor-pointer ${
                          selected
                            ? "bg-[#0A3C2F] font-semibold text-white"
                            : "hover:bg-emerald-50 hover:text-[#0A3C2F] font-semibold text-slate-700"
                        }`}
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

        <ArrowRightLeft className="mb-2.5 h-4 w-4 text-slate-500 shrink-0" />

        {/* Ethiopian Side */}
        <div className="relative min-w-0 flex-1" ref={containerRef}>
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
            className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-400 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0A3C2F] cursor-pointer"
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
                <p className="text-xs font-semibold text-slate-900">
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

              <div className="mt-2 grid grid-cols-7 text-center text-[9px] font-semibold text-slate-400 uppercase">
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
                        className={`h-7 rounded-lg transition-colors cursor-pointer ${selected ? "bg-[#0A3C2F] font-semibold text-white" : "hover:bg-emerald-50 hover:text-[#0A3C2F] font-semibold text-slate-700"}`}
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
