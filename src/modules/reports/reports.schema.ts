import { z } from 'zod';
import { registry } from '../../config/openapi.js';

const pageParams = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(5000).default(500),
};

const dateRangeParams = {
  dateFrom: z
    .string()
    .datetime({ precision: 3 })
    .optional()
    .or(z.string().date().optional()),
  dateTo: z
    .string()
    .datetime({ precision: 3 })
    .optional()
    .or(z.string().date().optional()),
};

// ─── Report #1: Annual Procurement Plan ──────────────────────────────────────
export const annualPlanSchema = z.object({
  budgetYear: z.string().min(1, 'budgetYear is required'),
  projectId: z.string().optional(),
  planId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  region: z.string().optional(),
  officerId: z.string().optional(),
  status: z.string().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  ...pageParams,
});
export type AnnualPlanQuery = z.infer<typeof annualPlanSchema>;

// ─── Report #2: Plan vs Actual ────────────────────────────────────────────────
export const planVsActualSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  budgetYear: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  officerId: z.string().optional(),
  region: z.string().optional(),
  fundingSourceId: z.string().optional(),
  stageTypeId: z.string().optional(),
  stageStatus: z.string().optional(),
  performanceStatus: z.enum(['ON_TIME', 'DELAYED']).optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type PlanVsActualQuery = z.infer<typeof planVsActualSchema>;

// ─── Report #3: Procurement Step (STEP Tracker) ──────────────────────────────
export const procurementStepSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  marketApproach: z.string().optional(),
  reviewType: z.string().optional(),
  fundingSourceId: z.string().optional(),
  officerId: z.string().optional(),
  activityStatus: z.string().optional(),
  stageTypeId: z.string().optional(),
  stageStatus: z.string().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type ProcurementStepQuery = z.infer<typeof procurementStepSchema>;

// ─── Report #4: Delayed Procurement ──────────────────────────────────────────
export const delayedProcurementSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  officerId: z.string().optional(),
  region: z.string().optional(),
  fundingSourceId: z.string().optional(),
  activityStatus: z.string().optional(),
  stageTypeId: z.string().optional(),
  minDelayDays: z.coerce.number().int().optional(),
  delayBucket: z.enum(['1-7', '8-30', '31-60', '60+']).optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type DelayedProcurementQuery = z.infer<typeof delayedProcurementSchema>;

// ─── Report #5: Monthly Summary ──────────────────────────────────────────────
export const monthlySummarySchema = z.object({
  year: z.coerce.number().int().positive(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  projectId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  region: z.string().optional(),
  officerId: z.string().optional(),
  ...pageParams,
});
export type MonthlySummaryQuery = z.infer<typeof monthlySummarySchema>;

// ─── Report #6: Contract & Payment ───────────────────────────────────────────
export const contractPaymentSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  activityId: z.string().optional(),
  supplierId: z.string().optional(),
  region: z.string().optional(),
  officerId: z.string().optional(),
  contractStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  fundingSourceId: z.string().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type ContractPaymentQuery = z.infer<typeof contractPaymentSchema>;

// ─── Report #7: Detailed Procurement ─────────────────────────────────────────
export const detailedProcurementSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  activityId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  marketApproach: z.string().optional(),
  reviewType: z.string().optional(),
  fundingSourceId: z.string().optional(),
  region: z.string().optional(),
  officerId: z.string().optional(),
  supplierId: z.string().optional(),
  contractStatus: z.string().optional(),
  activityStatus: z.string().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type DetailedProcurementQuery = z.infer<
  typeof detailedProcurementSchema
>;

// ─── Report #8: Project & Officer Summary ────────────────────────────────────
export const projectOfficerSummarySchema = z.object({
  projectId: z.string().optional(),
  officerId: z.string().optional(),
  region: z.string().optional(),
  budgetYear: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  status: z.string().optional(),
  ...pageParams,
});
export type ProjectOfficerSummaryQuery = z.infer<
  typeof projectOfficerSummarySchema
>;

// ─── Report #9: Activity Milestone Report ────────────────────────────────────
export const activityMilestoneSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  budgetYear: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  marketApproach: z.string().optional(),
  reviewType: z.string().optional(),
  fundingSourceId: z.string().optional(),
  officerId: z.string().optional(),
  activityStatus: z.string().optional(),
  contractStatus: z.string().optional(),
  supplierId: z.string().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type ActivityMilestoneQuery = z.infer<typeof activityMilestoneSchema>;

// ─── Register OpenAPI Paths for Reports ──────────────────────────────────────
const security = [{ bearerAuth: [] }, { cookieAuth: [] }];

registry.registerPath({
  method: 'get',
  path: '/api/reports/detailed-procurement',
  summary: 'Report #7 — Detailed Procurement (Excel)',
  tags: ['Reports'],
  security,
  request: { query: detailedProcurementSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/annual-procurement-plan',
  summary: 'Report #1 — Annual Procurement Plan (Excel)',
  tags: ['Reports'],
  security,
  request: { query: annualPlanSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/procurement-steps',
  summary: 'Report #3 — Procurement Step (STEP Tracker)',
  tags: ['Reports'],
  security,
  request: { query: procurementStepSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/plan-vs-actual',
  summary: 'Report #2 — Plan vs Actual comparison (Excel)',
  tags: ['Reports'],
  security,
  request: { query: planVsActualSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/delayed-procurement',
  summary: 'Report #4 — Delayed Procurement (Excel)',
  tags: ['Reports'],
  security,
  request: { query: delayedProcurementSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/contract-payment',
  summary: 'Report #6 — Contract & Payment (Excel) — Director only',
  tags: ['Reports'],
  security,
  request: { query: contractPaymentSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
    403: { description: 'Director access required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/monthly-summary',
  summary: 'Report #5 — Monthly Summary (Excel) — Director only',
  tags: ['Reports'],
  security,
  request: { query: monthlySummarySchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
    403: { description: 'Director access required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/project-officer-summary',
  summary: 'Report #8 — Project & Officer Summary (Excel) — Director only',
  tags: ['Reports'],
  security,
  request: { query: projectOfficerSummarySchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
    403: { description: 'Director access required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/activity-milestone',
  summary: 'Report #9 — Activity Milestone Report (Excel)',
  description:
    'One row per Activity. Fixed identity columns followed by dynamic Planned/Actual date column pairs for each procurement stage milestone.',
  tags: ['Reports'],
  security,
  request: { query: activityMilestoneSchema },
  responses: {
    200: {
      description: 'Excel file download (.xlsx)',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/reports/import/contracts',
  summary: 'Import contract report spreadsheet from local disk',
  tags: ['Reports'],
  security,
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.string().openapi({ type: 'string', format: 'binary' }),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: 'Success response with import counts' },
    400: { description: 'Import parsing or validation error' },
  },
});
