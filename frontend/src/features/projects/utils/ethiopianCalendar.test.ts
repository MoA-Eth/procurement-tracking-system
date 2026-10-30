import { describe, expect, it } from "vitest";
import {
  daysInEthiopianMonth,
  ethiopianToGregorian,
  formatDualCalendarDate,
  formatGregorianDate,
  gregorianToEthiopian,
  parseGregorianDate,
} from "./ethiopianCalendar";

describe("Ethiopian calendar conversion", () => {
  it("converts the reference Hamle date in both directions", () => {
    expect(ethiopianToGregorian(2016, 11, 1)).toBe("2024-07-08");
    expect(gregorianToEthiopian("2024-07-08")).toEqual({
      day: 1,
      month: 11,
      year: 2016,
    });
  });

  it("converts the reference Sene date in both directions", () => {
    expect(ethiopianToGregorian(2016, 10, 30)).toBe("2024-07-07");
    expect(gregorianToEthiopian("2024-07-07")).toEqual({
      day: 30,
      month: 10,
      year: 2016,
    });
  });

  it("supports Pagumen in Ethiopian leap years", () => {
    expect(daysInEthiopianMonth(2015, 13)).toBe(6);
    expect(daysInEthiopianMonth(2016, 13)).toBe(5);
    expect(ethiopianToGregorian(2015, 13, 6)).toBe("2023-09-11");
  });

  it("formats Gregorian dates in day/month/year format", () => {
    expect(formatGregorianDate("2026-10-04")).toBe("04/10/2026");
    expect(formatGregorianDate("2024-07-08")).toBe("08/07/2024");
    expect(formatGregorianDate("2026-06-01")).toBe("01/06/2026");
    expect(formatGregorianDate("2026-10-30T00:00:00.000Z")).toBe("30/10/2026");

    expect(parseGregorianDate("04/10/2026")).toEqual({
      day: 4,
      month: 10,
      year: 2026,
    });
    expect(parseGregorianDate("24-Meskerem-2019")).toBeNull();
    expect(parseGregorianDate("04-Oct-2026")).toEqual({
      day: 4,
      month: 10,
      year: 2026,
    });
  });

  it("formats activity dates with both Gregorian and Ethiopian calendars", () => {
    expect(formatDualCalendarDate("2026-10-30T00:00:00.000Z")).toBe(
      "30/10/2026 (20-Tikimt-2019)",
    );
    expect(formatDualCalendarDate("2026-07-25", "18-Hamle-2018")).toBe(
      "25/07/2026 (18-Hamle-2018)",
    );
    expect(formatDualCalendarDate(null, "20-Tikimt-2019")).toBe(
      "30/10/2026 (20-Tikimt-2019)",
    );
  });
});
