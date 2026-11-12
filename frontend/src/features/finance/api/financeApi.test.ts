import { describe, expect, it } from "vitest";
import {
  formatEtb,
  buildSmsPreview,
  normalizeEthiopianPhone,
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
} from "./financeApi";

describe("financeApi utilities", () => {
  it("formats ETB currency amounts with commas and decimals", () => {
    expect(formatEtb(20000000)).toBe("20,000,000.00");
    expect(formatEtb("25450000.5")).toBe("25,450,000.50");
    expect(formatEtb(0)).toBe("0.00");
    expect(formatEtb("invalid")).toBe("0");
  });

  it("builds formatted SMS preview message exceeding threshold", () => {
    const preview = buildSmsPreview(
      25000000,
      "Ethio Telecom",
      "VOUCH-2026-001",
      "PROCUREMENT_GOODS",
    );
    expect(preview).toContain("[MoA Alert] High-Value Disbursement: ETB 25,000,000");
    expect(preview).toContain("paid to Ethio Telecom (Procurement / Goods & Supplies)");
    expect(preview).toContain("Ref: VOUCH-2026-001");
    expect(preview).toContain("Approve via Finance Portal.");
  });

  it("contains all expected disbursement categories and payment methods", () => {
    expect(CATEGORY_LABELS.PROCUREMENT_GOODS).toBe("Procurement / Goods & Supplies");
    expect(CATEGORY_LABELS.CONTRACTOR_WORKS).toBe("Contractor & Construction Works");
    expect(CATEGORY_LABELS.PROJECT_GRANT).toBe("Project / Grant Disbursement");
    expect(CATEGORY_LABELS.OPERATIONAL_ADMIN).toBe("Operational & Administrative");
    expect(CATEGORY_LABELS.OTHER_GENERAL).toBe("Other General Ministry Payment");

    expect(PAYMENT_METHOD_LABELS.BANK_TRANSFER).toBe("Bank Transfer");
    expect(PAYMENT_METHOD_LABELS.CHEQUE_CPO).toBe("Cheque (CPO)");
    expect(PAYMENT_METHOD_LABELS.CASH).toBe("Cash");
  });

  it("normalizes Ethiopian phone numbers to +251 format", () => {
    expect(normalizeEthiopianPhone("0911234567")).toBe("+251911234567");
    expect(normalizeEthiopianPhone("0712 345 678")).toBe("+251712345678");
    expect(normalizeEthiopianPhone("251911234567")).toBe("+251911234567");
    expect(normalizeEthiopianPhone(" +251 911 234 567 ")).toBe("+251911234567");
    expect(normalizeEthiopianPhone("   ")).toBe("");
  });
});

