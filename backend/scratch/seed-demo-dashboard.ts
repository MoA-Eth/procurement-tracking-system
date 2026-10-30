// Local-only demo data for the Directorate Oversight dashboard.
// Every record is prefixed DEMO- so it can be removed with remove-demo-dashboard.ts.
import { prisma } from '../src/config/database.js';
import {
  ContractStatus,
  PaymentStatus,
  PaymentType,
  PlanStatus,
  StageStatus,
} from '../src/generated/prisma/index.js';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const addDays = (iso: string, n: number) =>
  new Date(day(iso).getTime() + n * 86_400_000);

const lookup = (type: string, code: string, label: string) =>
  prisma.lookupValue.upsert({
    where: { type_code: { type, code } },
    update: {},
    create: { type, code, label },
  });

async function main() {
  const existing = await prisma.project.count({
    where: { code: { startsWith: 'DEMO-' } },
  });
  if (existing > 0) {
    console.log('Demo data already present; run remove-demo-dashboard.ts first.');
    return;
  }

  const users = await prisma.user.findMany();
  const by = (email: string) => users.find((u) => u.email === email)!;
  const director = by('director@moa.gov.et');
  const officers = [
    by('officer@moa.gov.et'),
    by('almaz.officer@moa.gov.et'),
    by('yeabsira.fikre@moa.gov.et'),
  ];

  const funding = [
    await lookup('FUNDING_SOURCE', 'DEMO-IDA', 'IDA Credit (World Bank)'),
    await lookup('FUNDING_SOURCE', 'DEMO-TREASURY', 'Government Treasury'),
  ];
  const sectors = [
    await lookup('SECTOR', 'DEMO-CROPS', 'Crop Development'),
    await lookup('SECTOR', 'DEMO-LIVESTOCK', 'Livestock Development'),
    await lookup('SECTOR', 'DEMO-IRRIGATION', 'Irrigation & Water'),
  ];
  const methods = [
    await lookup('PROCUREMENT_METHOD', 'DEMO-NCB', 'RFB - National'),
    await lookup('PROCUREMENT_METHOD', 'DEMO-RFQ', 'RFQ / Shopping'),
  ];
  const stageTypes = [
    await lookup('STAGE_TYPE', 'DEMO-SPEC', 'Preparation of Specification'),
    await lookup('STAGE_TYPE', 'DEMO-BID', 'Bid Opening'),
    await lookup('STAGE_TYPE', 'DEMO-EVAL', 'Bid Evaluation'),
    await lookup('STAGE_TYPE', 'DEMO-SIGN', 'Signed Contract'),
  ];

  const projects = await Promise.all(
    [
      ['DEMO-P1', 'Food Systems Resilience Program'],
      ['DEMO-P2', 'Livestock & Fisheries Sector Development'],
      ['DEMO-P3', 'Small-Scale Irrigation Expansion'],
    ].map(([code, name], i) =>
      prisma.project.create({
        data: {
          code,
          name,
          fundingSourceId: funding[i % 2].id,
          sectorId: sectors[i].id,
          members: {
            create: [director, ...officers].map((u) => ({ userId: u.id })),
          },
        },
      }),
    ),
  );

  // [project index, status, officer index, title]
  const planSpecs: [number, PlanStatus, number, string][] = [
    [0, PlanStatus.APPROVED, 0, 'Annual Procurement Plan – Seeds & Inputs'],
    [0, PlanStatus.WITH_COMMITTEE, 1, 'Farm Machinery Procurement Plan'],
    [1, PlanStatus.APPROVED, 1, 'Veterinary Supplies Procurement Plan'],
    [1, PlanStatus.SUBMITTED, 2, 'Cold Chain Equipment Plan'],
    [1, PlanStatus.DRAFT, 0, 'Laboratory Upgrade Plan'],
    [2, PlanStatus.MANAGEMENT_APPROVED, 2, 'Irrigation Works Procurement Plan'],
    [2, PlanStatus.RETURNED_FOR_REVISION, 0, 'Pump Station Rehabilitation Plan'],
    [2, PlanStatus.AWAITING_MANAGEMENT_APPROVAL, 1, 'Canal Lining Works Plan'],
  ];

  const regions = ['Oromia', 'Amhara', 'Sidama', 'Tigray', 'SNNP'];
  let activityNo = 0;
  let contractNo = 0;

  const supplier = await prisma.supplier.create({
    data: { name: 'DEMO-Abay Agro Supplies PLC', tinNumber: 'DEMO-0001' },
  });
  const supplier2 = await prisma.supplier.create({
    data: { name: 'DEMO-Rift Valley Engineering', tinNumber: 'DEMO-0002' },
  });

  for (const [pi, status, oi, title] of planSpecs) {
    const officer = officers[oi];
    const approved =
      status === PlanStatus.APPROVED ||
      status === PlanStatus.MANAGEMENT_APPROVED;
    const plan = await prisma.plan.create({
      data: {
        projectId: projects[pi].id,
        title: `DEMO-${title}`,
        budgetYear: '2018/19 EFY',
        organization: regions[activityNo % regions.length],
        periodStart: day('2026-07-08'),
        periodEnd: day('2027-07-07'),
        status,
        createdBy: officer.id,
        ...(approved ? { approvedById: director.id, approvedAt: day('2026-08-15') } : {}),
      },
    });

    for (let a = 0; a < 2; a++) {
      activityNo++;
      const budget = [4_200_000, 12_500_000, 7_800_000, 2_350_000][activityNo % 4];
      // Mix of on-time, overdue and early-stage activities for approved plans
      const progress = approved ? [3, 2, 1][activityNo % 3] : 0;
      const overdue = approved && activityNo % 3 === 1;
      const activity = await prisma.activity.create({
        data: {
          reference: `DEMO-A${String(activityNo).padStart(3, '0')}`,
          planId: plan.id,
          procurementMethodId: methods[activityNo % 2].id,
          description: `${title.split('–').pop()!.replace(' Plan', '').trim()} – Lot ${a + 1}`,
          estimatedBudget: budget,
          currency: 'ETB',
          createdById: officer.id,
          status: progress >= 3 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'PLANNED',
          stages: {
            create: stageTypes.map((st, si) => {
              const planned = addDays('2026-08-01', si * 30 + activityNo);
              const done = si < progress;
              const current = si === progress && approved;
              return {
                stageTypeId: st.id,
                sequence: si + 1,
                plannedStartDate: planned,
                plannedEndDate: addDays(planned.toISOString().slice(0, 10), 14),
                plannedDays: 14,
                currentTargetStartDate: planned,
                currentTargetEndDate: addDays(planned.toISOString().slice(0, 10), overdue && current ? -40 : 14),
                status: done
                  ? StageStatus.COMPLETED
                  : current
                    ? overdue
                      ? StageStatus.DELAYED
                      : StageStatus.IN_PROGRESS
                    : StageStatus.NOT_STARTED,
                ...(done
                  ? {
                      actualStartDate: planned,
                      actualEndDate: addDays(planned.toISOString().slice(0, 10), 12),
                    }
                  : current
                    ? { actualStartDate: planned }
                    : {}),
              };
            }),
          },
        },
      }).catch(async (err) => {
        // Activity.status may not accept these values in every schema version
        throw err;
      });

      if (approved && a === 0) {
        contractNo++;
        const total = budget * 0.95;
        const paid = [0.25, 0.6, 0.9, 0][contractNo % 4] * total;
        const contract = await prisma.contract.create({
          data: {
            contractNo: `DEMO-C${String(contractNo).padStart(3, '0')}`,
            activityId: activity.id,
            supplierId: contractNo % 2 ? supplier.id : supplier2.id,
            totalValue: total,
            contractAmountWithVat: total,
            contractNetOfVat: total / 1.15,
            paidAmount: paid,
            remainingValue: total - paid,
            currency: 'ETB',
            awardDate: day('2026-09-10'),
            signatureDate: day('2026-09-20'),
            startDate: day('2026-10-01'),
            plannedEndDate: day('2027-03-31'),
            region: regions[contractNo % regions.length],
            sector: sectors[pi].label,
            status: paid >= total * 0.9 ? ContractStatus.ACTIVE : ContractStatus.SIGNED,
          },
        });
        if (paid > 0) {
          await prisma.payment.create({
            data: {
              contractId: contract.id,
              amount: paid,
              paymentDate: day('2026-10-15'),
              referenceNo: `DEMO-PAY-${contractNo}`,
              paymentType: PaymentType.ADVANCE,
              status: PaymentStatus.PAID,
            },
          });
        }
      }
    }
  }

  console.log(
    `Seeded ${projects.length} projects, ${planSpecs.length} plans, ${activityNo} activities, ${contractNo} contracts.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
