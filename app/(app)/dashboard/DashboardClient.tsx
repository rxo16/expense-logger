"use client";

import { formatCurrency, formatDateRelative, percentageChange } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { TrendingDown, TrendingUp, Minus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Props {
  data: {
    current_month_total: number;
    last_month_total: number;
    today_total: number;
    current_month_count: number;
    top_categories: Array<{
      category_id: string;
      category_name: string;
      category_color: string;
      total: number;
      percentage: number;
    }>;
    monthly_trend: Array<{
      label: string;
      total: number;
      month: number;
      year: number;
    }>;
    recent_expenses: Array<{
      id: string;
      amount: number;
      description: string;
      expense_date: string;
      categories?: { name: string; color: string } | null;
      subcategories?: { name: string } | null;
    }>;
  };
  userName: string;
}

export function DashboardClient({ data, userName }: Props) {
  const change = percentageChange(data.current_month_total, data.last_month_total);
  const isUp = change > 0;
  const isDown = change < 0;
  const currentMonth = format(new Date(), "MMMM yyyy");

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      {/* Header */}
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">Good morning,</p>
            <h1 className="text-xl font-medium capitalize">{userName}</h1>
            <p className="text-white/60 text-xs mt-0.5">{currentMonth}</p>
          </div>
          <Link
            href="/settings"
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
          >
            <span className="text-white text-sm font-medium">
              {userName.charAt(0).toUpperCase()}
            </span>
          </Link>
        </div>

        {/* Hero stat */}
        <div className="mt-5 bg-white/10 rounded-2xl p-4">
          <p className="text-white/70 text-xs mb-1">This month's spend</p>
          <p className="text-3xl font-semibold tracking-tight">
            {formatCurrency(data.current_month_total)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {isUp ? (
              <TrendingUp size={13} className="text-red-300" />
            ) : isDown ? (
              <TrendingDown size={13} className="text-emerald-300" />
            ) : (
              <Minus size={13} className="text-white/50" />
            )}
            <span className={`text-xs ${isUp ? "text-red-300" : isDown ? "text-emerald-300" : "text-white/50"}`}>
              {Math.abs(change)}% vs last month ({formatCurrency(data.last_month_total, "INR", true)})
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 animate-fade-in">
        {/* Stat row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Today</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(data.today_total)}
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Transactions</p>
            <p className="text-xl font-semibold text-foreground">
              {data.current_month_count}
            </p>
          </div>
        </div>

        {/* 6-month bar chart */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            6-month trend
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data.monthly_trend} barCategoryGap="30%">
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground, #888)" }}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Spent"]}
                contentStyle={{
                  background: "var(--card)",
                  border: "0.5px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {data.monthly_trend.map((entry, index) => {
                  const isCurrentMonth =
                    index === data.monthly_trend.length - 1;
                  return (
                    <Cell
                      key={entry.label}
                      fill={isCurrentMonth ? "var(--brand)" : "#D1EAE1"}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top categories */}
        {data.top_categories.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Top categories
            </p>
            <div className="space-y-3">
              {data.top_categories.map((cat) => (
                <div key={cat.category_id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: cat.category_color }}
                      />
                      <span className="text-sm text-foreground">{cat.category_name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${cat.percentage}%`,
                        background: cat.category_color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent expenses */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent expenses
            </p>
            <Link href="/expenses" className="text-xs text-[var(--brand)] font-medium flex items-center gap-0.5">
              See all <ChevronRight size={12} />
            </Link>
          </div>

          {data.recent_expenses.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No expenses yet this month</p>
              <Link
                href="/expenses/add"
                className="mt-2 inline-block text-sm text-[var(--brand)] font-medium"
              >
                Add your first expense →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.recent_expenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
                >
                  {/* Color dot */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${expense.categories?.color || "#0F9E76"}22` }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: expense.categories?.color || "#0F9E76" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {expense.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {expense.categories?.name}
                      {expense.subcategories?.name ? ` · ${expense.subcategories.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(expense.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateRelative(expense.expense_date)}
                    </p>
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
