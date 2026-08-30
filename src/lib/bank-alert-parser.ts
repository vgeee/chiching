/**
 * Parses transactional bank alert emails (the "Rs.500 spent at AMAZON on your
 * HDFC Card ending 1234" style messages most Indian banks send) into a
 * structured spend. Built against the well-known public templates used by
 * HDFC, ICICI, SBI Card, Axis, Kotak, and IDFC FIRST, plus a generic UPI
 * fallback — real inboxes will need occasional pattern additions as new
 * formats show up.
 */

export type ParsedAlert = {
  amount: number;
  merchant: string;
  last4: string | null;
  transactionDate: Date | null;
};

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s?([\d,]+(?:\.\d{1,2})?)/i;

const SPEND_VERB_RE = /\b(spent|debited|paid|used|purchase[d]?)\b/i;
const SKIP_VERB_RE = /\b(credited|refund(?:ed)?|reversed|cashback|repayment received)\b/i;

const LAST4_RE = /(?:ending|card no\.?|xx+|x{2,}|\*{2,})\s*[x*]*\s*(\d{4})\b/i;

// merchant sits after "at" / "to" (regular text) — cut off at the first word
// that signals we've hit trailing metadata, or a sentence-ending "." / ",".
const MERCHANT_RE = /\b(?:at|to)\s+([A-Za-z0-9&.,'\- @]{2,60}?)(?=\s+(?:on|dated|avl|avail|info|ref|not you|if not|ac\b|a\/c|via|using)\b|[.,](?:\s|$)|\n|$)/i;
const VPA_RE = /\bvpa\s+([\w.\-]+@[\w.\-]+)/i;
const UPI_SLASH_RE = /\bupi\/([\w.\-]+)/i;

const DATE_PATTERNS: { re: RegExp; parse: (m: RegExpMatchArray) => Date | null }[] = [
  {
    // 30-08-26 or 30-08-2026 or 30/08/26
    re: /\b(\d{2})[-/](\d{2})[-/](\d{2,4})\b/,
    parse: (m) => {
      const [, dd, mm, yyRaw] = m;
      const yyyy = yyRaw.length === 2 ? 2000 + Number(yyRaw) : Number(yyRaw);
      const d = new Date(yyyy, Number(mm) - 1, Number(dd));
      return Number.isNaN(d.getTime()) ? null : d;
    },
  },
  {
    // 30-Aug-26 or 30-Aug-2026
    re: /\b(\d{1,2})[-\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s](\d{2,4})\b/i,
    parse: (m) => {
      const [, dd, mon, yyRaw] = m;
      const yyyy = yyRaw.length === 2 ? 2000 + Number(yyRaw) : Number(yyRaw);
      const d = new Date(`${dd} ${mon} ${yyyy}`);
      return Number.isNaN(d.getTime()) ? null : d;
    },
  },
];

function extractDate(text: string): Date | null {
  for (const { re, parse } of DATE_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const d = parse(m);
      if (d) return d;
    }
  }
  return null;
}

function cleanMerchant(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,]+$/, "");
}

/**
 * Returns null if the text doesn't look like a debit/spend alert at all
 * (e.g. it's a credit, refund, OTP, or unrelated email) — callers should
 * skip those rather than guessing.
 */
export function parseBankAlert(subject: string, body: string): ParsedAlert | null {
  const text = `${subject}\n${body}`;

  if (SKIP_VERB_RE.test(text) && !SPEND_VERB_RE.test(text)) return null;
  if (!SPEND_VERB_RE.test(text)) return null;

  const amountMatch = text.match(AMOUNT_RE);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // VPA / "UPI/merchant" patterns are more specific than the generic "at X"
  // match (which would otherwise swallow the "VPA" keyword itself), so try
  // them first.
  const vpaMatch = text.match(VPA_RE);
  const upiSlashMatch = text.match(UPI_SLASH_RE);
  const merchantMatch = text.match(MERCHANT_RE);
  const merchant = vpaMatch
    ? cleanMerchant(vpaMatch[1])
    : upiSlashMatch
      ? cleanMerchant(upiSlashMatch[1])
      : merchantMatch
        ? cleanMerchant(merchantMatch[1])
        : "Unknown merchant";

  const last4Match = text.match(LAST4_RE);

  return {
    amount,
    merchant,
    last4: last4Match ? last4Match[1] : null,
    transactionDate: extractDate(text),
  };
}

const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  { category: "Dining & Food", keywords: ["swiggy", "zomato", "dominos", "starbucks", "cafe", "restaurant", "dineout", "food"] },
  { category: "Travel", keywords: ["irctc", "indigo", "makemytrip", "goibibo", "airbnb", "oyo", "yatra", "spicejet", "vistara", "airlines"] },
  { category: "Transport", keywords: ["uber", "ola", "rapido", "metro", "petrol", "fuel", "parking"] },
  { category: "Shopping", keywords: ["amazon", "myntra", "flipkart", "ajio", "nykaa", "zara", "h&m", "shop"] },
  { category: "Subscriptions", keywords: ["netflix", "spotify", "prime video", "hotstar", "youtube premium", "subscription", "icloud", "google one"] },
  { category: "Arcade & Gaming", keywords: ["timezone", "smaaash", "arcade", "steam", "playstation", "xbox"] },
  { category: "Dance & Sports", keywords: ["cult.fit", "cultfit", "zumba", "dance", "playo", "sports"] },
  { category: "Health & Fitness", keywords: ["gym", "fitness", "pharmacy", "apollo", "practo"] },
  { category: "Rent & Bills", keywords: ["rent", "electricity", "broadband", "wifi", "gas board", "landlord"] },
  { category: "Gifts & Social", keywords: ["gift", "flowers", "ferns"] },
];

export function guessCategory(merchant: string): string {
  const m = merchant.toLowerCase();
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => m.includes(k))) return category;
  }
  return "Misc";
}
