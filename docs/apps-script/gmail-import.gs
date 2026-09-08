/**
 * chiching Gmail alert capture
 * -----------------------------
 * Bound to the Gmail account that receives your bank's transaction-alert
 * emails. On a time-driven trigger (every 1-5 min), searches for new,
 * not-yet-processed alert emails, and POSTs them as a batch to chiching's
 * import webhook. Nothing is stored or forwarded — this reads Gmail directly
 * and never fills up your mailbox.
 *
 * SETUP
 * 1. Go to https://script.google.com, sign in as the Gmail account that
 *    gets the bank alerts (not necessarily the account chiching itself
 *    runs under), and create a new project. Paste this whole file in as
 *    Code.gs, replacing the default content.
 * 2. Project Settings (gear icon, left sidebar) -> Script Properties ->
 *    add two properties:
 *      WEBHOOK_URL   = https://<your-deployed-app>.vercel.app/api/import/webhook
 *      INGEST_SECRET = <the same secret set as INGEST_SECRET on the server>
 * 3. Adjust SEARCH_QUERY below to match your bank's sender address/subject
 *    (the default is broad and may need tightening).
 * 4. Run `checkForNewAlerts` once manually from the editor (Run button) to
 *    trigger the Gmail permission consent screen. Approve it.
 * 5. Triggers (clock icon, left sidebar) -> Add Trigger:
 *      Function: checkForNewAlerts
 *      Event source: Time-driven
 *      Type: Minutes timer -> Every 5 minutes
 *    Save.
 *
 * ONE-TIME BACKFILL of older emails: select `backfillHistoricAlerts` in the
 * function dropdown (top toolbar) and click Run. It processes in batches
 * and stops a bit before Apps Script's 6-minute execution limit — check the
 * Executions log; if it logs "paused", just click Run again (already-
 * imported emails are skipped automatically, so re-running is always safe).
 * Repeat until it logs "Backfill complete".
 *
 * That's it — new bank alert emails now flow into chiching within 5 minutes,
 * with no phone dependency and no email forwarding/duplication.
 */

// Tighten this to your actual bank(s) once you know their sender domains,
// e.g. "(from:alerts@hdfcbank.net OR from:credit_cards@sbicard.com) newer_than:2d"
const SEARCH_QUERY =
  'newer_than:2d (subject:(spent OR debited OR "transaction alert" OR "has been used") ' +
  'OR from:(alerts OR notifications OR statements))' +
  ' -label:chiching-imported';

// Same filters, wider time window — used for the one-time backfill only.
// Adjust BACKFILL_DAYS if you want to reach further back (or remove the
// newer_than clause entirely to search all mail, which may be slow/noisy).
const BACKFILL_DAYS = 365;
const BACKFILL_QUERY =
  'newer_than:' + BACKFILL_DAYS + 'd ' +
  '(subject:(spent OR debited OR "transaction alert" OR "has been used") ' +
  'OR from:(alerts OR notifications OR statements))' +
  ' -label:chiching-imported';

const PROCESSED_LABEL = "chiching-imported";
const MAX_MESSAGES_PER_RUN = 40; // stays under the webhook's 50-per-request cap

function checkForNewAlerts() {
  processAlertsBatch_(SEARCH_QUERY, MAX_MESSAGES_PER_RUN);
}

/**
 * One-time backfill. Always searches from the top (start=0) — as each
 * batch gets labeled "chiching-imported", it drops out of the next
 * search, so this naturally advances through history without needing to
 * track an offset. Stops with time to spare before Apps Script's hard
 * 6-minute execution ceiling; re-run to continue.
 */
function backfillHistoricAlerts() {
  const deadline = Date.now() + 4.5 * 60 * 1000;
  let totalProcessed = 0;

  while (Date.now() < deadline) {
    const count = processAlertsBatch_(BACKFILL_QUERY, MAX_MESSAGES_PER_RUN);
    if (count === 0) {
      Logger.log("Backfill complete. Processed " + totalProcessed + " email(s) this run.");
      return;
    }
    totalProcessed += count;
  }

  Logger.log(
    "Backfill paused after " + totalProcessed +
    " email(s) (time limit) — run backfillHistoricAlerts again to continue."
  );
}

/**
 * Searches `query`, POSTs up to `maxMessages` matching emails to the
 * webhook as one batch, labels processed threads on success. Returns how
 * many emails were included (0 means nothing new matched `query`).
 */
function processAlertsBatch_(query, maxMessages) {
  const props = PropertiesService.getScriptProperties();
  const webhookUrl = props.getProperty("WEBHOOK_URL");
  const secret = props.getProperty("INGEST_SECRET");

  if (!webhookUrl || !secret) {
    Logger.log("Missing WEBHOOK_URL or INGEST_SECRET script property — see setup instructions.");
    return 0;
  }

  const label = getOrCreateLabel_(PROCESSED_LABEL);
  const threads = GmailApp.search(query, 0, 20);

  const emails = [];
  const threadsToLabel = [];

  for (const thread of threads) {
    const messages = thread.getMessages();
    let anyIncluded = false;

    for (const message of messages) {
      if (emails.length >= maxMessages) break;

      emails.push({
        sourceId: message.getId(),
        subject: message.getSubject() || "",
        body: message.getPlainBody() || "",
        receivedAt: message.getDate().toISOString(),
      });
      anyIncluded = true;
    }

    if (anyIncluded) threadsToLabel.push(thread);
    if (emails.length >= maxMessages) break;
  }

  if (emails.length === 0) {
    Logger.log("No new alert emails found.");
    return 0;
  }

  const response = UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    headers: { "X-Import-Secret": secret },
    payload: JSON.stringify({ emails }),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  Logger.log("Webhook responded " + status + ": " + response.getContentText());

  // Only mark threads as processed once the server actually accepted the
  // batch — on failure, leave them unlabeled so the next run retries.
  if (status === 200) {
    for (const thread of threadsToLabel) {
      thread.addLabel(label);
    }
    return emails.length;
  }

  return 0;
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
