"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateRelative, formatDate } from "@/lib/utils";
import { Search, SlidersHorizontal, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Expense {
  id: string;
  amount: number;
  description: string;
  expense_date: string;
  payment_mode: string;
  notes?: string;
  categories?: { name: string; color: string; icon: string } | null;
  subcategories?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Props {
  expenses: Expense[];
  categories: Category[];
}

export function ExpensesClient({ expenses: initial, categories }: Props) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initial);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = expenses;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.categories?.name.toLowerCase().includes(q)
      );
    }
    if (filterCat) {
      list = list.filter((e) => {
        const cat = e.categories as { name: string } | null;
        return cat?.name === filterCat;
      });
    }
    return list;
  }, [expenses, search, filterCat]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const key = e.expense_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      {/* Header */}
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-medium">Expenses</h1>
          <button
            onClick={() => router.push("/expenses/add")}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            aria-label="Add expense"
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <Search size={15} className="text-white/60 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses..."
              className="bg-transparent text-white placeholder:text-white/50 text-sm flex-1 outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X size={14} className="text-white/60" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              filterCat ? "bg-white text-[var(--brand)]" : "bg-white/10 text-white"
            }`}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Category filter chips */}
        {showFilters && (
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setFilterCat("")}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                !filterCat
                  ? "bg-white text-[var(--brand)] border-white font-medium"
                  : "border-white/30 text-white/70"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilterCat(filterCat === c.name ? "" : c.name)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  filterCat === c.name
                    ? "bg-white text-[var(--brand)] border-white font-medium"
                    : "border-white/30 text-white/70"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          {filterCat ? ` · ${filterCat}` : ""}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(totalFiltered)}
        </span>
      </div>

      {/* Expenses list */}
      <div className="px-4 py-4 space-y-5 animate-fade-in">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--brand-light)] flex items-center justify-center mb-4">
              <Search size={28} className="text-[var(--brand)]" />
            </div>
            <p className="text-muted-foreground text-sm">No expenses found</p>
            <button
              onClick={() => router.push("/expenses/add")}
              className="mt-4 text-sm text-[var(--brand)] font-medium"
            >
              + Add an expense
            </button>
          </div>
        ) : (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {formatDateRelative(date)} · {formatDate(date, "dd MMM")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(items.reduce((s, e) => s + e.amount, 0))}
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                {items.map((expense, idx) => (
                  <div
                    key={expense.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      idx < items.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${expense.categories?.color || "#0F9E76"}22`,
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: expense.categories?.color || "#0F9E76" }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0" onClick={() => router.push(`/expenses/${expense.id}`)}>
                      <p className="text-sm font-medium text-foreground truncate">
                        {expense.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expense.categories?.name}
                        {expense.subcategories?.name
                          ? ` · ${expense.subcategories.name}`
                          : ""}
                        {" · "}
                        <span className="uppercase text-[10px]">
                          {expense.payment_mode?.replace("_", " ")}
                        </span>
                      </p>
                    </div>

                    {/* Amount + delete */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(expense.amount)}
                      </p>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive disabled:opacity-40"
                        aria-label="Delete expense"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}
