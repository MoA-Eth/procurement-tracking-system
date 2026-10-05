import type {
  OfficerProject,
  ProcurementCategory,
  ProcurementPlanSummary,
} from "./officerProjects";
import { getInitialLookups } from "@/lib/lookupsApi";

export type ProcurementActivityCategory = ProcurementCategory;

export type ProcurementMethodKey =
  | "rfb"
  | "rfb-international"
  | "rfb-national"
  | "rfq"
  | "rfq-shopping"
  | "direct"
  | "rfp"
  | "un-agency"
  | "qcbs"
  | "fbs"
  | "lcs"
  | "qbs"
  | "cqs"
  | "indv"
  | "sss"
  | (string & {});

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
  // Non-Consulting Services, Goods, Works
  {
    appliesTo: nonConsultingCategories,
    key: "rfb",
    label: "Request for Bids (RFB)",
    roadmap: "rfb",
  },
  {
    appliesTo: nonConsultingCategories,
    key: "rfq",
    label: "Request for Quotations (RFQ)",
    roadmap: "rfq",
  },
  {
    appliesTo: nonConsultingCategories,
    key: "direct",
    label: "Direct Selection, Request",
    roadmap: "direct",
  },
  {
    appliesTo: nonConsultingCategories,
    key: "rfp",
    label: "Request for Proposals (RFP)",
    roadmap: "rfb",
  },

  // Consulting Services
  {
    appliesTo: ["Consultancy Services"],
    key: "qcbs",
    label: "Quality- and Cost-Based Selection (QCBS)",
    roadmap: "consulting",
  },
  {
    appliesTo: ["Consultancy Services"],
    key: "fbs",
    label: "Fixed Budget Selection (FBS)",
    roadmap: "consulting",
  },
  {
    appliesTo: ["Consultancy Services"],
    key: "lcs",
    label: "Least-Cost Selection (LCS)",
    roadmap: "consulting",
  },
  {
    appliesTo: ["Consultancy Services"],
    key: "qbs",
    label: "Quality-Based Selection (QBS)",
    roadmap: "consulting",
  },
  {
    appliesTo: ["Consultancy Services"],
    key: "cqs",
    label: "Consultant's Qualifications Selection (CQS)",
    roadmap: "cqs",
  },
  {
    appliesTo: ["Consultancy Services"],
    key: "indv",
    label: "Individual Consultant Selection (INDV)",
    roadmap: "individual",
  },
];

export const legacyProcurementMethodOptions: readonly ProcurementMethodOption[] =
  [
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
      key: "un-agency",
      label: "UN Agency",
      roadmap: "un",
    },
    {
      appliesTo: ["Consultancy Services"],
      key: "sss",
      label: "Single Source Selection (SSS)",
      roadmap: "consulting",
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
    { name: "Invitation to Bidders" },
    { name: "Amendments to Bidding Documents", allowNotApplicable: true },
    { name: "Bid Submission / Opening / Dates" },
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
    { name: "Invitation to Bidders" },
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
    { name: "Invitation to Bidders" },
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
    { name: "Opening of Technical Proposals / Dates" },
    { name: "Evaluation of Technical Proposals" },
    { name: "Opening of Financial Proposals / Dates" },
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
    { name: "Invitation to Consultant" },
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
  if (
    category === "Consultancy" ||
    category === "Consultancy Services" ||
    category === "Consulting Services"
  ) {
    return "Consultancy Services";
  }
  if (
    category === "Non-Consulting" ||
    category === "Non-Consulting Services" ||
    category === "Non- Consulting Services"
  ) {
    return "Non-Consulting Services";
  }
  return "Goods";
}

export function getAllProcurementMethodOptions(): readonly ProcurementMethodOption[] {
  const options = [
    ...procurementMethodOptions,
    ...legacyProcurementMethodOptions,
  ];

  try {
    const dynamicLookups = getInitialLookups("PROCUREMENT_METHOD");
    if (dynamicLookups && dynamicLookups.length > 0) {
      for (const item of dynamicLookups) {
        if (!item.isActive) continue;
        const itemCode = (item.code || "").toUpperCase();
        const itemLabel = (item.label || "").trim();
        if (!itemLabel) continue;

        const exists = options.some(
          (opt) =>
            opt.key.toUpperCase() === itemCode ||
            opt.label.toLowerCase() === itemLabel.toLowerCase(),
        );

        if (!exists) {
          const isConsulting =
            itemLabel.toLowerCase().includes("consult") ||
            itemCode.includes("QCBS") ||
            itemCode.includes("CQS") ||
            itemCode.includes("INDV") ||
            itemCode.includes("ICS") ||
            itemCode.includes("SSS") ||
            itemCode.includes("FBS") ||
            itemCode.includes("LCS") ||
            itemCode.includes("QBS") ||
            itemLabel.toLowerCase().includes("single source") ||
            itemLabel.toLowerCase().includes("individual");

          const isUniversal =
            itemLabel.toLowerCase().includes("direct") ||
            itemCode.includes("DIR") ||
            itemLabel.toLowerCase().includes("un agency") ||
            itemLabel.toLowerCase().includes("unops") ||
            itemCode.includes("UN");

          const roadmap: ProcurementMethodOption["roadmap"] =
            itemCode.includes("CQS") || itemLabel.toLowerCase().includes("cqs")
              ? "cqs"
              : itemCode.includes("INDV") ||
                  itemCode.includes("ICS") ||
                  itemLabel.toLowerCase().includes("individual")
                ? "individual"
                : isConsulting
                  ? "consulting"
                  : itemLabel.toLowerCase().includes("quotation") ||
                      itemCode.includes("RFQ")
                    ? "rfq"
                    : itemLabel.toLowerCase().includes("direct") ||
                        itemCode.includes("DIR")
                      ? "direct"
                      : itemLabel.toLowerCase().includes("un") ||
                          itemCode.includes("UN")
                        ? "un"
                        : "rfb";

          options.push({
            key: item.code.toLowerCase().replace(/[^a-z0-9]/g, "-") as any,
            label: item.label,
            appliesTo: isConsulting
              ? ["Consultancy Services"]
              : isUniversal
                ? [
                    "Goods",
                    "Works",
                    "Non-Consulting Services",
                    "Consultancy Services",
                  ]
                : nonConsultingCategories,
            roadmap,
          });
        }
      }
    }
  } catch {
    // Fallback gracefully
  }

  return options;
}

export function methodsForCategory(
  category: ProcurementActivityCategory | string,
) {
  const normalized = normalizeActivityCategory(category as string);
  return procurementMethodOptions.filter((method) =>
    method.appliesTo.includes(normalized),
  );
}

export function resolveProcurementMethodOption(
  methodOrKeyOrLabel?: string,
): ProcurementMethodOption | undefined {
  if (!methodOrKeyOrLabel) return undefined;
  const allOptions = getAllProcurementMethodOptions();
  const needle = methodOrKeyOrLabel.trim().toLowerCase();

  // 1. Direct match by key
  const byKey = allOptions.find((opt) => opt.key === needle);
  if (byKey) return byKey;

  // 2. Direct match by label
  const byLabel = allOptions.find((opt) => opt.label.toLowerCase() === needle);
  if (byLabel) return byLabel;

  // 3. Clean alphanumeric match (e.g. "rfb national" -> "rfbnational")
  const clean = needle.replace(/[^a-z0-9]/g, "");
  const byClean = allOptions.find(
    (opt) =>
      opt.key.replace(/[^a-z0-9]/g, "") === clean ||
      opt.label.toLowerCase().replace(/[^a-z0-9]/g, "") === clean,
  );
  if (byClean) return byClean;

  // 4. Substring / partial matching
  const byPartial = allOptions.find((opt) => {
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
      ? allOptions.find((opt) => opt.key === "rfb-international") ||
          allOptions.find((opt) => opt.key === "rfb")
      : needle.includes("nat")
        ? allOptions.find((opt) => opt.key === "rfb-national") ||
          allOptions.find((opt) => opt.key === "rfb")
        : allOptions.find((opt) => opt.key === "rfb") ||
          allOptions.find((opt) => opt.key === "rfb-national");
  }
  if (
    needle.startsWith("rfq") ||
    needle.includes("quotation") ||
    needle.includes("shopping")
  ) {
    return (
      allOptions.find((opt) => opt.key === "rfq") ||
      allOptions.find((opt) => opt.key === "rfq-shopping")
    );
  }
  if (needle.startsWith("rfp") || needle.includes("proposal")) {
    return allOptions.find((opt) => opt.key === "rfp");
  }
  if (needle.includes("direct")) {
    return allOptions.find((opt) => opt.key === "direct");
  }
  if (needle.includes("un") || needle.includes("unops")) {
    return allOptions.find((opt) => opt.key === "un-agency");
  }
  if (needle.includes("qcbs")) {
    return allOptions.find((opt) => opt.key === "qcbs");
  }
  if (needle.includes("fbs")) {
    return allOptions.find((opt) => opt.key === "fbs");
  }
  if (needle.includes("lcs")) {
    return allOptions.find((opt) => opt.key === "lcs");
  }
  if (needle.includes("qbs")) {
    return allOptions.find((opt) => opt.key === "qbs");
  }
  if (needle.includes("cqs")) {
    return allOptions.find((opt) => opt.key === "cqs");
  }
  if (
    needle.includes("indv") ||
    needle.includes("ics") ||
    needle.includes("individual")
  ) {
    return allOptions.find((opt) => opt.key === "indv");
  }
  if (needle.includes("sss") || needle.includes("single source")) {
    return allOptions.find(
      (opt) =>
        opt.key === "sss" ||
        opt.key === "pm-sss" ||
        opt.label.toLowerCase().includes("single source"),
    );
  }

  return undefined;
}

export function resolveMethodKey(
  methodOrKeyOrLabel?: string,
): ProcurementMethodKey | "" {
  const opt = resolveProcurementMethodOption(methodOrKeyOrLabel);
  return opt ? opt.key : "";
}

export function roadmapForMethod(methodKeyOrLabel: string, category?: string) {
  const method = resolveProcurementMethodOption(methodKeyOrLabel);
  if (!method) return [];
  const stages = roadmapTemplates[method.roadmap];
  const isConsulting =
    category === "Consultancy Services" ||
    category === "Consultancy" ||
    category === "Consulting Services" ||
    method.appliesTo.includes("Consultancy Services");
  if (isConsulting) {
    return stages.map((stage) =>
      stage.name === "Invitation to Bidders" ||
      stage.name === "Invitation to Identified / Selected Consultant"
        ? { ...stage, name: "Invitation to Consultant" }
        : stage,
    );
  }
  return stages;
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
  const methodSegmentMap: Record<string, string> = {
    cqs: "CQS",
    direct: "DIR",
    fbs: "FBS",
    indv: "INDV",
    lcs: "LCS",
    qbs: "QBS",
    qcbs: "QCBS",
    rfb: "RFB",
    "rfb-international": "RFB",
    "rfb-national": "RFB",
    rfq: "RFQ",
    "rfq-shopping": "RFQ",
    rfp: "RFP",
    "un-agency": "UN",
  };
  const methodSegment = methodSegmentMap[methodKey] ?? "TBD";
  const uniqueNumber = String(existingActivityCount + 1).padStart(6, "0");

  return [
    "ET",
    agencySegment || "Agency",
    uniqueNumber,
    categorySegment,
    methodSegment,
  ].join("-");
}
