import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay } from "date-fns";

// GET /api/dashboard — aggregated dashboard data
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const currStart = format(startOfMonth(now), "yyyy-MM-dd");
  const currEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const lastStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const lastEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const todayStr = format(startOfDay(now), "yyyy-MM-dd");
  const trendStart = format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd");

  const [curr, last, today, trend, recent] = await Promise.all([
    supabase.from("expenses").select("amount").eq("user_id", user.id).gte("expense_date", currStart).lte("expense_date", currEnd),
    supabase.from("expenses").select("amount").eq("user_id", user.id).gte("expense_date", lastStart).lte("expense_date", lastEnd),
    supabase.from("expenses").select("amount").eq("user_id", user.id).eq("expense_date", todayStr),
    supabase.from("expenses").select("amount, expense_date, category_id, categories(name,color)").eq("user_id", user.id).gte("expense_date", trendStart).lte("expense_date", currEnd),
    supabase.from("expenses").select("*, categories(name,color,icon), subcategories(name)").eq("user_id", user.id).order("expense_date", { ascending: false }).limit(5),
  ]);

  const sum = (rows: { amount: number }[]) => rows?.reduce((a, r) => a + r.amount, 0) ?? 0;

  return NextResponse.json({
    data: {
      current_month_total: Math.round(sum(curr.data || [])),
      last_month_total: Math.round(sum(last.data || [])),
      today_total: Math.round(sum(today.data || [])),
      current_month_count: curr.data?.length || 0,
      trend: trend.data || [],
      recent_expenses: recent.data || [],
    },
  });
}
