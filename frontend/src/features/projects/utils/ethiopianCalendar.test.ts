import { describe, expect, it } from "vitest";
import {
  daysInEthiopianMonth,
  ethiopianToGregorian,
  gregorianToEthiopian,
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
});
