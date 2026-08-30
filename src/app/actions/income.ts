"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { InvestmentType } from "@/generated/prisma/enums";

const salarySchema = z.object({
  month: z.coerce.date(),
  netAmount: z.coerce.number().positive(),
  note: z.string().optional(),
});

export async function createSalaryEntry(formData: FormData) {
  const parsed = salarySchema.parse({
    month: formData.get("month"),
    netAmount: formData.get("netAmount"),
    note: formData.get("note") || undefined,
  });
  const monthStart = new Date(parsed.month.getFullYear(), parsed.month.getMonth(), 1);
  await prisma.salaryEntry.upsert({
    where: { month: monthStart },
    update: { netAmount: parsed.netAmount, note: parsed.note },
    create: { month: monthStart, netAmount: parsed.netAmount, note: parsed.note },
  });
  revalidatePath("/income");
  revalidatePath("/");
}

export async function deleteSalaryEntry(id: string) {
  await prisma.salaryEntry.delete({ where: { id } });
  revalidatePath("/income");
}

const ctcSchema = z.object({
  effectiveFrom: z.coerce.date(),
  annualCtc: z.coerce.number().positive(),
  employer: z.string().optional(),
  note: z.string().optional(),
});

export async function createCtcRecord(formData: FormData) {
  const parsed = ctcSchema.parse({
    effectiveFrom: formData.get("effectiveFrom"),
    annualCtc: formData.get("annualCtc"),
    employer: formData.get("employer") || undefined,
    note: formData.get("note") || undefined,
  });
  await prisma.ctcRecord.create({ data: parsed });
  revalidatePath("/income");
  revalidatePath("/");
}

export async function deleteCtcRecord(id: string) {
  await prisma.ctcRecord.delete({ where: { id } });
  revalidatePath("/income");
}

const investmentSchema = z.object({
  date: z.coerce.date().optional(),
  amount: z.coerce.number().positive(),
  type: z.enum([
    InvestmentType.SIP,
    InvestmentType.LUMPSUM,
    InvestmentType.STOCK,
    InvestmentType.FD,
    InvestmentType.OTHER,
  ]),
  instrument: z.string().min(1),
  note: z.string().optional(),
});

export async function createInvestment(formData: FormData) {
  const parsed = investmentSchema.parse({
    date: formData.get("date") || undefined,
    amount: formData.get("amount"),
    type: formData.get("type"),
    instrument: formData.get("instrument"),
    note: formData.get("note") || undefined,
  });
  await prisma.investment.create({
    data: { ...parsed, date: parsed.date ?? new Date() },
  });
  revalidatePath("/income");
  revalidatePath("/");
}

export async function deleteInvestment(id: string) {
  await prisma.investment.delete({ where: { id } });
  revalidatePath("/income");
}
