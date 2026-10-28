const NUMBER_WITH_GROUPING_PATTERN =
  /^-?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/;

export function parseNumberWithCommas(
  value: string | number | undefined,
): number {
  if (value === undefined) return Number.NaN;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  const trimmed = value.trim();
  if (!NUMBER_WITH_GROUPING_PATTERN.test(trimmed)) return Number.NaN;

  return Number(trimmed.replace(/,/g, ""));
}

export function formatNumberWithCommas(value: string): string {
  const parsed = parseNumberWithCommas(value);
  if (!Number.isFinite(parsed)) return value;

  const normalized = value.trim().replace(/,/g, "");
  const [integerPart, fractionalPart] = normalized.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return fractionalPart === undefined
    ? groupedInteger
    : `${groupedInteger}.${fractionalPart}`;
}
