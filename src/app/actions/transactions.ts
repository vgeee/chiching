"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordExpenseActivity } from "@/lib/gamification";
import { Mood } from "@/generated/prisma/enums";

const createSchema = z.object({
  amount: z.coerce.number().positive(),
  categoryId: z.string().min(1),
  note: z.string().optional(),
  mood: z.enum([Mood.PLANNED, Mood.IMPULSE, Mood.NEED]).default(Mood.PLANNED),
  date: z.coerce.date().optional(),
  tags: z.string().optional(), // comma separated
});

export async function createTransaction(formData: FormData) {
  const parsed = createSchema.parse({
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    note: formData.get("note") || undefined,
    mood: formData.get("mood") || undefined,
    date: formData.get("date") || undefined,
    tags: formData.get("tags") || undefined,
  });

  const tags = parsed.tags
    ? parsed.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  await prisma.transaction.create({
    data: {
      amount: parsed.amount,
      categoryId: parsed.categoryId,
      note: parsed.note,
      mood: parsed.mood,
      date: parsed.date ?? new Date(),
      tags,
    },
  });

  const result = await recordExpenseActivity(parsed.mood);

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/monthly");

  return result;
}

export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/monthly");
}

const updateSchema = z.object({
  id: z.string().min(1),
  amount: z.coerce.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  note: z.string().optional(),
  mood: z.enum([Mood.PLANNED, Mood.IMPULSE, Mood.NEED]).optional(),
});

export async function updateTransaction(input: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.parse(input);
  const { id, ...data } = parsed;
  await prisma.transaction.update({ where: { id }, data });
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/monthly");
}
