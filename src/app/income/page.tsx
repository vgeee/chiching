import { prisma } from "@/lib/prisma";
import { formatINR, formatMonth } from "@/lib/format";

export const dynamic = "force-dynamic";
import {
  createSalaryEntry,
  deleteSalaryEntry,
  createCtcRecord,
  deleteCtcRecord,
  createInvestment,
  deleteInvestment,
} from "@/app/actions/income";

function monthInputDefault() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function IncomePage() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [salaryEntries, ctcRecords, investments, yearInvestSum] = await Promise.all([
    prisma.salaryEntry.findMany({ orderBy: { month: "desc" }, take: 12 }),
    prisma.ctcRecord.findMany({ orderBy: { effectiveFrom: "desc" } }),
    prisma.investment.findMany({ orderBy: { date: "desc" }, take: 20 }),
    prisma.investment.aggregate({ where: { date: { gte: yearStart } }, _sum: { amount: true }, _count: true }),
  ]);

  const latestCtc = ctcRecords[0];
  const latestSalary = salaryEntries[0];
  const monthlyFromCtc = latestCtc ? Number(latestCtc.annualCtc) / 12 : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Income, CTC & investments</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-neutral-400 uppercase tracking-wide">Latest CTC</p>
          <p className="text-2xl font-bold mt-1">{latestCtc ? formatINR(Number(latestCtc.annualCtc)) : "—"}</p>
          <p className="text-xs text-neutral-500 mt-1">≈ {formatINR(monthlyFromCtc)}/mo on paper</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-neutral-400 uppercase tracking-wide">Latest in-hand salary</p>
          <p className="text-2xl font-bold mt-1">{latestSalary ? formatINR(Number(latestSalary.netAmount)) : "—"}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {latestSalary ? formatMonth(latestSalary.month) : "log this month's salary below"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-neutral-400 uppercase tracking-wide">Invested this year</p>
          <p className="text-2xl font-bold mt-1">{formatINR(Number(yearInvestSum._sum.amount ?? 0))}</p>
          <p className="text-xs text-neutral-500 mt-1">{yearInvestSum._count} entries — irregular is fine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">💵 Monthly salary</h2>
          <form action={createSalaryEntry} className="flex flex-wrap gap-2 items-end mb-4">
            <div className="flex flex-col">
              <label className="text-xs text-neutral-400 mb-1">Month</label>
              <input type="month" name="month" defaultValue={monthInputDefault()} required />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-neutral-400 mb-1">Net amount (₹)</label>
              <input type="number" name="netAmount" step="0.01" min="0" required className="w-32" />
            </div>
            <div className="flex flex-col flex-1 min-w-[8rem]">
              <label className="text-xs text-neutral-400 mb-1">Note</label>
              <input type="text" name="note" placeholder="optional" />
            </div>
            <button type="submit" className="h-9 px-4 rounded-full bg-emerald-500 text-white font-medium">
              Save
            </button>
          </form>
          <ul className="flex flex-col divide-y divide-white/5 text-sm">
            {salaryEntries.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between">
                <span>{formatMonth(s.month)}</span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{formatINR(Number(s.netAmount))}</span>
                  <form action={deleteSalaryEntry.bind(null, s.id)}>
                    <button className="text-xs text-rose-400 hover:underline">delete</button>
                  </form>
                </span>
              </li>
            ))}
            {salaryEntries.length === 0 && <p className="text-neutral-500">No salary logged yet.</p>}
          </ul>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-3">📈 CTC history</h2>
          <form action={createCtcRecord} className="flex flex-wrap gap-2 items-end mb-4">
            <div className="flex flex-col">
              <label className="text-xs text-neutral-400 mb-1">Effective from</label>
              <input type="date" name="effectiveFrom" required />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-neutral-400 mb-1">Annual CTC (₹)</label>
              <input type="number" name="annualCtc" step="0.01" min="0" required className="w-32" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-neutral-400 mb-1">Employer</label>
              <input type="text" name="employer" placeholder="optional" className="w-32" />
            </div>
            <button type="submit" className="h-9 px-4 rounded-full bg-emerald-500 text-white font-medium">
              Save
            </button>
          </form>
          <ul className="flex flex-col divide-y divide-white/5 text-sm">
            {ctcRecords.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between">
                <span>
                  {c.effectiveFrom.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  {c.employer ? ` · ${c.employer}` : ""}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{formatINR(Number(c.annualCtc))}</span>
                  <form action={deleteCtcRecord.bind(null, c.id)}>
                    <button className="text-xs text-rose-400 hover:underline">delete</button>
                  </form>
                </span>
              </li>
            ))}
            {ctcRecords.length === 0 && <p className="text-neutral-500">No CTC record yet.</p>}
          </ul>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">🌱 Investments (SIPs, lumpsums, whatever — irregular is the norm)</h2>
        <form action={createInvestment} className="flex flex-wrap gap-2 items-end mb-4">
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400 mb-1">Date</label>
            <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400 mb-1">Amount (₹)</label>
            <input type="number" name="amount" step="0.01" min="0" required className="w-32" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400 mb-1">Type</label>
            <select name="type" defaultValue="SIP">
              <option value="SIP">SIP</option>
              <option value="LUMPSUM">Lumpsum</option>
              <option value="STOCK">Stock</option>
              <option value="FD">FD</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-400 mb-1">Instrument</label>
            <input type="text" name="instrument" placeholder="e.g. Nifty 50 index fund" required className="w-48" />
          </div>
          <div className="flex flex-col flex-1 min-w-[8rem]">
            <label className="text-xs text-neutral-400 mb-1">Note</label>
            <input type="text" name="note" placeholder="optional" />
          </div>
          <button type="submit" className="h-9 px-4 rounded-full bg-emerald-500 text-white font-medium">
            Log investment
          </button>
        </form>
        <ul className="flex flex-col divide-y divide-white/5 text-sm">
          {investments.map((inv) => (
            <li key={inv.id} className="py-2 flex items-center justify-between">
              <span>
                {inv.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
                {inv.type} · {inv.instrument}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-medium">{formatINR(Number(inv.amount))}</span>
                <form action={deleteInvestment.bind(null, inv.id)}>
                  <button className="text-xs text-rose-400 hover:underline">delete</button>
                </form>
              </span>
            </li>
          ))}
          {investments.length === 0 && <p className="text-neutral-500">No investments logged yet — even 1-2 a year counts.</p>}
        </ul>
      </div>
    </div>
  );
}
