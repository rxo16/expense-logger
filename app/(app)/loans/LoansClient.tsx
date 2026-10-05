"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency, formatDate, cn,
  generateLoanNumber, getInitialsFromName, allocateSettlement,
} from "@/lib/utils";
import {
  Plus, ChevronDown, ChevronUp, X, Check, Wallet,
  TrendingDown, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Lender { id: string; name: string; initials: string; is_default: boolean; }
interface Loan {
  id: string; lender_id: string; loan_number: string; loan_date: string;
  principal: number; emi_amount: number | null; amount_paid: number;
  is_manual: boolean; notes: string | null; status: string;
  lenders?: { name: string; initials: string } | null;
}
interface Settlement {
  id: string; lender_id: string; settlement_date: string; total_amount: number;
  notes: string | null;
  lenders?: { name: string; initials: string } | null;
  settlement_allocations?: { id: string; loan_id: string; amount_applied: number }[];
}
interface Props {
  lenders: Lender[]; loans: Loan[]; settlements: Settlement[]; userId: string;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return status === "settled" ? (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
      <CheckCircle2 size={10} /> Settled
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
      <Clock size={10} /> Active
    </span>
  );
}

// ── Add Loan modal ────────────────────────────────────────────────────────────
function AddLoanModal({
  lenders, userId, onAdded, onClose,
}: {
  lenders: Lender[]; userId: string;
  onAdded: (loan: Loan) => void; onClose: () => void;
}) {
  const defaultLender = lenders.find(l => l.is_default) || lenders[0];
  const [lenderId, setLenderId] = useState(defaultLender?.id || "");
  const [amount, setAmount] = useState("");
  const [emi, setEmi] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputCls = "w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[var(--brand)] transition-colors";

  async function handleSave() {
    if (!lenderId || !amount || parseFloat(amount) <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    const supabase = createClient();
    const lender = lenders.find(l => l.id === lenderId)!;

    // Get sequence for this lender + month
    const loanDate = new Date(date);
    const monthKey = format(loanDate, "yyyyMM");
    const { count } = await supabase
      .from("loans")
      .select("*", { count: "exact", head: true })
      .eq("lender_id", lenderId)
      .like("loan_number", `${lender.initials}${monthKey}%`);

    const loanNumber = generateLoanNumber(lender.initials, loanDate, (count || 0) + 1);

    const { data, error: err } = await supabase
      .from("loans")
      .insert({
        user_id: userId, lender_id: lenderId,
        loan_number: loanNumber,
        loan_date: date,
        principal: parseFloat(amount),
        emi_amount: emi ? parseFloat(emi) : null,
        amount_paid: 0,
        is_manual: true,
        notes: notes.trim() || null,
        status: "active",
      })
      .select("*, lenders(name, initials)")
      .single();

    if (err) { setError(err.message); setSaving(false); return; }
    onAdded(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Add Manual Loan</h2>
          <button onClick={onClose}><X size={18} className="text-muted-foreground" /></button>
        </div>

        {/* Lender */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Lender</label>
          <select value={lenderId} onChange={e => setLenderId(e.target.value)} className={inputCls}>
            {lenders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Amount (₹)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 20000" className={inputCls} />
        </div>

        {/* EMI */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Monthly EMI (₹) — optional</label>
          <input type="number" value={emi} onChange={e => setEmi(e.target.value)}
            placeholder="e.g. 5000" className={inputCls} />
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="What was this loan for?" className={inputCls} />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-secondary border border-border text-sm font-medium text-foreground">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-[var(--brand)] text-white text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving…" : "Add Loan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Settle modal ──────────────────────────────────────────────────────────────
function SettleModal({
  lender, activeLoans, userId, onSettled, onClose,
}: {
  lender: Lender;
  activeLoans: Loan[];
  userId: string;
  onSettled: (updatedLoans: Loan[], settlement: Settlement) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Preview FIFO allocation
  const preview = useMemo(() => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return [];
    return allocateSettlement(activeLoans, num);
  }, [amount, activeLoans]);

  const totalOutstanding = activeLoans.reduce((s, l) => s + (l.principal - l.amount_paid), 0);

  async function handleSettle() {
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError("Enter a valid amount"); return; }
    if (num > totalOutstanding + 0.01) { setError(`Max settleable is ${formatCurrency(totalOutstanding)}`); return; }
    setSaving(true);
    const supabase = createClient();

    // Create settlement record
    const { data: settlement, error: sErr } = await supabase
      .from("settlements")
      .insert({ user_id: userId, lender_id: lender.id, settlement_date: date, total_amount: num, notes: notes.trim() || null })
      .select().single();
    if (sErr) { setError(sErr.message); setSaving(false); return; }

    // Insert allocations
    const allocs = preview.map(a => ({ settlement_id: settlement.id, loan_id: a.loan_id, amount_applied: a.amount_applied }));
    await supabase.from("settlement_allocations").insert(allocs);

    // Update each loan's amount_paid + status
    const updatedLoans: Loan[] = [...activeLoans];
    for (const alloc of preview) {
      const loan = updatedLoans.find(l => l.id === alloc.loan_id)!;
      const newPaid = loan.amount_paid + alloc.amount_applied;
      const newStatus = newPaid >= loan.principal ? "settled" : "active";
      await supabase.from("loans").update({ amount_paid: newPaid, status: newStatus }).eq("id", loan.id);
      const idx = updatedLoans.findIndex(l => l.id === loan.id);
      updatedLoans[idx] = { ...loan, amount_paid: newPaid, status: newStatus };
    }

    onSettled(updatedLoans, { ...settlement, lenders: { name: lender.name, initials: lender.initials } });
    onClose();
  }

  const inputCls = "w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[var(--brand)] transition-colors";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Settle with {lender.name}</h2>
          <button onClick={onClose}><X size={18} className="text-muted-foreground" /></button>
        </div>

        <div className="bg-[var(--brand-light)] rounded-xl px-4 py-3">
          <p className="text-xs text-[var(--brand-dark)]">Outstanding balance</p>
          <p className="text-xl font-bold text-[var(--brand)]">{formatCurrency(totalOutstanding)}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Settlement Amount (₹)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={activeLoans[0]?.emi_amount ? `Suggested EMI: ₹${activeLoans[0].emi_amount}` : "Enter amount"}
            className={inputCls} />
          {activeLoans[0]?.emi_amount && (
            <button onClick={() => setAmount(String(activeLoans[0].emi_amount))}
              className="mt-1.5 text-xs text-[var(--brand)] font-medium">
              Use EMI amount ₹{formatCurrency(activeLoans[0].emi_amount)}
            </button>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Settlement Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="UPI ref, bank transfer ID…" className={inputCls} />
        </div>

        {/* FIFO preview */}
        {preview.length > 0 && (
          <div className="bg-secondary rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">How it will be applied (oldest first)</p>
            {preview.map(alloc => {
              const loan = activeLoans.find(l => l.id === alloc.loan_id)!;
              return (
                <div key={alloc.loan_id} className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium text-foreground">{loan.loan_number}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(loan.loan_date)}</p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--brand)]">−{formatCurrency(alloc.amount_applied)}</span>
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-secondary border border-border text-sm font-medium text-foreground">
            Cancel
          </button>
          <button onClick={handleSettle} disabled={saving || preview.length === 0}
            className="flex-1 py-3 rounded-2xl bg-[var(--brand)] text-white text-sm font-semibold disabled:opacity-60">
            {saving ? "Settling…" : "Confirm Settlement"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main LoansClient ──────────────────────────────────────────────────────────
export function LoansClient({ lenders: initialLenders, loans: initialLoans, settlements: initialSettlements, userId }: Props) {
  const [lenders, setLenders] = useState(initialLenders);
  const [loans, setLoans] = useState(initialLoans);
  const [settlements, setSettlements] = useState(initialSettlements);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [settlingLenderId, setSettlingLenderId] = useState<string | null>(null);
  const [expandedLenderId, setExpandedLenderId] = useState<string | null>(
    initialLenders.find(l => l.is_default)?.id || initialLenders[0]?.id || null
  );
  const [showHistory, setShowHistory] = useState(false);

  // ── Derived summaries ─────────────────────────────────────────────────────
  const lenderSummaries = useMemo(() => {
    return lenders.map(lender => {
      const lLoans = loans.filter(l => l.lender_id === lender.id);
      const total_borrowed = lLoans.reduce((s, l) => s + l.principal, 0);
      const total_paid = lLoans.reduce((s, l) => s + l.amount_paid, 0);
      const activeLoans = lLoans.filter(l => l.status === "active").sort(
        (a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime()
      );
      return {
        lender,
        total_borrowed,
        total_paid,
        outstanding: total_borrowed - total_paid,
        loan_count: lLoans.length,
        active_loan_count: activeLoans.length,
        oldest_active_loan: activeLoans[0] || null,
        active_loans: activeLoans,
        all_loans: lLoans.sort((a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime()),
      };
    });
  }, [lenders, loans]);

  const totalOutstanding = lenderSummaries.reduce((s, ls) => s + ls.outstanding, 0);
  const totalBorrowed = lenderSummaries.reduce((s, ls) => s + ls.total_borrowed, 0);
  const totalPaid = lenderSummaries.reduce((s, ls) => s + ls.total_paid, 0);

  function handleLoanAdded(loan: Loan) {
    setLoans(prev => [...prev, loan].sort((a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime()));
  }

  function handleSettled(updatedLoans: Loan[], settlement: Settlement) {
    setLoans(prev => prev.map(l => updatedLoans.find(u => u.id === l.id) || l));
    setSettlements(prev => [settlement, ...prev]);
  }

  const settlingLender = lenders.find(l => l.id === settlingLenderId);
  const settlingActiveLoans = settlingLenderId
    ? loans.filter(l => l.lender_id === settlingLenderId && l.status === "active")
        .sort((a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime())
    : [];

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">

      {/* Header */}
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-medium">Loan Tracker</h1>
            <p className="text-white/70 text-xs mt-0.5">Track borrowed money & settlements</p>
          </div>
          <button
            onClick={() => setShowAddLoan(true)}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            aria-label="Add loan"
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>

        {/* Grand summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-white/60 text-[10px] uppercase tracking-wide mb-1">Borrowed</p>
            <p className="text-sm font-bold">{formatCurrency(totalBorrowed, "INR", true)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-white/60 text-[10px] uppercase tracking-wide mb-1">Paid</p>
            <p className="text-sm font-bold text-emerald-300">{formatCurrency(totalPaid, "INR", true)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-white/60 text-[10px] uppercase tracking-wide mb-1">Owed</p>
            <p className="text-sm font-bold text-amber-300">{formatCurrency(totalOutstanding, "INR", true)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 animate-fade-in">

        {/* Per-lender cards */}
        {lenderSummaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--brand-light)] flex items-center justify-center mb-4">
              <Wallet size={28} className="text-[var(--brand)]" />
            </div>
            <p className="text-muted-foreground text-sm">No lenders yet</p>
            <button onClick={() => setShowAddLoan(true)}
              className="mt-3 text-sm text-[var(--brand)] font-medium">
              Add your first loan
            </button>
          </div>
        ) : (
          lenderSummaries.map(ls => (
            <div key={ls.lender.id} className="bg-card rounded-2xl border border-border overflow-hidden">

              {/* Lender header */}
              <div
                className="flex items-center gap-3 px-4 py-4 cursor-pointer"
                onClick={() => setExpandedLenderId(expandedLenderId === ls.lender.id ? null : ls.lender.id)}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[var(--brand-light)] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[var(--brand)]">{ls.lender.initials}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{ls.lender.name}</p>
                    {ls.lender.is_default && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[var(--brand-light)] text-[var(--brand-dark)] rounded-full font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ls.active_loan_count} active · {ls.loan_count} total loans
                  </p>
                </div>

                {/* Outstanding */}
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-base font-bold", ls.outstanding > 0 ? "text-destructive" : "text-emerald-500")}>
                    {formatCurrency(ls.outstanding)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">outstanding</p>
                </div>

                {expandedLenderId === ls.lender.id ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
              </div>

              {/* Expanded: loans + settle */}
              {expandedLenderId === ls.lender.id && (
                <div className="border-t border-border">

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-0 border-b border-border">
                    <div className="px-4 py-3 border-r border-border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Borrowed</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(ls.total_borrowed)}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Paid</p>
                      <p className="text-sm font-semibold text-emerald-500 mt-0.5">{formatCurrency(ls.total_paid)}</p>
                    </div>
                  </div>

                  {/* Settle button */}
                  {ls.outstanding > 0 && (
                    <div className="px-4 py-3 border-b border-border">
                      <button
                        onClick={() => setSettlingLenderId(ls.lender.id)}
                        className="w-full bg-[var(--brand)] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <Check size={15} />
                        Record Settlement
                      </button>
                    </div>
                  )}

                  {/* Loan list */}
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Loans — oldest first
                    </p>
                    {ls.all_loans.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No loans yet</p>
                    ) : (
                      <div className="space-y-2">
                        {ls.all_loans.map(loan => {
                          const balance = loan.principal - loan.amount_paid;
                          const pct = Math.min(100, Math.round((loan.amount_paid / loan.principal) * 100));
                          return (
                            <div key={loan.id}
                              className={cn("rounded-xl border p-3", loan.status === "settled"
                                ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                                : "border-border bg-secondary/40"
                              )}>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-mono font-semibold text-foreground">{loan.loan_number}</p>
                                    <StatusBadge status={loan.status} />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatDate(loan.loan_date)} · {loan.is_manual ? "Manual" : "Expense-based"}
                                    {loan.emi_amount ? ` · EMI ₹${loan.emi_amount.toLocaleString("en-IN")}` : ""}
                                  </p>
                                  {loan.notes && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{loan.notes}</p>}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold text-foreground">{formatCurrency(loan.principal)}</p>
                                  {balance > 0 && <p className="text-[10px] text-destructive font-medium">{formatCurrency(balance)} left</p>}
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", loan.status === "settled" ? "bg-emerald-500" : "bg-[var(--brand)]")}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex justify-between mt-1">
                                <p className="text-[10px] text-muted-foreground">Paid: {formatCurrency(loan.amount_paid)}</p>
                                <p className="text-[10px] text-muted-foreground">{pct}%</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Settlement history */}
        {settlements.length > 0 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-4 py-3.5"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Settlement History ({settlements.length})
              </p>
              {showHistory ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
            </button>

            {showHistory && (
              <div className="border-t border-border divide-y divide-border">
                {settlements.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                      <TrendingDown size={14} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Paid to {s.lenders?.name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.settlement_date)}</p>
                      {s.notes && <p className="text-[10px] text-muted-foreground italic">{s.notes}</p>}
                    </div>
                    <p className="text-sm font-bold text-emerald-600 flex-shrink-0">
                      {formatCurrency(s.total_amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-2" />
      </div>

      {/* Modals */}
      {showAddLoan && (
        <AddLoanModal
          lenders={lenders}
          userId={userId}
          onAdded={handleLoanAdded}
          onClose={() => setShowAddLoan(false)}
        />
      )}

      {settlingLender && (
        <SettleModal
          lender={settlingLender}
          activeLoans={settlingActiveLoans}
          userId={userId}
          onSettled={handleSettled}
          onClose={() => setSettlingLenderId(null)}
        />
      )}
    </div>
  );
}
