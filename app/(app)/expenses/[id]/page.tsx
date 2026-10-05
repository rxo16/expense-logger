import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { formatCurrency, formatDate, PAYMENT_MODE_LABELS } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Calendar, Tag, CreditCard, FileText, Users } from "lucide-react";
import { DeleteExpenseButton } from "./DeleteExpenseButton";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: expense } = await supabase
    .from("expenses")
    .select("*, categories(name, color, icon), subcategories(name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!expense) notFound();

  const cat = expense.categories as { name: string; color: string } | null;
  const sub = expense.subcategories as { name: string } | null;

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/expenses"
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ArrowLeft size={17} className="text-white" />
          </Link>
          <h1 className="text-lg font-medium">Expense Detail</h1>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 text-center">
          <p className="text-white/70 text-xs mb-1">{expense.description}</p>
          <p className="text-4xl font-bold">{formatCurrency(expense.amount)}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 animate-fade-in">
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Calendar size={16} className="text-[var(--brand)] flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">Date</span>
            <span className="text-sm font-medium text-foreground">
              {formatDate(expense.expense_date, "dd MMM yyyy")}
            </span>
          </div>

          <div className="flex items-center gap-3 px-4 py-3.5">
            <Tag size={16} className="text-[var(--brand)] flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">Category</span>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: cat?.color || "#0F9E76" }}
              />
              <span className="text-sm font-medium text-foreground">
                {cat?.name || "—"}
                {sub?.name ? ` · ${sub.name}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3.5">
            <CreditCard size={16} className="text-[var(--brand)] flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">Payment</span>
            <span className="text-sm font-medium text-foreground">
              {PAYMENT_MODE_LABELS[expense.payment_mode] || expense.payment_mode}
            </span>
          </div>

          <div className="flex items-center gap-3 px-4 py-3.5">
            <Users size={16} className="text-[var(--brand)] flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">Incurred For</span>
            <span className="text-sm font-medium text-foreground capitalize">
              {expense.incurred_for || "Self"}
            </span>
          </div>

          {expense.notes && (
            <div className="flex items-start gap-3 px-4 py-3.5">
              <FileText size={16} className="text-[var(--brand)] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground flex-shrink-0">Notes</span>
              <span className="text-sm font-medium text-foreground text-right flex-1">
                {expense.notes}
              </span>
            </div>
          )}
        </div>

        <DeleteExpenseButton expenseId={expense.id} />
      </div>
    </div>
  );
}
