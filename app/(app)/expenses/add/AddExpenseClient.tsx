"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { INCURRED_FOR_PRESETS } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import {
  ArrowLeft, Smartphone, CreditCard, Banknote, Building2, MoreHorizontal, PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Subcategory { id: string; name: string; }
interface Category { id: string; name: string; color: string; icon: string; subcategories?: Subcategory[]; }
interface Lender { id: string; name: string; initials: string; is_default: boolean; }
interface Props { categories: Category[]; lenders: Lender[]; }

const PAYMENT_MODES = [
  { value: "upi",           label: "UPI",          icon: Smartphone     },
  { value: "card",          label: "Card",          icon: CreditCard     },
  { value: "cash",          label: "Cash",          icon: Banknote       },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2      },
  { value: "other",         label: "Other",         icon: MoreHorizontal },
] as const;

export function AddExpenseClient({ categories, lenders }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || "");
  const [amountDisplay, setAmountDisplay] = useState("");

  // Incurred For
  const [selectedPreset, setSelectedPreset] = useState("self");
  const [customName, setCustomName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Loan fields
  const defaultLender = lenders.find(l => l.is_default) || lenders[0];
  // Read default from settings (stored in localStorage by SettingsClient)
  const [isLoan, setIsLoan] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("loan_default_on");
      return stored !== null ? stored === "true" : true; // default ON
    }
    return true;
  });
  const [selectedLenderId, setSelectedLenderId] = useState(defaultLender?.id || "");

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  type PaymentMode = "upi" | "card" | "cash" | "bank_transfer" | "other";
  type FormValues = {
    amount: number;
    description: string;
    notes: string;
    category_id: string;
    subcategory_id: string;
    payment_mode: PaymentMode;
    expense_date: string;
    incurred_for: string;
  };

  const { register, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        amount: 0, description: "", notes: "",
        category_id: categories[0]?.id || "",
        subcategory_id: "",
        payment_mode: "upi",
        expense_date: format(new Date(), "yyyy-MM-dd"),
        incurred_for: "self",
      },
    });

  const paymentMode = watch("payment_mode");
  const subcategoryId = watch("subcategory_id");

  function handlePresetSelect(value: string) {
    if (value === "custom") {
      setSelectedPreset("custom"); setShowCustomInput(true);
      setValue("incurred_for", customName || "");
      setTimeout(() => customInputRef.current?.focus(), 50);
    } else {
      setSelectedPreset(value); setShowCustomInput(false); setCustomName("");
      setValue("incurred_for", value);
    }
  }

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        amount: values.amount,
        description: values.description,
        notes: values.notes || null,
        category_id: values.category_id,
        subcategory_id: values.subcategory_id || null,
        payment_mode: values.payment_mode,
        expense_date: values.expense_date,
        incurred_for: values.incurred_for || "self",
        is_loan: isLoan,
        lender_id: isLoan && selectedLenderId ? selectedLenderId : null,
      });

      if (error) throw error;
      router.push("/transactions");
      router.refresh();
    } catch (err) {
      console.error(err); setSaving(false);
    }
  }

  function handleCategorySelect(catId: string) {
    setSelectedCategoryId(catId);
    setValue("category_id", catId);
    setValue("subcategory_id", "");
  }

  const inputCls = "w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[var(--brand)] transition-colors";
  const chipCls = (active: boolean) => cn(
    "flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all active:scale-95",
    active ? "bg-[var(--brand-light)] border-[var(--brand)] text-[var(--brand-dark)]"
           : "bg-secondary border-border text-muted-foreground"
  );

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center" aria-label="Go back">
            <ArrowLeft size={17} className="text-white" />
          </button>
          <h1 className="text-lg font-medium">Log Expense</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="px-4 py-4 space-y-4">

          {/* Amount */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-xs text-muted-foreground text-center uppercase tracking-wide mb-3">Amount</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-3xl text-muted-foreground font-light">₹</span>
              <input type="number" inputMode="decimal" placeholder="0" value={amountDisplay}
                onChange={(e) => {
                  setAmountDisplay(e.target.value);
                  const num = parseFloat(e.target.value);
                  setValue("amount", isNaN(num) ? 0 : num, { shouldValidate: true });
                }}
                className="text-4xl font-semibold text-[var(--brand)] bg-transparent border-none outline-none w-40 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
            <div className="w-28 h-0.5 bg-[var(--brand)] rounded-full mx-auto mt-2" />
            {errors.amount && <p className="text-xs text-destructive text-center mt-2">{String(errors.amount.message)}</p>}
          </div>

          {/* Details */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description *</label>
              <input {...register("description")} placeholder="What did you spend on?" className={cn(inputCls, errors.description ? "border-destructive" : "")} />
              {errors.description && <p className="text-xs text-destructive mt-1">{String(errors.description.message)}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Date</label>
              <input type="date" {...register("expense_date")} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes (optional)</label>
              <input {...register("notes")} placeholder="Add a note..." className={inputCls} />
            </div>
          </div>

          {/* ── Loan tagging ── */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Loan</p>

            {/* Is Loan toggle */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-foreground">Mark as loan</p>
                <p className="text-xs text-muted-foreground">This expense was paid by someone else</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLoan(!isLoan)}
                className={cn("w-11 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-0.5", isLoan ? "bg-[var(--brand)]" : "bg-muted")}
                role="switch" aria-checked={isLoan}
              >
                <span className={cn("w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 flex-shrink-0", isLoan ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>

            {/* Lender selector — shown only when isLoan */}
            {isLoan && lenders.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Lender</label>
                <div className="flex flex-wrap gap-2">
                  {lenders.map(lender => (
                    <button
                      key={lender.id}
                      type="button"
                      onClick={() => setSelectedLenderId(lender.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all",
                        selectedLenderId === lender.id
                          ? "bg-[var(--brand-light)] border-[var(--brand)] text-[var(--brand-dark)]"
                          : "bg-secondary border-border text-muted-foreground"
                      )}
                    >
                      <span className="w-6 h-6 rounded-full bg-[var(--brand)] flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                        {lender.initials}
                      </span>
                      {lender.name}
                      {lender.is_default && <span className="text-[10px] opacity-60">(default)</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoan && lenders.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No lenders set up yet. Add one in the Loans tab.</p>
            )}
          </div>

          {/* Incurred For */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Incurred For</p>
            <div className="flex flex-wrap gap-2">
              {INCURRED_FOR_PRESETS.map(({ value, label, emoji }) => (
                <button key={value} type="button" onClick={() => handlePresetSelect(value)}
                  className={chipCls(selectedPreset === value)}>
                  <span className="text-base leading-none">{emoji}</span>
                  {label}
                  {value === "custom" && selectedPreset === "custom" && <PenLine size={11} className="text-[var(--brand)]" />}
                </button>
              ))}
            </div>
            {showCustomInput && (
              <input ref={customInputRef} type="text" value={customName}
                onChange={e => { setCustomName(e.target.value); setValue("incurred_for", e.target.value); }}
                placeholder="e.g. Colleague, Client…" maxLength={50}
                className="mt-3 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-[var(--brand)]" />
            )}
          </div>

          {/* Category */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Category</p>
            {categories.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No categories yet.</p>
                <button type="button" onClick={() => router.push("/categories")} className="text-sm text-[var(--brand)] font-medium mt-1">Create one →</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {categories.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => handleCategorySelect(cat.id)}
                      className={cn("rounded-xl p-2.5 text-center border transition-all",
                        selectedCategoryId === cat.id ? "border-[var(--brand)] bg-[var(--brand-light)]" : "border-border bg-secondary")}>
                      <span className="w-3 h-3 rounded-full block mx-auto mb-1.5" style={{ background: cat.color }} />
                      <span className={cn("text-xs font-medium line-clamp-1",
                        selectedCategoryId === cat.id ? "text-[var(--brand-dark)]" : "text-muted-foreground")}>
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Sub-category</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategory.subcategories.map((sub) => (
                        <button key={sub.id} type="button"
                          onClick={() => setValue("subcategory_id", subcategoryId === sub.id ? "" : sub.id)}
                          className={cn("text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
                            subcategoryId === sub.id
                              ? "bg-[var(--brand-light)] border-[var(--brand)] text-[var(--brand-dark)]"
                              : "bg-secondary border-border text-muted-foreground")}>
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment mode */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Payment Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_MODES.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => setValue("payment_mode", value)}
                  className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    paymentMode === value
                      ? "bg-[var(--brand-light)] border-[var(--brand)] text-[var(--brand-dark)]"
                      : "bg-secondary border-border text-muted-foreground")}>
                  <Icon size={15} />{label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-[var(--brand)] text-white rounded-2xl py-4 text-[15px] font-semibold disabled:opacity-60 transition-opacity active:scale-[0.98]">
            {saving ? "Saving..." : "Save Expense"}
          </button>
          <div className="h-4" />
        </div>
      </form>
    </div>
  );
}
