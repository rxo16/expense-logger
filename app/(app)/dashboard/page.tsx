import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay } from "date-fns";

// Fetch all expenses for last 6 months + profile — client does the filtering
async function getDashboardData(userId: string) {
  const supabase = await createClient();
  const now = new Date();
  const sixMonthsAgo = format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd");
  const todayStr = format(startOfDay(now), "yyyy-MM-dd");

  const [allExpensesRes, recentRes] = await Promise.all([
    // All expenses in last 6 months (client filters by selected month)
    supabase
      .from("expenses")
      .select("amount, expense_date, category_id, categories(name, color, icon)")
      .eq("user_id", userId)
      .gte("expense_date", sixMonthsAgo)
      .order("expense_date", { ascending: false }),

    // Recent 10 for the recent list
    supabase
      .from("expenses")
      .select("*, categories(name, color, icon), subcategories(name)")
      .eq("user_id", userId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Build 6-month trend map
  const trendMap = new Map<string, number>();
  for (const row of allExpensesRes.data || []) {
    const key = row.expense_date.slice(0, 7);
    trendMap.set(key, (trendMap.get(key) || 0) + row.amount);
  }
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const key = format(d, "yyyy-MM");
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: format(d, "MMM"),
      monthKey: key,
      total: Math.round(trendMap.get(key) || 0),
    };
  });

  return {
    all_expenses: allExpensesRes.data || [],
    monthly_trend: monthlyTrend,
    recent_expenses: recentRes.data || [],
    today_str: todayStr,
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
