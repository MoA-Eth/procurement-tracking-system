import { describe, expect, it } from "vitest";
import {
  averageProgress,
  completionBreakdown,
  cycleTimes,
  deadlineRows,
  financialByProject,
  projectGroups,
  matchedCosts,
  matchedVariance,
  procurementTimeline,
  signingAmounts,
  supplierValues,
} from "./visualizations";
import { EMPTY_FILTERS, filterRecords, type ExecutiveRecord } from "./model";

const asOf = "2026-10-15T10:00:00Z";
const base: ExecutiveRecord = {
  id: "c1",
  contractId: "c1",
  activityId: "a1",
  activityContractCount: 1,
  reference: "W-001",
  description: "Works",
  projectId: "p1",
  project: "Project one",
  itemType: "WORKS",
  sourceCategory: "WORKS",
  estimate: 100,
  estimateCurrency: "ETB",
  currency: "ETB",
  invitationDate: "2026-08-01T00:00:00Z",
  bidOpeningDate: "2026-08-10T00:00:00Z",
  signedDate: "2026-08-20T00:00:00Z",
  startDate: "2026-09-01T00:00:00Z",
  supplier: "Supplier A",
  country: "Ethiopia",
  initialAmount: 120,
  initialCompletionDate: "2026-10-01T00:00:00Z",
  revisedCompletionDate: null,
  actualCompletionDate: null,
  complete: false,
  completionPct: 40,
  status: "ACTIVE",
};
describe("proposal visualization measurements", () => {
  it("keeps separate project records with duplicate names identifiable", () => {
    const groups = projectGroups([
      base,
      {
        ...base,
        id: "c2",
        contractId: "c2",
        activityId: "a2",
        projectId: "p2",
      },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.label)).toContain(
      "Project one (record p1)",
    );
    expect(groups.map((group) => group.label)).toContain(
      "Project one (record p2)",
    );
    expect(groups.map((group) => group.count)).toEqual([1, 1]);
  });
  it("deduplicates contract counts, activity estimates and progress at their own grains", () => {
    const second = { ...base, id: "c2", contractId: "c2" };
    expect(
      averageProgress([
        base,
        second,
        {
          ...base,
          id: "a2",
          activityId: "a2",
          contractId: null,
          completionPct: null,
        },
      ]),
    ).toEqual({ average: 40, reported: 1, total: 2 });
    expect(financialByProject([base, second], "ETB")[0]).toMatchObject({
      estimate: 100,
      amount: 240,
      contracts: 2,
    });
    expect(
      completionBreakdown([base, base, { ...second, complete: true }]),
    ).toMatchObject({ total: 2, completed: 1, incomplete: 1, rate: 50 });
  });
  it("keeps currencies separate and includes unawarded estimates only in portfolio comparisons", () => {
    const unawarded = {
      ...base,
      id: "pending",
      activityId: "a2",
      contractId: null,
      initialAmount: null,
      estimate: 900,
    };
    const usd = {
      ...base,
      id: "usd",
      contractId: "usd",
      activityId: "usd",
      currency: "USD",
      estimateCurrency: "USD",
      estimate: 5,
      initialAmount: 10,
    };
    expect(financialByProject([base, unawarded, usd], "ETB")[0]).toMatchObject({
      estimate: 1000,
      amount: 120,
    });
    expect(matchedVariance([base, unawarded, usd], "ETB")).toMatchObject({
      estimate: 100,
      amount: 120,
      variance: 20,
    });
    expect(matchedVariance([usd], "USD").variance).toBe(100);
  });
  it("excludes mixed-currency or partially filtered awards from matched cost variance", () => {
    const first = { ...base, activityContractCount: 2 };
    const second = { ...first, id: "c2", contractId: "c2", currency: "USD" };
    expect(matchedCosts([first], "ETB")).toEqual([]);
    expect(matchedCosts([first, second], "ETB")).toEqual([]);
    expect(
      matchedCosts([first, { ...second, currency: "ETB" }], "ETB")[0],
    ).toMatchObject({ estimate: 100, amount: 240, contracts: 2 });
  });
  it("does not turn missing progress, zero estimates or unknown completion into false performance", () => {
    expect(
      averageProgress([{ ...base, completionPct: null }]).average,
    ).toBeNull();
    expect(averageProgress([{ ...base, completionPct: 0 }]).average).toBe(0);
    expect(
      averageProgress([{ ...base, completionPct: 101 }]).average,
    ).toBeNull();
    expect(
      matchedVariance([{ ...base, estimate: 0 }], "ETB").variance,
    ).toBeNull();
    expect(completionBreakdown([{ ...base, complete: null }])).toMatchObject({
      completed: 0,
      incomplete: 0,
      unknown: 1,
    });
    expect(completionBreakdown([]).rate).toBeNull();
  });
  it("keeps true calendar months, deduplicates activity events and excludes future signatures", () => {
    const data = procurementTimeline(
      [
        base,
        {
          ...base,
          id: "future",
          contractId: "future",
          signedDate: "2026-10-23T00:00:00Z",
        },
      ],
      asOf,
    );
    expect(data.months).toHaveLength(12);
    expect(data.months[0]?.month).toBe("2025-11");
    expect(data.months.at(-1)?.month).toBe("2026-10");
    expect(
      data.months.find((month) => month.month === "2026-08"),
    ).toMatchObject({ invitation: 1, opening: 1, signed: 1 });
    expect(data.series.signed).toEqual({ recorded: 1, future: 1 });
    const amounts = signingAmounts(
      [base, { ...base, id: "usd", contractId: "usd", currency: "USD" }],
      "ETB",
      asOf,
    );
    expect(amounts.find((month) => month.month === "2026-08")).toMatchObject({
      amount: 120,
      count: 1,
    });
  });
  it("distinguishes absent milestone dates from real zero-event months", () => {
    const data = procurementTimeline(
      [
        {
          ...base,
          invitationDate: null,
          bidOpeningDate: null,
          signedDate: null,
        },
      ],
      asOf,
    );
    expect(data.series).toEqual({
      invitation: { recorded: 0, future: 0 },
      opening: { recorded: 0, future: 0 },
      signed: { recorded: 0, future: 0 },
    });
  });
  it("uses implementation start and revised targets, and flags signature proxies or invalid schedules", () => {
    expect(deadlineRows([base], asOf)[0]).toMatchObject({
      start: Date.parse(base.startDate!),
      startBasis: "Implementation start",
      valid: true,
      overdue: true,
    });
    expect(
      deadlineRows(
        [
          {
            ...base,
            startDate: null,
            revisedCompletionDate: "2026-11-01T00:00:00Z",
          },
        ],
        asOf,
      )[0],
    ).toMatchObject({ startBasis: "Signature date proxy", overdue: false });
    expect(
      deadlineRows([{ ...base, startDate: null, signedDate: null }], asOf)[0],
    ).toMatchObject({ startBasis: "Start not recorded", valid: false });
    expect(
      deadlineRows(
        [{ ...base, initialCompletionDate: "2026-01-01T00:00:00Z" }],
        asOf,
      )[0]?.valid,
    ).toBe(false);
  });
  it("calculates processing times only for ordered dates and excludes future signatures", () => {
    expect(cycleTimes([base], asOf)).toEqual({
      invitation: { value: 19, count: 1 },
      opening: { value: 10, count: 1 },
    });
    expect(
      cycleTimes([{ ...base, signedDate: "2026-10-23T00:00:00Z" }], asOf)
        .invitation.value,
    ).toBeNull();
    expect(
      cycleTimes([{ ...base, invitationDate: "2026-09-01T00:00:00Z" }], asOf)
        .invitation.value,
    ).toBeNull();
  });
  it("groups supplier commitments by selected currency and supports supplier/date filters", () => {
    expect(
      supplierValues(
        [base, { ...base, id: "usd", contractId: "usd", currency: "USD" }],
        "ETB",
      ),
    ).toEqual([
      { id: "Supplier A", label: "Supplier A", count: 1, amount: 120 },
    ]);
    expect(
      filterRecords(
        [base],
        {
          ...EMPTY_FILTERS,
          supplier: "Supplier A",
          signingYear: "2026",
          completionYear: "2026",
        },
        asOf,
      ),
    ).toEqual([base]);
    expect(
      filterRecords([base], { ...EMPTY_FILTERS, signingYear: "2025" }, asOf),
    ).toEqual([]);
    expect(
      filterRecords(
        [base],
        { ...EMPTY_FILTERS, supplier: "Other supplier" },
        asOf,
      ),
    ).toEqual([]);
  });
});
