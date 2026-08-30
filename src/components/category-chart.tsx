"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR } from "@/lib/format";

type Datum = { name: string; icon: string; value: number; color: string };

export function CategoryChart({ data }: { data: Datum[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">No spending logged yet this month.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: "#e5e5e5", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => formatINR(Number(value))}
          contentStyle={{ background: "#171717", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
          labelStyle={{ color: "#e5e5e5" }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
