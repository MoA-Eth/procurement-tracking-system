// Removes the local-only demo data created by seed-demo-dashboard.ts.
import { prisma } from '../src/config/database.js';

async function main() {
  const projects = await prisma.project.findMany({
    where: { code: { startsWith: 'DEMO-' } },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);
  const plans = await prisma.plan.findMany({
    where: { projectId: { in: projectIds } },
    select: { id: true },
  });
  const planIds = plans.map((p) => p.id);
  const activities = await prisma.activity.findMany({
    where: { planId: { in: planIds } },
    select: { id: true },
  });
  const activityIds = activities.map((a) => a.id);

  await prisma.$transaction([
    prisma.contract.deleteMany({ where: { contractNo: { startsWith: 'DEMO-' } } }),
    prisma.stage.deleteMany({ where: { activityId: { in: activityIds } } }),
    prisma.activity.deleteMany({ where: { id: { in: activityIds } } }),
    prisma.plan.deleteMany({ where: { id: { in: planIds } } }),
    prisma.userProject.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
    prisma.supplier.deleteMany({ where: { name: { startsWith: 'DEMO-' } } }),
    prisma.lookupValue.deleteMany({ where: { code: { startsWith: 'DEMO-' } } }),
  ]);
  console.log(
    `Removed ${projectIds.length} demo projects, ${planIds.length} plans, ${activityIds.length} activities.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
