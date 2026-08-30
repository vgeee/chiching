import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

function lastNMonths(n: number) {
  const now = new Date();
  const months: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const label = start.toLocaleDateString("en-IN", { month: "short" });
    months.push({ key, label, start, end });
  }
  return months;
}

export default async function MonthlyGridPage() {
  const months = lastNMonths(6);
  const rangeStart = months[0].start;
  const rangeEnd = months[months.length - 1].end;

  const [categories, transactions] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.findMany({
      where: { date: { gte: rangeStart, lt: rangeEnd } },
      select: { amount: true, date: true, categoryId: true },
    }),
  ]);

  // matrix[categoryId][monthKey] = total
  const matrix = new Map<string, Map<string, number>>();
  for (const t of transactions) {
    const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    if (!matrix.has(t.categoryId)) matrix.set(t.categoryId, new Map());
    const m = matrix.get(t.categoryId)!;
    m.set(monthKey, (m.get(monthKey) ?? 0) + Number(t.amount));
  }

  const monthTotals = months.map((m) =>
    categories.reduce((sum, c) => sum + (matrix.get(c.id)?.get(m.key) ?? 0), 0)
  );
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Monthly grid</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Category × month, spreadsheet-style. Click any cell to drill into those transactions.
        </p>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-neutral-400 text-left">
              <th className="py-2 pr-4 sticky left-0 bg-neutral-950">Category</th>
              {months.map((m) => (
                <th key={m.key} className="py-2 px-3 text-right whitespace-nowrap">
                  {m.label}
                </th>
              ))}
              <th className="py-2 pl-3 text-right whitespace-nowrap">Budget</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const rowMap = matrix.get(c.id);
              const rowTotal = months.reduce((sum, m) => sum + (rowMap?.get(m.key) ?? 0), 0);
              if (rowTotal === 0) return null;
              return (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 pr-4 sticky left-0 bg-neutral-950 whitespace-nowrap">
                    {c.icon} {c.name}
                  </td>
                  {months.map((m) => {
                    const value = rowMap?.get(m.key) ?? 0;
                    return (
                      <td key={m.key} className="py-2 px-3 text-right">
                        {value > 0 ? (
                          <Link
                            href={`/transactions?category=${c.id}&month=${m.key}`}
                            className="hover:underline hover:text-cyan-400"
                          >
                            {formatINR(value)}
                          </Link>
                        ) : (
                          <span className="text-neutral-700">–</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 pl-3 text-right text-neutral-500 whitespace-nowrap">
                    {c.monthlyBudget ? formatINR(Number(c.monthlyBudget)) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 font-semibold">
              <td className="py-2 pr-4 sticky left-0 bg-neutral-950">Total</td>
              {monthTotals.map((total, i) => (
                <td key={months[i].key} className="py-2 px-3 text-right">
                  {formatINR(total)}
                </td>
              ))}
              <td className="py-2 pl-3 text-right text-neutral-400">{formatINR(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
