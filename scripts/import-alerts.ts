/**
 * Usage: npx tsx scripts/import-alerts.ts <path-to-json-file>
 *
 * The JSON file is an array of raw bank-alert emails:
 *   [{ "sourceId": "<gmail message id>", "subject": "...", "body": "...", "receivedAt": "2026-08-30T12:00:00Z" }]
 *
 * Fetching those emails from Gmail is done separately (Claude has the Gmail
 * connector, this script doesn't) — this just runs already-fetched emails
 * through the parser and writes results to the database.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { importParsedAlerts, type RawAlertEmail } from "../src/lib/import-alerts";
import { prisma } from "../src/lib/prisma";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/import-alerts.ts <path-to-json-file>");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as Array<{
    sourceId: string;
    subject: string;
    body: string;
    receivedAt: string;
  }>;

  const emails: RawAlertEmail[] = raw.map((e) => ({
    sourceId: e.sourceId,
    subject: e.subject,
    body: e.body,
    receivedAt: new Date(e.receivedAt),
  }));

  const result = await importParsedAlerts(emails);

  for (const d of result.details) {
    if (d.status === "imported") {
      console.log(`✓ imported  ${d.sourceId}  ₹${d.amount} · ${d.merchant} → ${d.category}`);
    } else if (d.status === "duplicate") {
      console.log(`= skipped   ${d.sourceId}  (already imported)`);
    } else {
      console.log(`? unparsed  ${d.sourceId}`);
    }
  }

  console.log(
    `\n${result.imported} imported, ${result.duplicates} duplicates skipped, ${result.unparseable} could not be parsed.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
