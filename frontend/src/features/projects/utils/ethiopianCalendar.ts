export const ETHIOPIAN_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagumen",
] as const;

export interface EthiopianDate {
  day: number;
  month: number;
  year: number;
}

export function daysInEthiopianMonth(year: number, month: number) {
  if (month >= 1 && month <= 12) return 30;
  if (month === 13) return year % 4 === 3 ? 6 : 5;
  throw new RangeError("Ethiopian month must be between 1 and 13.");
}

export function formatEthiopianDate({ day, month, year }: EthiopianDate) {
  assertValidEthiopianDate(year, month, day);
  return `${String(day).padStart(2, "0")}-${ETHIOPIAN_MONTHS[month - 1]}-${year}`;
}

export function parseEthiopianDate(value: string): EthiopianDate | null {
  const match = /^(\d{1,2})-([A-Za-z]+)-(\d{1,4})$/.exec(value.trim());
  if (!match) return null;

  const month = ETHIOPIAN_MONTHS.findIndex(
    (name) => name.toLowerCase() === match[2].toLowerCase(),
  );
  if (month === -1) return null;

  const parsed = {
    day: Number(match[1]),
    month: month + 1,
    year: Number(match[3]),
  };

  try {
    assertValidEthiopianDate(parsed.year, parsed.month, parsed.day);
    return parsed;
  } catch {
    return null;
  }
}

import {
  toGregorian as pkgToGregorian,
  toEthiopian as pkgToEthiopian,
} from "ethiopian-date";

export function ethiopianToGregorian(year: number, month: number, day: number) {
  assertValidEthiopianDate(year, month, day);
  const [gYear, gMonth, gDay] = pkgToGregorian([year, month, day]);
  const mm = String(gMonth).padStart(2, "0");
  const dd = String(gDay).padStart(2, "0");
  return `${gYear}-${mm}-${dd}`;
}

export function gregorianToEthiopian(isoDate: string): EthiopianDate | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!parts) return null;

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  const [eYear, eMonth, eDay] = pkgToEthiopian([year, month, day]);
  return { year: eYear, month: eMonth, day: eDay };
}

export function ethiopianWeekday(year: number, month: number, day = 1) {
  const isoDate = ethiopianToGregorian(year, month, day);
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

function assertValidEthiopianDate(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError("Ethiopian year must be a positive integer.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 13) {
    throw new RangeError("Ethiopian month must be between 1 and 13.");
  }
  const maximumDay = daysInEthiopianMonth(year, month);
  if (!Number.isInteger(day) || day < 1 || day > maximumDay) {
    throw new RangeError(`Day must be between 1 and ${maximumDay}.`);
  }
}
