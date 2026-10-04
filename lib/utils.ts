import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";

// ─── Tailwind class merger ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency formatting ──────────────────────────────────────────────────────
export function formatCurrency(
  amount: number,
  currency = "INR",
  compact = false
): string {
  if (compact && amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (compact && amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function formatDate(dateStr: string, fmt = "dd MMM yyyy"): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatDateRelative(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) return "Today";
    if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) return "Yesterday";
    return format(date, "dd MMM");
  } catch {
    return dateStr;
  }
}

export function getCurrentMonthRange() {
  const now = new Date();
  return {
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

export function getLastNMonths(n: number) {
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: format(date, "MMM"),
    });
  }
  return months;
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// ─── Percentage change ────────────────────────────────────────────────────────
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Initials from name ───────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Payment mode label ───────────────────────────────────────────────────────
export const PAYMENT_MODE_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

// ─── Default category colors ──────────────────────────────────────────────────
export const CATEGORY_COLORS = [
  "#0F9E76", // teal
  "#185FA5", // blue
  "#854F0B", // amber
  "#993556", // pink
  "#D85A30", // coral
  "#534AB7", // purple
  "#3B6D11", // green
  "#5F5E5A", // gray
];

// ─── Truncate text ────────────────────────────────────────────────────────────
export function truncate(str: string, length = 30): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

// ─── Loan number generator ────────────────────────────────────────────────────
/**
 * Generates loan number: {initials}{YYYYMM}{sequence padded to 2 digits}
 * e.g. ET202606001 → but sequence is just the count+1 for that lender+month
 * Format matches: N2022033001 style
 */
export function generateLoanNumber(
  initials: string,
  date: Date,
  sequence: number
): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(2, "0");
  return `${initials.toUpperCase()}${yyyy}${mm}${dd}${seq}`;
}

/**
 * Get initials from full name — first letter of each word
 */
export function getInitialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join("")
    .slice(0, 3);
}

/**
 * FIFO settlement — distribute payment across loans oldest first
 * Returns array of { loan_id, amount_applied } allocations
 */
export function allocateSettlement(
  loans: Array<{ id: string; principal: number; amount_paid: number }>,
  paymentAmount: number
): Array<{ loan_id: string; amount_applied: number }> {
  const allocations: Array<{ loan_id: string; amount_applied: number }> = [];
  let remaining = paymentAmount;

  // Sort oldest first (assumes loans already sorted by loan_date asc)
  for (const loan of loans) {
    if (remaining <= 0) break;
    const balance = loan.principal - loan.amount_paid;
    if (balance <= 0) continue;
    const apply = Math.min(balance, remaining);
    allocations.push({ loan_id: loan.id, amount_applied: apply });
    remaining -= apply;
  }

  return allocations;
}
