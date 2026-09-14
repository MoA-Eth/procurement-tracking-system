import type {
  OfficerProject,
  ProcurementCategory,
  ProcurementPlanSummary,
} from "./officerProjects";

export type ProcurementActivityCategory = ProcurementCategory;

export type ProcurementMethodKey =
  | "rfb-international"
  | "rfb-national"
  | "rfq-shopping"
  | "direct"
  | "un-agency"
  | "qcbs"
  | "fbs"
  | "lcs"
  | "cqs"
  | "indv";

export interface ProcurementMethodOption {
  appliesTo: readonly ProcurementActivityCategory[];
  key: ProcurementMethodKey;
  label: string;
  roadmap:
    "rfb" | "rfq" | "direct" | "un" | "consulting" | "cqs" | "individual";
}

export interface RoadmapStageTemplate {
  allowNotApplicable?: boolean;
  name: string;
}

const nonConsultingCategories: readonly ProcurementActivityCategory[] = [
  "Goods",
  "Works",
  "Non-Consulting Services",
];

export const procurementMethodOptions: readonly ProcurementMethodOption[] = [
  {
    appliesTo: nonConsultingCategories,
    key: "rfb-international",
    label: "RFB - International",
    roadmap: "rfb",
  },
  {
    appliesTo: nonConsultingCategories,
    key: "rfb-national",
    label: "RFB - National",
    roadmap: "rfb",
  },
  {
    appliesTo: nonConsultingCategories,
    key: "rfq-shopping",
    label: "RFQ / Shopping",
    roadmap: "rfq",
  },
  {
    appliesTo: [
      "Goods",
      "Works",
      "Non-Consulting Services",
      "Consultancy Services",
    ],
    key: "direct",
    label: "Direct Procurement / Direct Selection",
    roadmap: "direct",
  },
  {
    appliesTo: [
      "Goods",
      "Works",
      "Non-Consulting Services",
      "Consultancy Services",
    ],
    key: "un-agency",
    label: "UN Agency / UNOPS Direct",
    roadmap: "un",
  },
  {
    appliesTo: ["Consultancy Services"],
    key: "qcbs",
    label: "QCBS",
    roadmap: "consulting",
  },
  {
    appliesTo: ["Consultancy Services"],
    key: "fbs",
    label: "FBS",
    roadmap: "consulting",
  },
  {
    appliesTo: ["Consultancy Services"],
    key: "lcs",
    label: "LCS",
    roadmap: "consulting",
  },
  {
    appliesTo: ["Consultancy Services"],
    key: "cqs",
    label: "CQS",
    roadmap: "cqs",
  },
  {
    appliesTo: ["Consultancy Services"],
    key: "indv",
    label: "Individual Consultant (INDV)",
    roadmap: "individual",
  },
];

const roadmapTemplates: Record<
  ProcurementMethodOption["roadmap"],
  readonly RoadmapStageTemplate[]
> = {
  rfb: [
    { name: "Draft Pre-qualification Documents", allowNotApplicable: true },
    {
      name: "Specific Procurement Notice (prequalification)",
      allowNotApplicable: true,
    },
    {
      name: "Amendments to Pre-qualification Documents",
      allowNotApplicable: true,
    },
    {
      name: "Opening / Minutes of Pre-qualification",
      allowNotApplicable: true,
    },
    {
      name: "Pre-qualification Evaluation Report",
      allowNotApplicable: true,
    },
    { name: "Draft Bidding Documents" },
    { name: "Specific Procurement Notice" },
    { name: "Invitation to Providers" },
    { name: "Amendments to Bidding Documents", allowNotApplicable: true },
    { name: "Bid Submission / Opening / Minutes" },
    { name: "Bid Evaluation Report and Recommendation for Award" },
    { name: "Notification of Intention of Award" },
    { name: "Signed Contract" },
    { name: "Contract Amendments", allowNotApplicable: true },
    { name: "Contract Completion" },
    { name: "Contract Termination", allowNotApplicable: true },
  ],
  rfq: [
    { name: "Draft Request for Quotations" },
    { name: "Specific Procurement Notice", allowNotApplicable: true },
    { name: "Invitation to Supplier / Contractor" },
    {
      name: "Amendments to Request for Quotations",
      allowNotApplicable: true,
    },
    { name: "Receive Quotations" },
    { name: "Comparison of Quotations" },
    { name: "Notification of Intention of Award" },
    { name: "Signed Contract" },
    { name: "Contract Amendments", allowNotApplicable: true },
    { name: "Contract Completion" },
    { name: "Contract Termination", allowNotApplicable: true },
  ],
  direct: [
    { name: "Justification for Direct Procurement" },
    { name: "Invitation to Supplier / Contractor" },
    { name: "Draft Contract" },
    { name: "Notification of Intention of Award", allowNotApplicable: true },
    { name: "Signed Contract" },
    { name: "Contract Amendments", allowNotApplicable: true },
    { name: "Contract Completion" },
    { name: "Contract Termination", allowNotApplicable: true },
  ],
  un: [
    { name: "Justification for Direct Procurement" },
    { name: "Invitation / Request to UN Agency or Supplier" },
    { name: "Draft Contract" },
    { name: "Notification of Intention of Award", allowNotApplicable: true },
    { name: "Signed Contract" },
    { name: "Contract Amendments", allowNotApplicable: true },
    { name: "Contract Completion" },
    { name: "Contract Termination", allowNotApplicable: true },
  ],
  consulting: [
    { name: "Terms of Reference" },
    { name: "Expression of Interest" },
    {
      name: "Evaluation of Expression of Interest and Short List of Consultants",
    },
    { name: "Short List and Draft Request for Proposals" },
    { name: "Request for Proposals as Issued" },
    { name: "Amendments to Request for Proposals", allowNotApplicable: true },
    { name: "Opening of Technical Proposals / Minutes" },
    { name: "Evaluation of Technical Proposals" },
    { name: "Opening of Financial Proposals / Minutes" },
    { name: "Combined Evaluation Report and Draft Negotiated Contract" },
    { name: "Notification of Intention of Award" },
    { name: "Signed Contract" },
    { name: "Contract Amendments", allowNotApplicable: true },
    { name: "Contract Completion" },
    { name: "Contract Termination", allowNotApplicable: true },
  ],
  cqs: [
    { name: "Terms of Reference" },
    { name: "Expression of Interest" },
    {
      name: "Evaluation of Expression of Interest and Short List of Consultants",
    },
    { name: "Short List and Draft Request for Proposals" },
    { name: "Draft Negotiated Contract" },
    { name: "Notification of Intention of Award" },
    { name: "Signed Contract" },
    { name: "Contract Amendments", allowNotApplicable: true },
    { name: "Contract Completion" },
    { name: "Contract Termination", allowNotApplicable: true },
  ],
  individual: [
    { name: "Terms of Reference" },
    { name: "Expression of Interest", allowNotApplicable: true },
    {
      name: "Evaluation of Expression of Interest and Short List of Consultants",
      allowNotApplicable: true,
    },
    {
      name: "Justification for Direct Selection",
      allowNotApplicable: true,
    },
    { name: "Invitation to Identified / Selected Consultant" },
    { name: "Draft Negotiated Contract" },
    { name: "Notification of Intention of Award" },
    { name: "Signed Contract" },
    { name: "Contract Amendments", allowNotApplicable: true },
    { name: "Contract Completion" },
    { name: "Contract Termination", allowNotApplicable: true },
  ],
};

export function normalizeActivityCategory(
  category: string | undefined,
): ProcurementActivityCategory {
  if (category === "Works") return "Works";
  if (category === "Consultancy" || category === "Consultancy Services") {
    return "Consultancy Services";
  }
  if (category === "Non-Consulting" || category === "Non-Consulting Services") {
    return "Non-Consulting Services";
  }
  return "Goods";
}

export function methodsForCategory(category: ProcurementActivityCategory) {
  return procurementMethodOptions.filter((method) =>
    method.appliesTo.includes(category),
  );
}

export function resolveProcurementMethodOption(
  methodOrKeyOrLabel?: string,
): ProcurementMethodOption | undefined {
  if (!methodOrKeyOrLabel) return undefined;
  const needle = methodOrKeyOrLabel.trim().toLowerCase();

  // 1. Direct match by key
  const byKey = procurementMethodOptions.find((opt) => opt.key === needle);
  if (byKey) return byKey;

  // 2. Direct match by label
  const byLabel = procurementMethodOptions.find(
    (opt) => opt.label.toLowerCase() === needle,
  );
  if (byLabel) return byLabel;

  // 3. Clean alphanumeric match (e.g. "rfb national" -> "rfbnational")
  const clean = needle.replace(/[^a-z0-9]/g, "");
  const byClean = procurementMethodOptions.find(
    (opt) =>
      opt.key.replace(/[^a-z0-9]/g, "") === clean ||
      opt.label.toLowerCase().replace(/[^a-z0-9]/g, "") === clean,
  );
  if (byClean) return byClean;

  // 4. Substring / partial matching
  const byPartial = procurementMethodOptions.find((opt) => {
    const optClean = opt.key.replace(/[^a-z0-9]/g, "");
    const optLabelClean = opt.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      (clean.length > 2 && optClean.includes(clean)) ||
      (optClean.length > 2 && clean.includes(optClean)) ||
      (clean.length > 2 && optLabelClean.includes(clean)) ||
      (optLabelClean.length > 2 && clean.includes(optLabelClean))
    );
  });
  if (byPartial) return byPartial;

  // 5. Common acronym / prefix mappings
  if (needle.startsWith("rfb") || needle.includes("bids")) {
    return needle.includes("inter")
      ? procurementMethodOptions.find((opt) => opt.key === "rfb-international")
      : procurementMethodOptions.find((opt) => opt.key === "rfb-national");
  }
  if (
    needle.startsWith("rfq") ||
    needle.includes("quotation") ||
    needle.includes("shopping")
  ) {
    return procurementMethodOptions.find((opt) => opt.key === "rfq-shopping");
  }
  if (needle.includes("direct")) {
    return procurementMethodOptions.find((opt) => opt.key === "direct");
  }
  if (needle.includes("un") || needle.includes("unops")) {
    return procurementMethodOptions.find((opt) => opt.key === "un-agency");
  }
  if (needle.includes("qcbs")) {
    return procurementMethodOptions.find((opt) => opt.key === "qcbs");
  }
  if (needle.includes("fbs")) {
    return procurementMethodOptions.find((opt) => opt.key === "fbs");
  }
  if (needle.includes("lcs")) {
    return procurementMethodOptions.find((opt) => opt.key === "lcs");
  }
  if (needle.includes("cqs")) {
    return procurementMethodOptions.find((opt) => opt.key === "cqs");
  }
  if (
    needle.includes("indv") ||
    needle.includes("ics") ||
    needle.includes("individual")
  ) {
    return procurementMethodOptions.find((opt) => opt.key === "indv");
  }

  return undefined;
}

export function resolveMethodKey(
  methodOrKeyOrLabel?: string,
): ProcurementMethodKey | "" {
  const opt = resolveProcurementMethodOption(methodOrKeyOrLabel);
  return opt ? opt.key : "";
}

export function roadmapForMethod(methodKeyOrLabel: string) {
  const method = resolveProcurementMethodOption(methodKeyOrLabel);
  return method ? roadmapTemplates[method.roadmap] : [];
}

export function activityReferenceFor(
  project: OfficerProject,
  plan: ProcurementPlanSummary,
  category: ProcurementActivityCategory,
  methodKey: string,
  existingActivityCount = plan.activities,
) {
  const agencySegment = project.executingAgency
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) =>
      ["and", "of", "the"].includes(word.toLowerCase())
        ? word[0].toLowerCase()
        : word[0].toUpperCase(),
    )
    .join("");
  const categorySegment = {
    "Consultancy Services": "CS",
    Goods: "GO",
    "Non-Consulting Services": "NCS",
    Works: "CW",
  }[category];
  const methodSegment =
    {
      cqs: "CQS",
      direct: "DIR",
      fbs: "FBS",
      indv: "INDV",
      lcs: "LCS",
      qcbs: "QCBS",
      "rfb-international": "RFB",
      "rfb-national": "RFB",
      "rfq-shopping": "RFQ",
      "un-agency": "UN",
    }[methodKey as ProcurementMethodKey] ?? "TBD";
  const uniqueNumber = String(existingActivityCount + 1).padStart(6, "0");

  return [
    "ET",
    agencySegment || "Agency",
    uniqueNumber,
    categorySegment,
    methodSegment,
  ].join("-");
}
