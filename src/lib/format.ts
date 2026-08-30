export function formatINR(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(date);
}
