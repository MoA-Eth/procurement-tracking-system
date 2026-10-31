import { prisma } from '../../src/config/database.ts';

async function seedBudgetYears() {
  const now = new Date();
  const curYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => ({
    type: 'BUDGET_YEAR',
    code: String(curYear - 2 + i),
    label: String(curYear - 2 + i),
    isActive: true,
  }));

  await prisma.lookupValue.createMany({
    data: years,
    skipDuplicates: true,
  });
  console.log('✅ Budget years seeded');
}

seedBudgetYears()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
