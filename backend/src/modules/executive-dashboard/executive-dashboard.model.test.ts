import { describe, expect, it } from 'vitest';
import {
  classifyItemType,
  executiveRegisterColumns,
  executiveRegisterDate,
  executiveRegisterRow,
  milestoneDate,
  procurementPortfolioStatus,
  reportedProgress,
  type ExecutiveRecord,
} from './executive-dashboard.model.js';

describe('executive dashboard source mapping', () => {
  it.each([
    ['Bank Approval', 'IN_PROGRESS', 'NOT_STARTED'],
    [
      'Draft Bidding Documents',
      'IN_PROGRESS',
      'BIDDING_DOCUMENT_PREPARATION',
    ],
    ['Issuance of Bidding Document', 'IN_PROGRESS', 'BID_ADVERTISED'],
    ['Bid Evaluation Report', 'IN_PROGRESS', 'BID_EVALUATION'],
    ['Contract Signing', 'IN_PROGRESS', 'CONTRACT_AWARDED'],
  ])('classifies roadmap stage %s', (label, status, expected) => {
    expect(
      procurementPortfolioStatus(
        'IN_PROGRESS',
        [{ label, status, isNotApplicable: false }],
        [],
      ),
    ).toBe(expected);
  });
  it('uses completion and contract execution status before roadmap stage', () => {
    const stage = [
      {
        label: 'Bid Evaluation',
        status: 'IN_PROGRESS',
        isNotApplicable: false,
      },
    ];
    expect(
      procurementPortfolioStatus('IN_PROGRESS', stage, [
        {
          status: 'ACTIVE',
          signatureDate: new Date(),
          actualCompletionDate: null,
        },
      ]),
    ).toBe('CONTRACT_DELIVERY');
    expect(
      procurementPortfolioStatus('IN_PROGRESS', stage, [
        {
          status: 'SIGNED',
          signatureDate: new Date(),
          actualCompletionDate: null,
        },
      ]),
    ).toBe('CONTRACT_AWARDED');
    expect(
      procurementPortfolioStatus('IN_PROGRESS', stage, [
        {
          status: 'ACTIVE',
          signatureDate: new Date(),
          actualCompletionDate: new Date(),
        },
      ]),
    ).toBe('COMPLETED');
  });
  it('defaults unrecorded roadmap status to bidding-document preparation', () => {
    expect(procurementPortfolioStatus('PLANNED', [], [])).toBe(
      'BIDDING_DOCUMENT_PREPARATION',
    );
  });
  it.each([
    ['Works', 'WORKS'],
    ['Goods', 'GOODS'],
    ['Consultancy Services', 'SERVICES'],
    ['Non-Consulting Services', 'SERVICES'],
    ['Non- Consulting Services', 'SERVICES'],
    ['CONSULTING_SERVICES', 'SERVICES'],
    [null, 'UNCLASSIFIED'],
    ['Other', 'UNCLASSIFIED'],
  ])('classifies %s explicitly', (source, expected) => {
    expect(classifyItemType(source)).toBe(expected);
  });
  it('uses actual milestones and excludes not-applicable stages', () => {
    const actual = new Date('2026-09-05T00:00:00Z');
    expect(
      milestoneDate(
        [
          {
            label: 'Invitation to Bidders',
            actualStartDate: null,
            actualEndDate: null,
            isNotApplicable: false,
          },
          {
            label: 'Invitation to Consultant',
            actualStartDate: actual,
            actualEndDate: null,
            isNotApplicable: true,
          },
        ],
        'invitation',
      ),
    ).toBeNull();
    expect(
      milestoneDate(
        [
          {
            label: 'Bid Submission / Opening / Dates',
            actualStartDate: actual,
            actualEndDate: null,
            isNotApplicable: false,
          },
        ],
        'opening',
      ),
    ).toBe(actual.toISOString());
  });
  it('preserves missing and invalid progress instead of treating it as zero', () => {
    expect(reportedProgress(null)).toBeNull();
    expect(reportedProgress(101)).toBeNull();
    expect(reportedProgress(-1)).toBeNull();
    expect(reportedProgress(0)).toBe(0);
    expect(reportedProgress(67.5)).toBe(67.5);
  });

  it('formats records in the external spreadsheet register column order', () => {
    const record: ExecutiveRecord = {
      id: 'contract:1',
      activityId: 'activity-1',
      contractId: 'contract-1',
      reference: 'CTR-001',
      description: 'Road rehabilitation',
      projectId: 'project-1',
      project: 'Roads project',
      itemType: 'WORKS',
      sourceCategory: 'Works',
      estimate: 1250000,
      estimateCurrency: 'ETB',
      currency: 'ETB',
      invitationDate: '2026-03-04T00:00:00.000Z',
      bidOpeningDate: null,
      signedDate: '2026-04-15T00:00:00.000Z',
      supplier: 'ABC Construction',
      country: 'Ethiopia',
      initialAmount: 1200000,
      initialCompletionDate: '2027-04-15T00:00:00.000Z',
      revisedCompletionDate: null,
      actualCompletionDate: null,
      complete: false,
      completionPct: 67.5,
      status: 'ACTIVE',
    };

    expect(executiveRegisterColumns.map(({ key }) => key)).toEqual([
      'no',
      'contractRef',
      'contractDescription',
      'project',
      'costEstimate',
      'invitationDate',
      'bidOpeningDate',
      'contractSignedDate',
      'supplierContractorCountry',
      'initialContractAmount',
      'initialContractCompletionDate',
      'complete',
      'completionPct',
    ]);
    expect(executiveRegisterRow(record, 0)).toEqual({
      no: 1,
      contractRef: 'CTR-001',
      contractDescription: 'Road rehabilitation',
      project: 'Roads project',
      costEstimate: '1,250,000.00 ETB',
      invitationDate: '03/04/2026',
      bidOpeningDate: '',
      contractSignedDate: '04/15/2026',
      supplierContractorCountry: 'ABC Construction, Ethiopia',
      initialContractAmount: '1,200,000.00 ETB',
      initialContractCompletionDate: '04/15/2027',
      complete: 'No',
      completionPct: '67.5%',
    });
  });

  it('returns an empty display date for missing or invalid values', () => {
    expect(executiveRegisterDate(null)).toBe('');
    expect(executiveRegisterDate('not-a-date')).toBe('');
  });
});
