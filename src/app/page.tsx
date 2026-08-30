import { prisma } from "@/lib/prisma";
import { levelFromXp } from "@/lib/gamification";

export const dynamic = "force-dynamic";
import { formatINR } from "@/lib/format";
import { QuickAddForm } from "@/components/quick-add-form";
import { CategoryChart } from "@/components/category-chart";
import Link from "next/link";

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [categories, gameState, badges, monthTxns, recentTxns, salaryEntry, monthInvestments] =
    await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.gameState.findUnique({ where: { id: "singleton" } }),
      prisma.badge.findMany({ orderBy: { earnedAt: "desc" } }),
      prisma.transaction.findMany({
        where: { date: { gte: monthStart, lt: monthEnd } },
        include: { category: true },
      }),
      prisma.transaction.findMany({
        orderBy: { date: "desc" },
        take: 6,
        include: { category: true },
      }),
      prisma.salaryEntry.findUnique({ where: { month: monthStart } }),
      prisma.investment.aggregate({
        where: { date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
    ]);

  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(gameState?.xp ?? 0);
  const streak = gameState?.currentStreak ?? 0;

  const spendByCategory = new Map<string, number>();
  for (const t of monthTxns) {
    spendByCategory.set(t.categoryId, (spendByCategory.get(t.categoryId) ?? 0) + Number(t.amount));
  }
  const chartData = categories
    .map((c) => ({ name: c.name, icon: c.icon, value: spendByCategory.get(c.id) ?? 0, color: c.color }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalSpend = monthTxns.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalBudget = categories.reduce((sum, c) => sum + Number(c.monthlyBudget ?? 0), 0);
  const invested = Number(monthInvestments._sum.amount ?? 0);
  const salary = Number(salaryEntry?.netAmount ?? 0);
  const leftover = salary - totalSpend - invested;

  const impulseSpend = monthTxns
    .filter((t) => t.mood === "IMPULSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const impulseShare = totalSpend > 0 ? Math.round((impulseSpend / totalSpend) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <QuickAddForm categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Level {level}</span>
            <span className="text-sm text-neutral-400">
              {xpIntoLevel}/{xpForNextLevel} XP
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-500"
              style={{ width: `${(xpIntoLevel / xpForNextLevel) * 100}%` }}
            />
          </div>
          <p className="text-sm text-neutral-400 mt-3">🔥 {streak}-day logging streak</p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-neutral-400 uppercase tracking-wide">This month spend</p>
          <p className="text-2xl font-bold mt-1">{formatINR(totalSpend)}</p>
          {totalBudget > 0 && (
            <p className="text-xs text-neutral-500 mt-1">of {formatINR(totalBudget)} budget</p>
          )}
        </div>

        <div className="card p-4">
          <p className="text-xs text-neutral-400 uppercase tracking-wide">Left over</p>
          <p className={`text-2xl font-bold mt-1 ${leftover < 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {formatINR(leftover)}
          </p>
          <p className="text-xs text-neutral-500 mt-1">salary − spend − invested</p>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold mb-3">🏅 Badges</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.id} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Spend by category (this month)</h2>
            <Link href="/monthly" className="text-xs text-cyan-400 hover:underline">
              drill in →
            </Link>
          </div>
          <CategoryChart data={chartData} />
          {totalSpend > 0 && (
            <p className="text-xs text-neutral-500 mt-3">
              ⚡ {impulseShare}% of this month&apos;s spend was tagged &quot;impulse&quot; — that&apos;s just data, not a judgment.
            </p>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent activity</h2>
            <Link href="/transactions" className="text-xs text-cyan-400 hover:underline">
              view all →
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-white/5">
            {recentTxns.length === 0 && <p className="text-sm text-neutral-500">Nothing logged yet — add your first spend above.</p>}
            {recentTxns.map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span>{t.category.icon}</span>
                  <span>{t.note || t.category.name}</span>
                </span>
                <span className="font-medium">{formatINR(Number(t.amount))}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
