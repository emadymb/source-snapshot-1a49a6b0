// Shared currency & number formatters used across the accounting UI.
export const fmt = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
export const fmtNumber = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 2 });
export function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}