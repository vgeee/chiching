import { prisma } from "@/lib/prisma";
import { TransactionsTable } from "@/components/transactions-table";
import { QuickAddForm } from "@/components/quick-add-form";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; month?: string }>;
}) {
  const params = await searchParams;
  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { date: "desc" }, include: { category: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows = transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    amount: Number(t.amount),
    note: t.note,
    mood: t.mood,
    tags: t.tags,
    categoryId: t.categoryId,
    categoryName: t.category.name,
    categoryIcon: t.category.icon,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Transactions</h1>
      <QuickAddForm categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))} />
      <TransactionsTable
        rows={rows}
        categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
        initialCategoryId={params.category ?? ""}
        initialMonth={params.month ?? ""}
      />
    </div>
  );
}
