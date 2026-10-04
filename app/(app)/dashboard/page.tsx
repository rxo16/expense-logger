import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import { format, startOfMonth, subMonths, startOfDay } from "date-fns";

async function getDashboardData(userId: string) {
  const supabase = await createClient();
  const now = new Date();
  const sixMonthsAgo = format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd");
  const todayStr = format(startOfDay(now), "yyyy-MM-dd");

  const [allExpensesRes, recentRes, loansRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("amount, expense_date, category_id, categories(name, color, icon)")
      .eq("user_id", userId)
      .gte("expense_date", sixMonthsAgo)
      .order("expense_date", { ascending: false }),

    supabase
      .from("expenses")
      .select("*, categories(name, color, icon), subcategories(name)")
      .eq("user_id", userId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("loans")
      .select("principal, amount_paid, status")
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  const trendMap = new Map<string, number>();
  for (const row of allExpensesRes.data || []) {
    const key = (row.expense_date as string).slice(0, 7);
    trendMap.set(key, (trendMap.get(key) || 0) + (row.amount as number));
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

  // Normalize all_expenses so categories is always object | null, never array
  const allExpenses = (allExpensesRes.data || []).map((row) => {
    const cat = Array.isArray(row.categories)
      ? (row.categories[0] ?? null)
      : (row.categories ?? null);
    return {
      amount: row.amount as number,
      expense_date: row.expense_date as string,
      category_id: row.category_id as string,
      categories: cat as { name: string; color: string; icon: string } | null,
    };
  });

  // Normalize recent_expenses the same way
  const recentExpenses = (recentRes.data || []).map((row) => {
    const cat = Array.isArray(row.categories)
      ? (row.categories[0] ?? null)
      : (row.categories ?? null);
    const sub = Array.isArray(row.subcategories)
      ? (row.subcategories[0] ?? null)
      : (row.subcategories ?? null);
    return {
      ...row,
      categories: cat as { name: string; color: string } | null,
      subcategories: sub as { name: string } | null,
    };
  });

  const totalOutstanding = (loansRes.data || []).reduce(
    (s, l) => s + ((l.principal as number) - (l.amount_paid as number)),
    0
  );

  return {
    all_expenses: allExpenses,
    monthly_trend: monthlyTrend,
    recent_expenses: recentExpenses,
    today_str: todayStr,
    total_outstanding_loans: Math.round(totalOutstanding),
    active_loan_count: loansRes.data?.length || 0,
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
