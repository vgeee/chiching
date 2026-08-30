"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { formatINR } from "@/lib/format";
import { deleteTransaction, updateTransaction } from "@/app/actions/transactions";

type Row = {
  id: string;
  date: string;
  amount: number;
  note: string | null;
  mood: string;
  tags: string[];
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  isAutoImported: boolean;
};

type Category = { id: string; name: string; icon: string };

const MOOD_ICON: Record<string, string> = { PLANNED: "🧭", IMPULSE: "⚡", NEED: "✅" };

const columnHelper = createColumnHelper<Row>();

export function TransactionsTable({
  rows,
  categories,
  initialCategoryId = "",
  initialMonth = "",
}: {
  rows: Row[];
  categories: Category[];
  initialCategoryId?: string;
  initialMonth?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryId);
  const [monthFilter, setMonthFilter] = useState(initialMonth);
  const [moodFilter, setMoodFilter] = useState("");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (categoryFilter && r.categoryId !== categoryFilter) return false;
      if (moodFilter && r.mood !== moodFilter) return false;
      if (monthFilter && r.date.slice(0, 7) !== monthFilter) return false;
      if (search) {
        const hay = `${r.note ?? ""} ${r.tags.join(" ")} ${r.categoryName}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, categoryFilter, moodFilter, monthFilter, search]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => new Date(info.getValue()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      }),
      columnHelper.accessor((r) => `${r.categoryIcon} ${r.categoryName}`, {
        id: "category",
        header: "Category",
        cell: (info) => (
          <select
            defaultValue={info.row.original.categoryId}
            onChange={(e) =>
              startTransition(() =>
                updateTransaction({ id: info.row.original.id, categoryId: e.target.value })
              )
            }
            className="!bg-transparent !border-0 !p-0 text-sm cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-neutral-900">
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        ),
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => (
          <span className="flex items-center gap-1.5">
            {formatINR(info.getValue())}
            {info.row.original.isAutoImported && (
              <span
                title="Auto-imported from a bank alert"
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
              >
                auto
              </span>
            )}
          </span>
        ),
      }),
      columnHelper.accessor("mood", {
        header: "Mood",
        cell: (info) => `${MOOD_ICON[info.getValue()] ?? ""} ${info.getValue().toLowerCase()}`,
      }),
      columnHelper.accessor("note", {
        header: "Note",
        cell: (info) => info.getValue() || <span className="text-neutral-600">—</span>,
      }),
      columnHelper.accessor("tags", {
        header: "Tags",
        cell: (info) => info.getValue().join(", "),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <button
            onClick={() => startTransition(() => deleteTransaction(info.row.original.id))}
            className="text-xs text-rose-400 hover:underline"
          >
            delete
          </button>
        ),
      }),
    ],
    [categories]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const total = filtered.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="card p-4 overflow-x-auto">
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400 mb-1">Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="note, tag, category…" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400 mb-1">Category</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400 mb-1">Mood</label>
          <select value={moodFilter} onChange={(e) => setMoodFilter(e.target.value)}>
            <option value="">All</option>
            <option value="PLANNED">🧭 planned</option>
            <option value="IMPULSE">⚡ impulse</option>
            <option value="NEED">✅ need</option>
          </select>
        </div>
        {monthFilter && (
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400 mb-1">Month</label>
            <button
              onClick={() => setMonthFilter("")}
              className="h-9 px-3 rounded-md bg-white/5 border border-white/10 text-sm text-left"
            >
              {monthFilter} ✕
            </button>
          </div>
        )}
        <div className="ml-auto text-sm text-neutral-400">
          {filtered.length} rows · {formatINR(total)}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-white/10 text-left text-neutral-400">
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="py-2 pr-4 cursor-pointer select-none whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-2 pr-4 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-neutral-500">
                No transactions match.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
