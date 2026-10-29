import {
  deliveryStatus,
  isOverdue,
  projectNameLabels,
  type ExecutiveRecord,
} from "./model";

export const numericDate = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
export const contractRows = (rows: ExecutiveRecord[]) => [
  ...new Map(
    rows.filter((row) => row.contractId).map((row) => [row.contractId!, row]),
  ).values(),
];
export const activityRows = (rows: ExecutiveRecord[]) => [
  ...new Map(
    rows.filter((row) => row.activityId).map((row) => [row.activityId!, row]),
  ).values(),
];
export const progressValue = (row: ExecutiveRecord) =>
  row.completionPct !== null &&
  Number.isFinite(row.completionPct) &&
  row.completionPct >= 0 &&
  row.completionPct <= 100
    ? row.completionPct
    : null;
export function projectGroups(rows: ExecutiveRecord[]) {
  const labels = projectNameLabels(rows);
  const groups = new Map<
    string,
    { id: string; label: string; rows: ExecutiveRecord[] }
  >();
  for (const row of rows) {
    const id = row.projectId || "UNLINKED";
    const group = groups.get(id) || {
      id,
      label: labels.get(id) || row.project,
      rows: [],
    };
    group.rows.push(row);
    groups.set(id, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      count: contractRows(group.rows).length,
      progress: averageProgress(group.rows),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
export function averageProgress(rows: ExecutiveRecord[]) {
  const activities = activityRows(rows);
  const reported = activities
    .map(progressValue)
    .filter((value): value is number => value !== null);
  return {
    average: reported.length
      ? reported.reduce((sum, value) => sum + value, 0) / reported.length
      : null,
    reported: reported.length,
    total: activities.length,
  };
}
export function completionBreakdown(rows: ExecutiveRecord[]) {
  const contracts = contractRows(rows);
  const completed = contracts.filter((row) => row.complete === true).length;
  const incomplete = contracts.filter((row) => row.complete === false).length;
  const unknown = contracts.length - completed - incomplete;
  return {
    total: contracts.length,
    completed,
    incomplete,
    unknown,
    rate: contracts.length ? (completed / contracts.length) * 100 : null,
  };
}
export function financialByProject(rows: ExecutiveRecord[], currency: string) {
  return projectGroups(rows)
    .map((group) => {
      const activities = activityRows(group.rows).filter(
        (row) => row.estimateCurrency === currency && row.estimate !== null,
      );
      const contracts = contractRows(group.rows).filter(
        (row) => row.currency === currency && row.initialAmount !== null,
      );
      return {
        id: group.id,
        label: group.label,
        estimate: activities.length
          ? activities.reduce((sum, row) => sum + row.estimate!, 0)
          : null,
        amount: contracts.length
          ? contracts.reduce((sum, row) => sum + row.initialAmount!, 0)
          : null,
        contracts: contracts.length,
      };
    })
    .filter((group) => group.estimate !== null || group.amount !== null)
    .sort(
      (a, b) =>
        (b.amount ?? 0) - (a.amount ?? 0) ||
        (b.estimate ?? 0) - (a.estimate ?? 0),
    );
}
// One point per activity. Include all its contracts together or exclude the pair;
// never compare one activity's entire estimate to only one of its awards.
export function matchedCosts(rows: ExecutiveRecord[], currency: string) {
  return activityRows(rows).flatMap((activity) => {
    const contracts = contractRows(
      rows.filter((row) => row.activityId === activity.activityId),
    );
    if (
      !contracts.length ||
      (activity.activityContractCount !== undefined &&
        contracts.length !== activity.activityContractCount) ||
      activity.estimate === null ||
      activity.estimateCurrency !== currency ||
      contracts.some(
        (row) => row.currency !== currency || row.initialAmount === null,
      )
    )
      return [];
    const amount = contracts.reduce((sum, row) => sum + row.initialAmount!, 0);
    return [
      {
        id: activity.activityId!,
        label: activity.activityReference || activity.reference,
        project: activity.project,
        estimate: activity.estimate,
        amount,
        contracts: contracts.length,
        variance:
          activity.estimate > 0
            ? ((amount - activity.estimate) / activity.estimate) * 100
            : null,
      },
    ];
  });
}
export function matchedVariance(rows: ExecutiveRecord[], currency: string) {
  const pairs = matchedCosts(rows, currency);
  const estimate = pairs.reduce((sum, pair) => sum + pair.estimate, 0);
  const amount = pairs.reduce((sum, pair) => sum + pair.amount, 0);
  return {
    pairs,
    estimate,
    amount,
    variance:
      pairs.length && estimate > 0
        ? ((amount - estimate) / estimate) * 100
        : null,
  };
}
export function supplierValues(rows: ExecutiveRecord[], currency: string) {
  const values = new Map<
    string,
    { id: string; label: string; count: number; amount: number }
  >();
  for (const row of contractRows(rows))
    if (row.currency === currency && row.initialAmount !== null) {
      const label = row.supplier || "Supplier not recorded";
      const current = values.get(label) || {
        id: row.supplier || "UNRECORDED",
        label,
        count: 0,
        amount: 0,
      };
      current.amount += row.initialAmount;
      current.count++;
      values.set(label, current);
    }
  return [...values.values()].sort(
    (a, b) => b.amount - a.amount || a.label.localeCompare(b.label),
  );
}
export function procurementTimeline(rows: ExecutiveRecord[], asOf: string) {
  const now = new Date(asOf);
  const end = asOf.slice(0, 10);
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1),
    );
    return {
      month: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      invitation: 0,
      opening: 0,
      signed: 0,
      signedAmount: 0,
    };
  });
  const series = {
    invitation: { recorded: 0, future: 0 },
    opening: { recorded: 0, future: 0 },
    signed: { recorded: 0, future: 0 },
  };
  const add = (
    kind: "invitation" | "opening" | "signed",
    value: string | null,
  ) => {
    if (numericDate(value) === null || !value) return;
    if (value.slice(0, 10) > end) {
      series[kind].future++;
      return;
    }
    series[kind].recorded++;
    const month = months.find((item) => item.month === value.slice(0, 7));
    if (month) month[kind]++;
  };
  for (const row of activityRows(rows)) {
    add("invitation", row.invitationDate);
    add("opening", row.bidOpeningDate);
  }
  for (const row of contractRows(rows)) add("signed", row.signedDate);
  return { months, series };
}
export function signingAmounts(
  rows: ExecutiveRecord[],
  currency: string,
  asOf: string,
) {
  const timeline = procurementTimeline(rows, asOf);
  const months = timeline.months.map((month) => ({
    ...month,
    amount: 0,
    count: 0,
  }));
  for (const row of contractRows(rows)) {
    if (
      row.currency !== currency ||
      row.initialAmount === null ||
      !row.signedDate ||
      numericDate(row.signedDate) === null ||
      row.signedDate.slice(0, 10) > asOf.slice(0, 10)
    )
      continue;
    const month = months.find(
      (item) => item.month === row.signedDate!.slice(0, 7),
    );
    if (month) {
      month.amount += row.initialAmount;
      month.count++;
    }
  }
  return months;
}
export function deadlineRows(rows: ExecutiveRecord[], asOf: string) {
  return contractRows(rows)
    .map((row) => {
      const start = numericDate(row.startDate);
      const signed = numericDate(row.signedDate);
      const initial = numericDate(row.initialCompletionDate);
      const due = numericDate(
        row.revisedCompletionDate || row.initialCompletionDate,
      );
      return {
        row,
        start: start ?? signed,
        startBasis:
          start !== null
            ? "Implementation start"
            : signed !== null
              ? "Signature date proxy"
              : "Start not recorded",
        initial,
        due,
        overdue: isOverdue(row, asOf),
        status: deliveryStatus(row, asOf),
        valid:
          due !== null &&
          (start ?? signed) !== null &&
          due >= (start ?? signed)!,
      };
    })
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        (a.due ?? Infinity) - (b.due ?? Infinity),
    );
}
export function cycleTimes(rows: ExecutiveRecord[], asOf: string) {
  const values = contractRows(rows).flatMap((row) => {
    const signed = numericDate(row.signedDate);
    const invitation = numericDate(row.invitationDate);
    const opening = numericDate(row.bidOpeningDate);
    if (signed === null || row.signedDate!.slice(0, 10) > asOf.slice(0, 10))
      return [];
    return [
      {
        invitationDays:
          invitation !== null && invitation <= signed
            ? (signed - invitation) / 86400000
            : null,
        openingDays:
          opening !== null && opening <= signed
            ? (signed - opening) / 86400000
            : null,
      },
    ];
  });
  const average = (key: "invitationDays" | "openingDays") => {
    const known = values
      .map((row) => row[key])
      .filter((value): value is number => value !== null);
    return {
      value: known.length
        ? known.reduce((sum, value) => sum + value, 0) / known.length
        : null,
      count: known.length,
    };
  };
  return {
    invitation: average("invitationDays"),
    opening: average("openingDays"),
  };
}
