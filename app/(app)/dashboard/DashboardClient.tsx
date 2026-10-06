"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatDateRelative, percentageChange } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { TrendingDown, TrendingUp, Minus, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format, subMonths, addMonths, endOfMonth, parseISO } from "date-fns";

interface RawExpense {
  amount: number; expense_date: string; category_id: string;
  categories?: { name: string; color: string; icon: string } | null;
}
interface RecentExpense {
  id: string; amount: number; description: string; expense_date: string;
  categories?: { name: string; color: string } | null;
  subcategories?: { name: string } | null;
}
interface MonthTrend {
  label: string; total: number; month: number; year: number; monthKey: string;
}
interface Props {
  data: {
    all_expenses: RawExpense[];
    monthly_trend: MonthTrend[];
    recent_expenses: RecentExpense[];
    today_str: string;
    total_outstanding_loans: number;
    active_loan_count: number;
  };
  userName: string;
}

export function DashboardClient({ data, userName }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const selectedDate = parseISO(selectedMonth + "-01");
  const selectedLabel = format(selectedDate, "MMMM yyyy");
  const isCurrentMonth = selectedMonth === format(new Date(), "yyyy-MM");
  const earliestMonth = format(subMonths(new Date(), 5), "yyyy-MM");

  function prevMonth() {
    const prev = format(subMonths(selectedDate, 1), "yyyy-MM");
    if (prev >= earliestMonth) setSelectedMonth(prev);
  }
  function nextMonth() {
    const next = format(addMonths(selectedDate, 1), "yyyy-MM");
    if (next <= format(new Date(), "yyyy-MM")) setSelectedMonth(next);
  }

  const monthExpenses = useMemo(
    () => data.all_expenses.filter(e => e.expense_date.startsWith(selectedMonth)),
    [data.all_expenses, selectedMonth]
  );
  const prevMonthKey = format(subMonths(selectedDate, 1), "yyyy-MM");
  const prevTotal = useMemo(
    () => Math.round(data.all_expenses.filter(e => e.expense_date.startsWith(prevMonthKey)).reduce((s, e) => s + e.amount, 0)),
    [data.all_expenses, prevMonthKey]
  );
  const selectedTotal = useMemo(
    () => Math.round(monthExpenses.reduce((s, e) => s + e.amount, 0)),
    [monthExpenses]
  );
  const todayTotal = useMemo(
    () => Math.round(data.all_expenses.filter(e => e.expense_date === data.today_str).reduce((s, e) => s + e.amount, 0)),
    [data.all_expenses, data.today_str]
  );
  const txCount = monthExpenses.length;
  const change = percentageChange(selectedTotal, prevTotal);
  const isUp = change > 0;
  const isDown = change < 0;

  const topCategories = useMemo(() => {
    const catMap = new Map<string, { name: string; color: string; total: number }>();
    for (const row of monthExpenses) {
      const cat = (row.categories as any) as { name: string; color: string } | null;
      if (!cat || !row.category_id) continue;
      const ex = catMap.get(row.category_id);
      if (ex) ex.total += row.amount;
      else catMap.set(row.category_id, { name: cat.name, color: cat.color, total: row.amount });
    }
    return Array.from(catMap.entries())
      .map(([id, v]) => ({
        category_id: id, category_name: v.name, category_color: v.color,
        total: Math.round(v.total),
        percentage: selectedTotal > 0 ? Math.round((v.total / selectedTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [monthExpenses, selectedTotal]);

  const trendData = data.monthly_trend.map(m => ({ ...m, isSelected: m.monthKey === selectedMonth }));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">

      {/* Header */}
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm">{greeting()},</p>
            <h1 className="text-xl font-medium capitalize">{userName}</h1>
          </div>
          <Link href="/settings"
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">{userName.charAt(0).toUpperCase()}</span>
          </Link>
        </div>

        {/* Month picker */}
        <div className="flex items-center justify-between bg-white/10 rounded-2xl px-4 py-3 mb-3">
          <button onClick={prevMonth} disabled={selectedMonth <= earliestMonth}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ChevronLeft size={16} className="text-white" />
          </button>
          <div className="text-center">
            <p className="text-white/70 text-xs mb-0.5">{isCurrentMonth ? "Current month" : "Selected month"}</p>
            <p className="text-white text-base font-semibold">{selectedLabel}</p>
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30">
            <ChevronRight size={16} className="text-white" />
          </button>
        </div>

        {/* Hero spend */}
        <div className="bg-white/10 rounded-2xl p-4">
          <p className="text-white/70 text-xs mb-1">Total spend</p>
          <p className="text-3xl font-semibold tracking-tight">{formatCurrency(selectedTotal)}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {isUp ? <TrendingUp size={13} className="text-red-300" />
              : isDown ? <TrendingDown size={13} className="text-emerald-300" />
              : <Minus size={13} className="text-white/50" />}
            <span className={`text-xs ${isUp ? "text-red-300" : isDown ? "text-emerald-300" : "text-white/50"}`}>
              {Math.abs(change)}% vs {format(subMonths(selectedDate, 1), "MMM")} ({formatCurrency(prevTotal, "INR", true)})
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 animate-fade-in">

        {/* Stat row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">{isCurrentMonth ? "Today" : format(endOfMonth(selectedDate), "dd MMM")}</p>
            <p className="text-xl font-semibold text-foreground">{isCurrentMonth ? formatCurrency(todayTotal) : "—"}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Transactions</p>
            <p className="text-xl font-semibold text-foreground">{txCount}</p>
          </div>
        </div>

        {/* Loan outstanding card */}
        {data.total_outstanding_loans > 0 && (
          <Link href="/loans" className="block">
            <div className="bg-card rounded-2xl border border-amber-200 dark:border-amber-800 p-4 flex items-center gap-3 active:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Loan Outstanding</p>
                <p className="text-xs text-muted-foreground">
                  {data.active_loan_count} active loan{data.active_loan_count !== 1 ? "s" : ""} · tap to settle
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(data.total_outstanding_loans)}
                </p>
                <ChevronRight size={14} className="text-muted-foreground ml-auto mt-0.5" />
              </div>
            </div>
          </Link>
        )}

        {/* 6-month trend */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            6-month trend · tap bar to switch
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={trendData}
              barCategoryGap="30%"
              onClick={(d) => {
                if (d?.activePayload?.[0]) {
                  const mk = d.activePayload[0].payload.monthKey;
                  if (mk) setSelectedMonth(mk);
                }
              }}
            >
              <XAxis dataKey="label" axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }} />
              <YAxis hide />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Spent"]}
                contentStyle={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {trendData.map((entry) => (
                  <Cell key={entry.monthKey} fill={entry.isSelected ? "var(--brand)" : "#D1EAE1"} style={{ cursor: "pointer" }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top categories — sorted highest to lowest */}
        {topCategories.length > 0 ? (
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Top categories</p>
              <span className="text-xs text-muted-foreground">{format(selectedDate, "MMM yyyy")}</span>
            </div>
            <div className="space-y-3">
              {topCategories.map((cat, idx) => (
                <div key={cat.category_id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">{idx + 1}</span>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.category_color }} />
                      <span className="text-sm text-foreground">{cat.category_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{cat.percentage}%</span>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(cat.total)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden ml-6">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${cat.percentage}%`, background: cat.category_color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No expenses in {selectedLabel}</p>
            <Link href="/expenses/add" className="mt-2 inline-block text-sm text-[var(--brand)] font-medium">
              Add an expense →
            </Link>
          </div>
        )}

        {/* Recent expenses */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent expenses</p>
            <Link href="/transactions" className="text-xs text-[var(--brand)] font-medium flex items-center gap-0.5">
              See all <ChevronRight size={12} />
            </Link>
          </div>
          {data.recent_expenses.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No expenses yet</p>
              <Link href="/expenses/add" className="mt-2 inline-block text-sm text-[var(--brand)] font-medium">
                Add your first expense →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.recent_expenses.map((expense) => (
                <Link key={expense.id} href="/transactions"
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 active:opacity-70 transition-opacity">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${expense.categories?.color || "#0F9E76"}22` }}>
                    <span className="w-3 h-3 rounded-full" style={{ background: expense.categories?.color || "#0F9E76" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {expense.categories?.name}
                      {expense.subcategories?.name ? ` · ${expense.subcategories.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(expense.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateRelative(expense.expense_date)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}
