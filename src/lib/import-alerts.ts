import { prisma } from "@/lib/prisma";
import { parseBankAlert, guessCategory } from "@/lib/bank-alert-parser";
import { Prisma } from "@/generated/prisma/client";

export type RawAlertEmail = {
  sourceId: string; // e.g. Gmail message id
  subject: string;
  body: string;
  receivedAt: Date;
};

export type ImportDetail = {
  sourceId: string;
  status: "imported" | "duplicate" | "unparseable";
  amount?: number;
  merchant?: string;
  category?: string;
};

export type ImportResult = {
  imported: number;
  duplicates: number;
  unparseable: number;
  details: ImportDetail[];
};

/**
 * Auto-imported spends skip the XP/streak system on purpose — that's meant
 * to reward the habit of engaging with the app, and an email alert bypasses
 * that entirely. They still count toward badges/history like any other
 * transaction.
 */
export async function importParsedAlerts(emails: RawAlertEmail[]): Promise<ImportResult> {
  const categories = await prisma.category.findMany();
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));
  const fallbackCategoryId = categoryIdByName.get("Misc") ?? categories[0]?.id;

  const details: ImportDetail[] = [];

  for (const email of emails) {
    const sourceRef = `gmail:${email.sourceId}`;
    const parsed = parseBankAlert(email.subject, email.body);

    if (!parsed) {
      details.push({ sourceId: email.sourceId, status: "unparseable" });
      continue;
    }

    const categoryName = guessCategory(parsed.merchant);
    const categoryId = categoryIdByName.get(categoryName) ?? fallbackCategoryId;
    if (!categoryId) {
      details.push({ sourceId: email.sourceId, status: "unparseable" });
      continue;
    }

    try {
      await prisma.transaction.create({
        data: {
          amount: parsed.amount,
          categoryId,
          note: parsed.merchant,
          merchant: parsed.merchant,
          tags: ["auto"],
          isAutoImported: true,
          sourceRef,
          date: parsed.transactionDate ?? email.receivedAt,
        },
      });
      details.push({
        sourceId: email.sourceId,
        status: "imported",
        amount: parsed.amount,
        merchant: parsed.merchant,
        category: categoryName,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        details.push({ sourceId: email.sourceId, status: "duplicate" });
      } else {
        throw err;
      }
    }
  }

  await prisma.syncState.upsert({
    where: { id: "singleton" },
    update: { lastEmailSync: new Date() },
    create: { id: "singleton", lastEmailSync: new Date() },
  });

  return {
    imported: details.filter((d) => d.status === "imported").length,
    duplicates: details.filter((d) => d.status === "duplicate").length,
    unparseable: details.filter((d) => d.status === "unparseable").length,
    details,
  };
}
