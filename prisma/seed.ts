import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "Shopping", icon: "🛍️", color: "#ec4899", monthlyBudget: 8000, isImpulseProne: true },
  { name: "Travel", icon: "✈️", color: "#3b82f6", monthlyBudget: 6000, isImpulseProne: true },
  { name: "Dining & Food", icon: "🍜", color: "#f97316", monthlyBudget: 6000, isImpulseProne: true },
  { name: "Dance & Sports", icon: "💃", color: "#a855f7", monthlyBudget: 3000, isImpulseProne: false },
  { name: "Arcade & Gaming", icon: "🕹️", color: "#22c55e", monthlyBudget: 2000, isImpulseProne: true },
  { name: "Subscriptions", icon: "📺", color: "#06b6d4", monthlyBudget: 1500, isImpulseProne: false },
  { name: "Rent & Bills", icon: "🏠", color: "#64748b", monthlyBudget: 15000, isImpulseProne: false },
  { name: "Transport", icon: "🚕", color: "#eab308", monthlyBudget: 3000, isImpulseProne: false },
  { name: "Health & Fitness", icon: "💪", color: "#14b8a6", monthlyBudget: 2000, isImpulseProne: false },
  { name: "Gifts & Social", icon: "🎁", color: "#f43f5e", monthlyBudget: 2000, isImpulseProne: true },
  { name: "Misc", icon: "🧾", color: "#94a3b8", monthlyBudget: 2000, isImpulseProne: false },
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }

  await prisma.gameState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const existingSalary = await prisma.salaryEntry.count();
  if (existingSalary === 0) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    await prisma.salaryEntry.create({
      data: { month: thisMonth, netAmount: 75000, note: "Seeded example — edit me" },
    });
  }

  const existingCtc = await prisma.ctcRecord.count();
  if (existingCtc === 0) {
    await prisma.ctcRecord.create({
      data: {
        effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
        annualCtc: 1200000,
        employer: "Your Company",
        note: "Seeded example — edit me",
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
