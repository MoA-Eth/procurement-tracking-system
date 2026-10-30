import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  deliveryStatus,
  filterRecords,
  isOverdue,
  registerCsv,
  registerCells,
  REGISTER_COLUMNS,
  displayDate,
  summarize,
  type ExecutiveRecord,
} from "./model";

const asOf = "2026-10-15T10:00:00Z";
const row: ExecutiveRecord = {
  id: "contract:1",
  activityId: "activity:1",
  contractId: "1",
  reference: "W-001",
  description: "Construction",
  projectId: "p1",
  project: "Project one",
  itemType: "WORKS",
  sourceCategory: "Works",
  estimate: 150,
  estimateCurrency: "ETB",
  currency: "ETB",
  invitationDate: null,
  bidOpeningDate: null,
  signedDate: null,
  supplier: "Builder",
  country: "Ethiopia",
  initialAmount: 100,
  initialCompletionDate: "2026-10-01T00:00:00Z",
  revisedCompletionDate: null,
  actualCompletionDate: null,
  complete: false,
  completionPct: null,
  status: "ACTIVE",
};

describe("executive measurements", () => {
  it("uses zero-padded mm/dd/yy dates in UTC and labels missing or invalid dates", () => {
    expect(displayDate("2026-01-05T00:00:00Z")).toBe("01/05/26");
    expect(displayDate("2026-10-23T00:00:00Z")).toBe("10/23/26");
    expect(displayDate("2026-10-01T01:00:00+03:00")).toBe("09/30/26");
    expect(displayDate(null)).toBe("Not recorded");
    expect(displayDate("invalid")).toBe("Invalid date");
  });
  it("maps all 13 workbook columns in the same order as the on-screen register", () => {
    const values = registerCells(
      { ...row, signedDate: "2026-10-23T00:00:00Z" },
      16,
    );
    expect(REGISTER_COLUMNS).toHaveLength(13);
    expect(values).toHaveLength(13);
    expect(values[0]).toBe("16");
    expect(values[1]).toBe("W-001");
    expect(values[4]).toBe("150 ETB");
    expect(values[5]).toBe("Not recorded");
    expect(values[6]).toBe("Not recorded");
    expect(values[7]).toBe("10/23/26");
    expect(values[8]).toBe("Builder; Supplier country not available");
    expect(values[8]).not.toContain("Ethiopia");
    expect(values[9]).toBe("100 ETB");
    expect(values[10]).toBe("10/01/26");
    expect(values[11]).toBe("No");
    expect(values[12]).toBe("Not reported");
  });
  it("distinguishes pre-contract fields from missing values and preserves measured zeros", () => {
    const values = registerCells(
      {
        ...row,
        contractId: null,
        complete: null,
        estimate: 0,
        completionPct: 0,
        initialAmount: null,
      },
      1,
    );
    expect(values[1]).toContain("Activity: W-001 (no contract)");
    expect(values[4]).toBe("0 ETB");
    expect(values[7]).toBe("Not applicable (pre-contract)");
    expect(values[9]).toBe("Not applicable (pre-contract)");
    expect(values[10]).toBe("Not applicable (pre-contract)");
    expect(values[11]).toBe("Not applicable (pre-contract)");
    expect(values[12]).toBe("0%");
    expect(
      registerCells({ ...row, estimate: null, initialAmount: null }, 1)[4],
    ).toBe("Not recorded");
  });
  it("exports the same 13 headings, date format and explicit missing labels", () => {
    const csv = registerCsv([{ ...row, signedDate: "2026-10-23T00:00:00Z" }]);
    expect(csv.split("\r\n")[0]).toBe(
      "\uFEFF" + REGISTER_COLUMNS.map((value) => '"' + value + '"').join(","),
    );
    expect(csv).toContain('"10/23/26"');
    expect(csv).toContain('"Not recorded"');
    expect(csv).toContain('"Not reported"');
    expect(csv).not.toContain("2026-10-23");
  });
  it("separates currencies and counts each activity estimate once across multiple contracts", () => {
    const result = summarize(
      [
        row,
        { ...row, id: "contract:2", contractId: "2", initialAmount: 200 },
        {
          ...row,
          id: "contract:3",
          contractId: "3",
          activityId: "activity:2",
          estimateCurrency: "USD",
          currency: "USD",
          initialAmount: 10,
        },
      ],
      asOf,
    );
    expect(result.amounts).toEqual([
      ["ETB", 300],
      ["USD", 10],
    ]);
    expect(result.estimates).toEqual([
      ["ETB", 150],
      ["USD", 150],
    ]);
    expect(result.activities).toBe(2);
    expect(result.contracts).toBe(3);
  });
  it("uses the revised date, excludes closed contracts, and does not flag items due today", () => {
    expect(isOverdue(row, asOf)).toBe(true);
    expect(
      isOverdue(
        { ...row, revisedCompletionDate: "2026-10-20T00:00:00Z" },
        asOf,
      ),
    ).toBe(false);
    expect(
      isOverdue(
        { ...row, initialCompletionDate: "2026-10-15T00:00:00Z" },
        asOf,
      ),
    ).toBe(false);
    for (const status of ["CANCELLED", "TERMINATED", "COMPLETED"])
      expect(isOverdue({ ...row, status }, asOf)).toBe(false);
    expect(isOverdue({ ...row, complete: true }, asOf)).toBe(false);
    expect(isOverdue({ ...row, initialCompletionDate: null }, asOf)).toBe(
      false,
    );
  });
  it("keeps missing progress, currency and classification visible", () => {
    const missing = {
      ...row,
      currency: null,
      itemType: "UNCLASSIFIED" as const,
    };
    const result = summarize([missing], asOf);
    expect(result.amounts).toEqual([["Unspecified", 100]]);
    expect(result.missingProgress).toBe(1);
    expect(
      filterRecords(
        [missing],
        { ...EMPTY_FILTERS, itemType: "UNCLASSIFIED", currency: "UNSPECIFIED" },
        asOf,
      ),
    ).toEqual([missing]);
  });
  it("intersects all filters against the same records", () => {
    const goods = {
      ...row,
      id: "goods",
      projectId: "p2",
      itemType: "GOODS" as const,
      supplier: "Supplier B",
    };
    const filters = {
      ...EMPTY_FILTERS,
      itemType: "WORKS",
      project: "p1",
      currency: "ETB",
      status: "Overdue",
      search: "builder",
    };
    expect(filterRecords([row, goods], filters, asOf)).toEqual([row]);
    expect(
      filterRecords([row, goods], { ...filters, currency: "USD" }, asOf),
    ).toEqual([]);
    expect(filterRecords([row, goods], EMPTY_FILTERS, asOf)).toHaveLength(2);
  });
  it("keeps pre-contract items out of contract values and completion counts", () => {
    const pending = {
      ...row,
      id: "activity:1",
      contractId: null,
      initialAmount: null,
      complete: null,
    };
    expect(deliveryStatus(pending, asOf)).toBe("Pre-contract");
    expect(summarize([pending], asOf)).toMatchObject({
      contracts: 0,
      completed: 0,
      overdue: 0,
      preContract: 1,
      amounts: [],
    });
  });
  it("exports only the selected population and neutralizes spreadsheet formula text", () => {
    const selected = filterRecords(
      [row, { ...row, id: "excluded", currency: "USD" }],
      { ...EMPTY_FILTERS, currency: "ETB" },
      asOf,
    );
    const csv = registerCsv(
      selected.map((item) => ({ ...item, description: '=HYPERLINK("bad")' })),
    );
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("% Completion (reported activity)");
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).not.toContain('"USD"');
  });
});
