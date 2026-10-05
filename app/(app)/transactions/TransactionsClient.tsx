"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateRelative, formatDate, cn } from "@/lib/utils";
import { INCURRED_FOR_PRESETS } from "@/lib/validations";
import {
  Search, SlidersHorizontal, X, Plus, ChevronDown, ChevronUp,
  Pencil, Trash2, Check, Smartphone, CreditCard, Banknote, Building2, MoreHorizontal, PenLine,
} from "lucide-react";
import { format, subMonths } from "date-fns";

interface Subcategory { id: string; name: string; }
interface Category { id: string; name: string; color: string; subcategories?: Subcategory[]; }
interface Lender { id: string; name: string; initials: string; is_default: boolean; }
interface Expense {
  id: string; amount: number; description: string; notes?: string;
  expense_date: string; payment_mode: string; incurred_for?: string;
  is_loan?: boolean; lender_id?: string | null;
  category_id: string; subcategory_id?: string | null;
  categories?: { id: string; name: string; color: string } | null;
  subcategories?: { id: string; name: string } | null;
  lenders?: { id: string; name: string; initials: string } | null;
}
interface Props { expenses: Expense[]; categories: Category[]; lenders: Lender[]; }

const PAYMENT_MODES = [
  { value: "upi",           label: "UPI",          icon: Smartphone     },
  { value: "card",          label: "Card",          icon: CreditCard     },
  { value: "cash",          label: "Cash",          icon: Banknote       },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2      },
  { value: "other",         label: "Other",         icon: MoreHorizontal },
] as const;

function buildMonthOptions() {
  const opts = [{ value: "all", label: "All months" }];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(), i);
    opts.push({ value: format(d, "yyyy-MM"), label: format(d, "MMM yyyy") });
  }
  return opts;
}
const MONTH_OPTIONS = buildMonthOptions();

function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-destructive font-medium">Sure?</span>
      <button onClick={() => { setConfirming(false); onConfirm(); }}
        className="text-[11px] px-2 py-0.5 rounded-lg bg-destructive text-white font-medium">Delete</button>
      <button onClick={() => setConfirming(false)}
        className="text-[11px] px-2 py-0.5 rounded-lg bg-secondary border border-border text-muted-foreground font-medium">Cancel</button>
    </div>
  );
  return (
    <button onClick={() => setConfirming(true)}
      className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive flex-shrink-0">
      <Trash2 size={13} />
    </button>
  );
}

function EditForm({ expense, categories, lenders, onSave, onCancel }: {
  expense: Expense; categories: Category[]; lenders: Lender[];
  onSave: (updates: Partial<Expense>) => Promise<void>; onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(expense.amount));
  const [description, setDescription] = useState(expense.description);
  const [date, setDate] = useState(expense.expense_date);
  const [notes, setNotes] = useState(expense.notes || "");
  const [categoryId, setCategoryId] = useState(expense.category_id);
  const [subcategoryId, setSubcategoryId] = useState(expense.subcategory_id || "");
  const [paymentMode, setPaymentMode] = useState(expense.payment_mode);
  const [incurredFor, setIncurredFor] = useState(expense.incurred_for || "self");
  const [isLoan, setIsLoan] = useState(expense.is_loan || false);
  const [lenderId, setLenderId] = useState(expense.lender_id || lenders.find(l => l.is_default)?.id || "");
  const [customName, setCustomName] = useState(
    INCURRED_FOR_PRESETS.some(p => p.value === (expense.incurred_for || "self")) ? "" : (expense.incurred_for || "")
  );
  const [showCustom, setShowCustom] = useState(
    !INCURRED_FOR_PRESETS.some(p => p.value === (expense.incurred_for || "self"))
  );
  const [saving, setSaving] = useState(false);
  const customRef = useRef<HTMLInputElement>(null);

  const selectedCat = categories.find(c => c.id === categoryId);
  const activePreset = INCURRED_FOR_PRESETS.find(p => p.value === incurredFor)?.value || (showCustom ? "custom" : "self");

  function handlePreset(val: string) {
    if (val === "custom") { setShowCustom(true); setTimeout(() => customRef.current?.focus(), 50); }
    else { setIncurredFor(val); setShowCustom(false); }
  }

  async function handleSave() {
    const num = parseFloat(amount);
    if (!description.trim() || isNaN(num) || num <= 0) return;
    setSaving(true);
    await onSave({
      amount: num, description: description.trim(), notes: notes.trim() || undefined,
      expense_date: date, category_id: categoryId,
      subcategory_id: subcategoryId || null, payment_mode: paymentMode,
      incurred_for: showCustom ? customName : incurredFor,
      is_loan: isLoan, lender_id: isLoan ? lenderId : null,
    });
    setSaving(false);
  }

  const inputCls = "w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[var(--brand)] transition-colors";
  const chipCls = (active: boolean) => cn(
    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
    active ? "bg-[var(--brand-light)] border-[var(--brand)] text-[var(--brand-dark)]" : "bg-secondary border-border text-muted-foreground"
  );

  return (
    <div className="border-t border-border bg-secondary/30 p-4 space-y-4">
      {/* Amount + Details */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</p>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Amount (₹)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" className={inputCls} />
        </div>
      </div>

      {/* Loan */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Loan</p>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-foreground">Mark as loan</p>
          <button type="button" onClick={() => setIsLoan(!isLoan)}
            className={cn("w-11 h-6 rounded-full relative transition-colors", isLoan ? "bg-[var(--brand)]" : "bg-muted")}
            role="switch" aria-checked={isLoan}>
            <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", isLoan ? "translate-x-5" : "translate-x-0.5")} />
          </button>
        </div>
        {isLoan && lenders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lenders.map(l => (
              <button key={l.id} type="button" onClick={() => setLenderId(l.id)}
                className={chipCls(lenderId === l.id)}>
                <span className="w-5 h-5 rounded-full bg-[var(--brand)] flex items-center justify-center text-[9px] text-white font-bold">{l.initials}</span>
                {l.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Incurred For */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Incurred For</p>
        <div className="flex flex-wrap gap-2">
          {INCURRED_FOR_PRESETS.map(({ value, label, emoji }) => (
            <button key={value} type="button" onClick={() => handlePreset(value)} className={chipCls(activePreset === value)}>
              <span className="text-sm leading-none">{emoji}</span>{label}
              {value === "custom" && activePreset === "custom" && <PenLine size={10} />}
            </button>
          ))}
        </div>
        {showCustom && (
          <input ref={customRef} value={customName}
            onChange={e => { setCustomName(e.target.value); setIncurredFor(e.target.value); }}
            placeholder="e.g. Colleague, Client…"
            className="mt-3 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-[var(--brand)]" />
        )}
      </div>

      {/* Category */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Category</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {categories.map(cat => (
            <button key={cat.id} type="button"
              onClick={() => { setCategoryId(cat.id); setSubcategoryId(""); }}
              className={cn("rounded-xl p-2.5 text-center border transition-all",
                categoryId === cat.id ? "border-[var(--brand)] bg-[var(--brand-light)]" : "border-border bg-secondary")}>
              <span className="w-3 h-3 rounded-full block mx-auto mb-1.5" style={{ background: cat.color }} />
              <span className={cn("text-xs font-medium line-clamp-1",
                categoryId === cat.id ? "text-[var(--brand-dark)]" : "text-muted-foreground")}>{cat.name}</span>
            </button>
          ))}
        </div>
        {selectedCat?.subcategories && selectedCat.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCat.subcategories.map(sub => (
              <button key={sub.id} type="button"
                onClick={() => setSubcategoryId(subcategoryId === sub.id ? "" : sub.id)}
                className={chipCls(subcategoryId === sub.id)}>{sub.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* Payment mode */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payment Mode</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_MODES.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" onClick={() => setPaymentMode(value as "upi" | "card" | "cash" | "bank_transfer" | "other")}
              className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                paymentMode === value
                  ? "bg-[var(--brand-light)] border-[var(--brand)] text-[var(--brand-dark)]"
                  : "bg-secondary border-border text-muted-foreground")}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-border bg-secondary text-sm font-medium text-foreground">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-2xl bg-[var(--brand)] text-white text-sm font-semibold disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

export function TransactionsClient({ expenses: initial, categories, lenders }: Props) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initial);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterIncurredFor, setFilterIncurredFor] = useState("");
  const [filterLoanOnly, setFilterLoanOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeFilterCount = [
    filterMonth !== "all", !!filterCategoryId, !!filterIncurredFor, filterLoanOnly,
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    let list = expenses;
    if (filterMonth !== "all") list = list.filter(e => e.expense_date.startsWith(filterMonth));
    if (filterCategoryId) list = list.filter(e => e.category_id === filterCategoryId);
    if (filterIncurredFor) list = list.filter(e => (e.incurred_for || "self") === filterIncurredFor);
    if (filterLoanOnly) list = list.filter(e => e.is_loan);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (e.categories?.name || "").toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, filterMonth, filterCategoryId, filterIncurredFor, filterLoanOnly, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      if (!map.has(e.expense_date)) map.set(e.expense_date, []);
      map.get(e.expense_date)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const loanTotal = filtered.filter(e => e.is_loan).reduce((s, e) => s + e.amount, 0);

  async function handleSave(id: string, updates: Partial<Expense>) {
    const supabase = createClient();
    const { error } = await supabase.from("expenses").update(updates).eq("id", id);
    if (!error) {
      setExpenses(prev => prev.map(e => {
        if (e.id !== id) return e;
        const cat = categories.find(c => c.id === (updates.category_id || e.category_id));
        const sub = cat?.subcategories?.find(s => s.id === updates.subcategory_id);
        const lender = lenders.find(l => l.id === updates.lender_id);
        return {
          ...e, ...updates,
          categories: cat ? { id: cat.id, name: cat.name, color: cat.color } : e.categories,
          subcategories: sub ? { id: sub.id, name: sub.name } : (updates.subcategory_id === null ? null : e.subcategories),
          lenders: lender ? { id: lender.id, name: lender.name, initials: lender.initials } : (updates.lender_id === null ? null : e.lenders),
        };
      }));
      setEditingId(null);
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  function clearFilters() {
    setFilterMonth("all"); setFilterCategoryId(""); setFilterIncurredFor(""); setFilterLoanOnly(false); setSearch("");
  }

  const chipCls = (active: boolean) => cn(
    "flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
    active ? "bg-white text-[var(--brand)] border-white" : "border-white/30 text-white/70"
  );

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      {/* Header */}
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-medium">Transactions</h1>
          <button onClick={() => router.push("/expenses/add")}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center" aria-label="Add expense">
            <Plus size={18} className="text-white" />
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <Search size={15} className="text-white/60 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search transactions…"
              className="bg-transparent text-white placeholder:text-white/50 text-sm flex-1 outline-none" />
            {search && <button onClick={() => setSearch("")}><X size={14} className="text-white/60" /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("w-10 h-10 rounded-xl flex items-center justify-center relative",
              activeFilterCount > 0 ? "bg-white text-[var(--brand)]" : "bg-white/10 text-white")}>
            <SlidersHorizontal size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3">
            {/* Month */}
            <div>
              <p className="text-white/60 text-[10px] uppercase tracking-wider mb-1.5">Month</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {MONTH_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setFilterMonth(opt.value)}
                    className={chipCls(filterMonth === opt.value)}>{opt.label}</button>
                ))}
              </div>
            </div>
            {/* Category */}
            <div>
              <p className="text-white/60 text-[10px] uppercase tracking-wider mb-1.5">Category</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button onClick={() => setFilterCategoryId("")} className={chipCls(!filterCategoryId)}>All</button>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setFilterCategoryId(filterCategoryId === c.id ? "" : c.id)}
                    className={cn("flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium",
                      filterCategoryId === c.id ? "bg-white text-[var(--brand)] border-white" : "border-white/30 text-white/70")}>
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Incurred For */}
            <div>
              <p className="text-white/60 text-[10px] uppercase tracking-wider mb-1.5">Incurred For</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button onClick={() => setFilterIncurredFor("")} className={chipCls(!filterIncurredFor)}>All</button>
                {INCURRED_FOR_PRESETS.filter(p => p.value !== "custom").map(({ value, label, emoji }) => (
                  <button key={value} onClick={() => setFilterIncurredFor(filterIncurredFor === value ? "" : value)}
                    className={cn("flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border font-medium",
                      filterIncurredFor === value ? "bg-white text-[var(--brand)] border-white" : "border-white/30 text-white/70")}>
                    <span className="text-sm leading-none">{emoji}</span>{label}
                  </button>
                ))}
              </div>
            </div>
            {/* Loans only toggle */}
            <button onClick={() => setFilterLoanOnly(!filterLoanOnly)}
              className={cn("flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
                filterLoanOnly ? "bg-white text-[var(--brand)] border-white" : "border-white/30 text-white/70")}>
              💳 Loans only
            </button>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-white/70 underline">Clear all filters</button>
            )}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="px-4 py-2.5 bg-card border-b border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          {filterLoanOnly ? " · loans" : activeFilterCount > 0 ? " · filtered" : ""}
        </span>
        <div className="text-right">
          <span className="text-sm font-semibold text-foreground">{formatCurrency(totalFiltered)}</span>
          {loanTotal > 0 && !filterLoanOnly && (
            <span className="text-[10px] text-amber-500 block">₹{loanTotal.toLocaleString("en-IN")} loans</span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-5 animate-fade-in">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--brand-light)] flex items-center justify-center mb-4">
              <Search size={28} className="text-[var(--brand)]" />
            </div>
            <p className="text-muted-foreground text-sm">No transactions found</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-3 text-sm text-[var(--brand)] font-medium">Clear filters</button>
            )}
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
                  <div key={expense.id}
                    className={cn("transition-all", idx < items.length - 1 && editingId !== expense.id ? "border-b border-border" : "")}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Color dot */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${expense.categories?.color || "#0F9E76"}22` }}>
                        <span className="w-3 h-3 rounded-full" style={{ background: expense.categories?.color || "#0F9E76" }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground truncate">{expense.description}</p>
                          {expense.is_loan && (
                            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-700">
                              {expense.lenders?.initials || "LOAN"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {expense.categories?.name}
                          {expense.subcategories?.name ? ` · ${expense.subcategories.name}` : ""}
                          {" · "}<span className="capitalize">{expense.incurred_for || "self"}</span>
                        </p>
                      </div>

                      <p className="text-sm font-semibold text-foreground flex-shrink-0">{formatCurrency(expense.amount)}</p>

                      <button onClick={() => setEditingId(editingId === expense.id ? null : expense.id)}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0">
                        {editingId === expense.id ? <ChevronUp size={14} /> : <Pencil size={13} />}
                      </button>
                      <ConfirmDelete onConfirm={() => handleDelete(expense.id)} />
                    </div>

                    {editingId === expense.id && (
                      <EditForm
                        expense={expense} categories={categories} lenders={lenders}
                        onSave={(updates) => handleSave(expense.id, updates)}
                        onCancel={() => setEditingId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div className="h-2" />
      </div>

      {/* FAB */}
      <button onClick={() => router.push("/expenses/add")}
        className="fixed bottom-20 right-4 w-14 h-14 bg-[var(--brand)] rounded-full shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
        aria-label="Add expense">
        <Plus size={26} className="text-white" />
      </button>
    </div>
  );
}
