import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay } from "date-fns";

export type RawExpense = {
  amount: number;
  expense_date: string;
  category_id: string;
  categories: { name: string; color: string; icon: string }[];
};

export type MonthTrend = {
  year: number;
  month: number;
  label: string;
  total: number;
};

export type RecentExpense = {
  id: string;
  amount: number;
  description: string;
  expense_date: string;
  categories?: { name: string; color: string } | null;
  subcategories?: { name: string } | null;
};

async function getDashboardData(userId: string) {
  const supabase = await createClient();
  const now = new Date();

  const currStart = format(startOfMonth(now), "yyyy-MM-dd");
  const currEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const lastStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const lastEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const todayStr = format(startOfDay(now), "yyyy-MM-dd");

  const [
    currentMonthRes,
    lastMonthRes,
    todayRes,
    categoryBreakdownRes,
    trendRes,
    recentRes,
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", userId)
      .gte("expense_date", currStart)
      .lte("expense_date", currEnd),

    supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", userId)
      .gte("expense_date", lastStart)
      .lte("expense_date", lastEnd),

    supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", userId)
      .eq("expense_date", todayStr),

    supabase
      .from("expenses")
      .select("amount, category_id, categories(name, color, icon)")
      .eq("user_id", userId)
      .gte("expense_date", currStart)
      .lte("expense_date", currEnd),

    supabase
      .from("expenses")
      .select("amount, expense_date")
      .eq("user_id", userId)
      .gte("expense_date", format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd"))
      .lte("expense_date", currEnd),

    supabase
      .from("expenses")
      .select("*, categories(name, color, icon), subcategories(name)")
      .eq("user_id", userId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const sum = (items: { amount: number }[]) =>
    items?.reduce((acc, e) => acc + (e.amount || 0), 0) ?? 0;

  const currentTotal = sum(currentMonthRes.data || []);
  const lastTotal = sum(lastMonthRes.data || []);
  const todayTotal = sum(todayRes.data || []);

  const catMap = new Map<string, { name: string; color: string; total: number; count: number }>();
  for (const row of categoryBreakdownRes.data || []) {
    const rawCat = row.categories;
    const cat = (Array.isArray(rawCat) ? rawCat[0] : rawCat) as { name: string; color: string; icon: string } | null;
    if (!cat || !row.category_id) continue;
    const existing = catMap.get(row.category_id);
    if (existing) {
      existing.total += row.amount;
      existing.count += 1;
    } else {
      catMap.set(row.category_id, { name: cat.name, color: cat.color, total: row.amount, count: 1 });
    }
  }

  const topCategories = Array.from(catMap.entries())
    .map(([id, v]) => ({
      category_id: id,
      category_name: v.name,
      category_color: v.color,
      total: v.total,
      percentage: currentTotal > 0 ? Math.round((v.total / currentTotal) * 100) : 0,
      transaction_count: v.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const trendMap = new Map<string, number>();
  for (const row of trendRes.data || []) {
    const key = row.expense_date.slice(0, 7);
    trendMap.set(key, (trendMap.get(key) || 0) + row.amount);
  }

  const monthlyTrend: MonthTrend[] = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const key = format(d, "yyyy-MM");
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: format(d, "MMM"),
      total: Math.round(trendMap.get(key) || 0),
    };
  });

  return {
    current_month_total: Math.round(currentTotal),
    last_month_total: Math.round(lastTotal),
    today_total: Math.round(todayTotal),
    current_month_count: currentMonthRes.data?.length || 0,
    top_categories: topCategories,
    monthly_trend: monthlyTrend,
    recent_expenses: (recentRes.data || []).map((row): RecentExpense => {
      const rawCat = row.categories;
      const rawSub = row.subcategories;
      return {
        id: row.id,
        amount: row.amount,
        description: row.description,
        expense_date: row.expense_date,
        categories: Array.isArray(rawCat) ? (rawCat[0] ?? null) : rawCat ?? null,
        subcategories: Array.isArray(rawSub) ? (rawSub[0] ?? null) : rawSub ?? null,
      };
    }),
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const data = await getDashboardData(user.id);

  return (
    <DashboardClient
      data={data}
      userName={profile?.full_name || user.email?.split("@")[0] || "there"}
    />
  );
}
