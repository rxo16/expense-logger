"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, cn, generateLoanNumber, allocateSettlement } from "@/lib/utils";
import {
  Plus, ChevronDown, ChevronUp, X, Check, Wallet,
  TrendingDown, CheckCircle2, Clock, Target, Zap,
} from "lucide-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Lender { id: string; name: string; initials: string; is_default: boolean; }
interface Loan {
  id: string; lender_id: string; loan_number: string; loan_date: string;
  principal: number; emi_amount: number | null; amount_paid: number;
  is_manual: boolean; notes: string | null; status: string;
  is_targeted?: boolean;
  lenders?: { name: string; initials: string } | null;
}
interface Settlement {
  id: string; lender_id: string; settlement_date: string; total_amount: number;
  notes: string | null;
  lenders?: { name: string; initials: string } | null;
  settlement_allocations?: { id: string; loan_id: string; amount_applied: number }[];
}
interface Props {
  lenders: Lender[]; loans: Loan[]; settlements: Settlement[];
  userId: string; lendingRatePa: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcMonthlyEmi(principal: number, ratePerMonth: number): number {
  if (ratePerMonth === 0) return Math.ceil(principal / 12);
  // Reducing balance EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
  const n = 12;
  const r = ratePerMonth / 100;
  return Math.ceil(principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
}

function loanBalance(loan: Loan): number {
  return Math.max(0, loan.principal - loan.amount_paid);
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

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={checked}
      className={cn("w-11 h-6 rounded-full relative transition-colors flex-shrink-0 flex items-center px-0.5",
        checked ? "bg-[var(--brand)]" : "bg-muted")}>
      <span className={cn("w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 flex-shrink-0",
        checked ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

// ── Shared bottom-sheet modal ─────────────────────────────────────────────────
// - z-[60] so it sits above the fixed BottomNav (z-50)
// - tracks window.visualViewport so it reflows when the Android keyboard opens
// - header + footer are pinned; only the form body scrolls, so buttons stay reachable
function useVisualViewportBox() {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setBox({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return box;
}

function SheetModal({ title, onClose, footer, children }: {
  title: React.ReactNode; onClose: () => void;
  footer: React.ReactNode; children: React.ReactNode;
}) {
  const box = useVisualViewportBox();

  // Lock background scroll while the sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Keep the focused field visible after the keyboard animation settles
  function handleFocus(e: React.FocusEvent<HTMLDivElement>) {
    const el = e.target as HTMLElement;
    if (!["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
    setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
  }

  return (
    <div
      className="fixed left-0 right-0 z-[60] bg-black/50 flex items-end justify-center"
      style={box ? { top: box.top, height: box.height } : { top: 0, bottom: 0 }}
    >
      <div role="dialog" aria-modal="true"
        className="bg-card w-full max-w-lg rounded-t-3xl flex flex-col max-h-[92%]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-muted-foreground" /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-3 space-y-4" onFocus={handleFocus}>
          {children}
        </div>
        <div className="flex-shrink-0 px-5 pt-3 border-t border-border"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

// ── Add Loan modal ────────────────────────────────────────────────────────────
function AddLoanModal({ lenders, userId, onAdded, onClose }: {
  lenders: Lender[]; userId: string;
  onAdded: (loan: Loan) => void; onClose: () => void;
}) {
  const defaultLender = lenders.find(l => l.is_default) || lenders[0];
  const [lenderId, setLenderId] = useState(defaultLender?.id || "");
  // If no lenders passed, nothing to show
  const hasLenders = lenders.length > 0;
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
    const loanDate = new Date(date);
    const monthKey = format(loanDate, "yyyyMM");
    const { count } = await supabase.from("loans").select("*", { count: "exact", head: true })
      .eq("lender_id", lenderId).like("loan_number", `${lender.initials}${monthKey}%`);
    const loanNumber = generateLoanNumber(lender.initials, loanDate, (count || 0) + 1);
    const { data, error: err } = await supabase.from("loans").insert({
      user_id: userId, lender_id: lenderId, loan_number: loanNumber, loan_date: date,
      principal: parseFloat(amount), emi_amount: emi ? parseFloat(emi) : null,
      amount_paid: 0, is_manual: true, notes: notes.trim() || null, status: "active",
    }).select("*, lenders(name, initials)").single();
    if (err) { setError(err.message); setSaving(false); return; }
    onAdded(data);
    onClose();
  }

  return (
    <SheetModal title={<>Add Manual Loan</>} onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-secondary border border-border text-sm font-medium text-foreground">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-2xl bg-[var(--brand)] text-white text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving…" : "Add Loan"}
          </button>
        </div>
      }>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Lender</label>
          {hasLenders ? (
            <select value={lenderId} onChange={e => setLenderId(e.target.value)} className={inputCls}>
              {lenders.map(l => <option key={l.id} value={l.id}>{l.name} {l.is_default ? "(default)" : ""}</option>)}
            </select>
          ) : (
            <p className="text-xs text-destructive">No lenders found. Add a lender first from the Loans tab.</p>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Amount (₹)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 20000" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Monthly EMI (₹) — optional</label>
          <input type="number" value={emi} onChange={e => setEmi(e.target.value)} placeholder="Leave blank to auto-calculate" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Loan Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was this loan for?" className={inputCls} />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
    </SheetModal>
  );
}

// ── EMI Settlement modal ───────────────────────────────────────────────────────
function EmiSettleModal({ lender, targetedLoans, ratePerMonth, userId, onSettled, onClose }: {
  lender: Lender; targetedLoans: Loan[]; ratePerMonth: number;
  userId: string; onSettled: (updatedLoans: Loan[], s: Settlement) => void; onClose: () => void;
}) {
  const totalEmi = targetedLoans.reduce((s, l) => {
    const emi = l.emi_amount ?? calcMonthlyEmi(l.principal, ratePerMonth);
    return s + Math.min(emi, loanBalance(l));
  }, 0);

  const [amount, setAmount] = useState(String(Math.round(totalEmi)));
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputCls = "w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[var(--brand)] transition-colors";

  // Split amount proportionally across targeted loans by their EMI
  const preview = useMemo(() => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return [];
    const emis = targetedLoans.map(l => ({
      loan: l,
      emi: Math.min(l.emi_amount ?? calcMonthlyEmi(l.principal, ratePerMonth), loanBalance(l)),
    }));
    const totalEmis = emis.reduce((s, e) => s + e.emi, 0);
    return emis.map(({ loan, emi }) => ({
      loan_id: loan.id,
      loan,
      amount_applied: Math.min(Math.round((emi / totalEmis) * num), loanBalance(loan)),
    })).filter(a => a.amount_applied > 0);
  }, [amount, targetedLoans, ratePerMonth]);

  async function handleSettle() {
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: settlement, error: sErr } = await supabase.from("settlements")
      .insert({ user_id: userId, lender_id: lender.id, settlement_date: date, total_amount: num, notes: notes.trim() || null })
      .select().single();
    if (sErr) { setError(sErr.message); setSaving(false); return; }
    await supabase.from("settlement_allocations").insert(
      preview.map(a => ({ settlement_id: settlement.id, loan_id: a.loan_id, amount_applied: a.amount_applied }))
    );
    const updatedLoans: Loan[] = [...targetedLoans];
    for (const alloc of preview) {
      const newPaid = alloc.loan.amount_paid + alloc.amount_applied;
      const newStatus = newPaid >= alloc.loan.principal ? "settled" : "active";
      await supabase.from("loans").update({ amount_paid: newPaid, status: newStatus }).eq("id", alloc.loan_id);
      const idx = updatedLoans.findIndex(l => l.id === alloc.loan_id);
      if (idx >= 0) updatedLoans[idx] = { ...updatedLoans[idx], amount_paid: newPaid, status: newStatus };
    }
    onSettled(updatedLoans, { ...settlement, lenders: { name: lender.name, initials: lender.initials } });
    onClose();
  }

  return (
    <SheetModal title={<>EMI Settlement — {lender.name}</>} onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-secondary border border-border text-sm font-medium">Cancel</button>
          <button onClick={handleSettle} disabled={saving || preview.length === 0}
            className="flex-1 py-3 rounded-2xl bg-[var(--brand)] text-white text-sm font-semibold disabled:opacity-60">
            {saving ? "Settling…" : "Confirm Settlement"}
          </button>
        </div>
      }>
        <div className="bg-[var(--brand-light)] rounded-xl px-4 py-3">
          <p className="text-xs text-[var(--brand-dark)]">Total EMI due ({targetedLoans.length} targeted loans)</p>
          <p className="text-xl font-bold text-[var(--brand)]">{formatCurrency(totalEmi)}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Settlement Amount (₹)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
          <button onClick={() => setAmount(String(Math.round(totalEmi)))}
            className="mt-1.5 text-xs text-[var(--brand)] font-medium">Use total EMI {formatCurrency(totalEmi)}</button>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="UPI ref, bank transfer…" className={inputCls} />
        </div>
        {preview.length > 0 && (
          <div className="bg-secondary rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Split across loans</p>
            {preview.map(alloc => (
              <div key={alloc.loan_id} className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-mono font-semibold text-foreground">{alloc.loan.loan_number}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(alloc.loan.loan_date)} · Balance {formatCurrency(loanBalance(alloc.loan))}</p>
                </div>
                <span className="text-xs font-semibold text-[var(--brand)]">−{formatCurrency(alloc.amount_applied)}</span>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
    </SheetModal>
  );
}

// ── Lump sum settle modal (standalone loans) ──────────────────────────────────
function LumpSumModal({ loan, userId, onSettled, onClose }: {
  loan: Loan; userId: string;
  onSettled: (updatedLoan: Loan, s: Settlement) => void; onClose: () => void;
}) {
  const balance = loanBalance(loan);
  const [amount, setAmount] = useState(String(Math.round(balance)));
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputCls = "w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[var(--brand)] transition-colors";

  async function handleSettle() {
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError("Enter a valid amount"); return; }
    if (num > balance + 0.01) { setError("Amount cannot exceed outstanding balance " + formatCurrency(balance)); return; }
    setSaving(true);
    const supabase = createClient();
    const newPaid = loan.amount_paid + num;
    const newStatus = newPaid >= loan.principal ? "settled" : "active";
    const { data: settlement, error: sErr } = await supabase.from("settlements")
      .insert({ user_id: userId, lender_id: loan.lender_id, settlement_date: date, total_amount: num, notes: notes.trim() || null })
      .select().single();
    if (sErr) { setError(sErr.message); setSaving(false); return; }
    await supabase.from("settlement_allocations").insert({ settlement_id: settlement.id, loan_id: loan.id, amount_applied: num });
    await supabase.from("loans").update({ amount_paid: newPaid, status: newStatus }).eq("id", loan.id);
    const updatedLoan = { ...loan, amount_paid: newPaid, status: newStatus };
    onSettled(updatedLoan, { ...settlement, lenders: loan.lenders });
    onClose();
  }

  return (
    <SheetModal title={<>Settle in Full</>} onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-secondary border border-border text-sm font-medium">Cancel</button>
          <button onClick={handleSettle} disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-[var(--brand)] text-white text-sm font-semibold disabled:opacity-60">
            {saving ? "Settling…" : `Pay ${formatCurrency(parseFloat(amount) || 0)}`}
          </button>
        </div>
      }>
        <div className="bg-[var(--brand-light)] rounded-xl px-4 py-3">
          <p className="text-xs text-[var(--brand-dark)]">{loan.loan_number} · Outstanding balance</p>
          <p className="text-xl font-bold text-[var(--brand)]">{formatCurrency(balance)}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Payment Amount (₹)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
          <div className="flex gap-2 mt-1.5">
            <button onClick={() => setAmount(String(Math.round(balance)))}
              className="text-xs text-[var(--brand)] font-medium">Pay full {formatCurrency(balance)}</button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Settlement Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="UPI ref, bank transfer…" className={inputCls} />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
    </SheetModal>
  );
}

// ── Main LoansClient ──────────────────────────────────────────────────────────
export function LoansClient({ lenders: initialLenders, loans: initialLoans, settlements: initialSettlements, userId, lendingRatePa }: Props) {
  const [lenders] = useState(initialLenders);
  const [loans, setLoans] = useState(initialLoans);
  const [settlements, setSettlements] = useState(initialSettlements);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [expandedLenderId, setExpandedLenderId] = useState<string | null>(
    initialLenders.find(l => l.is_default)?.id || initialLenders[0]?.id || null
  );
  const [showHistory, setShowHistory] = useState(false);
  const [emiSettlingLenderId, setEmiSettlingLenderId] = useState<string | null>(null);
  const [lumpSumLoanId, setLumpSumLoanId] = useState<string | null>(null);

  const ratePerMonth = lendingRatePa / 12;

  // ── Derived summaries ─────────────────────────────────────────────────────
  const lenderSummaries = useMemo(() => {
    return lenders.map(lender => {
      const lLoans = loans.filter(l => l.lender_id === lender.id);
      const activeLoans = lLoans.filter(l => l.status === "active")
        .sort((a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime());
      const targetedLoans = activeLoans.filter(l => l.is_targeted);

      // Monthly bundle loans (loan_number ends in 00) → EMI = reducing balance calc
      // Standalone loans (≥3K, not manual) → no EMI, lump sum
      // Manual loans → custom EMI or calc
      const totalEmiDue = targetedLoans.reduce((s, l) => {
        if (!l.is_manual && l.loan_number.endsWith("00")) {
          // Monthly bundle — has EMI
          return s + Math.min(l.emi_amount ?? calcMonthlyEmi(l.principal, ratePerMonth), loanBalance(l));
        } else if (l.is_manual) {
          return s + Math.min(l.emi_amount ?? calcMonthlyEmi(l.principal, ratePerMonth), loanBalance(l));
        }
        return s; // standalone — no EMI contribution
      }, 0);

      return {
        lender,
        total_borrowed: lLoans.reduce((s, l) => s + l.principal, 0),
        total_paid: lLoans.reduce((s, l) => s + l.amount_paid, 0),
        outstanding: lLoans.reduce((s, l) => s + loanBalance(l), 0),
        loan_count: lLoans.length,
        active_loans: activeLoans,
        targeted_loans: targetedLoans,
        all_loans: lLoans.sort((a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime()),
        total_emi_due: totalEmiDue,
      };
    });
  }, [lenders, loans, ratePerMonth]);

  const totalOutstanding = lenderSummaries.reduce((s, ls) => s + ls.outstanding, 0);
  const totalBorrowed = lenderSummaries.reduce((s, ls) => s + ls.total_borrowed, 0);
  const totalPaid = lenderSummaries.reduce((s, ls) => s + ls.total_paid, 0);
  const totalEmiDue = lenderSummaries.reduce((s, ls) => s + ls.total_emi_due, 0);

  async function toggleTargeted(loan: Loan) {
    const supabase = createClient();
    await supabase.from("loans").update({ is_targeted: !loan.is_targeted }).eq("id", loan.id);
    setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, is_targeted: !l.is_targeted } : l));
  }

  function handleLoanAdded(loan: Loan) {
    setLoans(prev => [...prev, loan].sort((a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime()));
  }

  function handleEmiSettled(updatedLoans: Loan[], settlement: Settlement) {
    setLoans(prev => prev.map(l => updatedLoans.find(u => u.id === l.id) || l));
    setSettlements(prev => [settlement, ...prev]);
  }

  function handleLumpSumSettled(updatedLoan: Loan, settlement: Settlement) {
    setLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
    setSettlements(prev => [settlement, ...prev]);
  }

  const emiSettlingLender = lenders.find(l => l.id === emiSettlingLenderId);
  const emiSettlingTargeted = emiSettlingLenderId
    ? loans.filter(l => l.lender_id === emiSettlingLenderId && l.status === "active" && l.is_targeted)
        .sort((a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime())
    : [];
  const lumpSumLoan = loans.find(l => l.id === lumpSumLoanId) || null;

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      {/* Header */}
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-medium">Loan Tracker</h1>
            <p className="text-white/70 text-xs mt-0.5">Track borrowed money & settlements</p>
          </div>
          <button onClick={() => setShowAddLoan(true)}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Plus size={18} className="text-white" />
          </button>
        </div>

        {/* Grand summary */}
        <div className="grid grid-cols-3 gap-2 mb-3">
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

        {/* Active EMI summary */}
        {totalEmiDue > 0 && (
          <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs">Total active EMI this month</p>
              <p className="text-white text-lg font-bold">{formatCurrency(totalEmiDue)}</p>
            </div>
            <Target size={20} className="text-white/60" />
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4 animate-fade-in">

        {lenderSummaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--brand-light)] flex items-center justify-center mb-4">
              <Wallet size={28} className="text-[var(--brand)]" />
            </div>
            <p className="text-muted-foreground text-sm">No lenders yet</p>
            <button onClick={() => setShowAddLoan(true)} className="mt-3 text-sm text-[var(--brand)] font-medium">
              Add your first loan
            </button>
          </div>
        ) : (
          lenderSummaries.map(ls => (
            <div key={ls.lender.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* Lender header */}
              <div className="flex items-center gap-3 px-4 py-4 cursor-pointer"
                onClick={() => setExpandedLenderId(expandedLenderId === ls.lender.id ? null : ls.lender.id)}>
                <div className="w-10 h-10 rounded-full bg-[var(--brand-light)] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[var(--brand)]">{ls.lender.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{ls.lender.name}</p>
                    {ls.lender.is_default && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[var(--brand-light)] text-[var(--brand-dark)] rounded-full font-medium">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ls.active_loans.length} active · {ls.loan_count} total
                    {ls.total_emi_due > 0 ? ` · EMI ${formatCurrency(ls.total_emi_due, "INR", true)}/mo` : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-base font-bold", ls.outstanding > 0 ? "text-destructive" : "text-emerald-500")}>
                    {formatCurrency(ls.outstanding)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">outstanding</p>
                </div>
                {expandedLenderId === ls.lender.id
                  ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" />
                  : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
              </div>

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

                  {/* Action buttons */}
                  {ls.outstanding > 0 && (
                    <div className="px-4 py-3 border-b border-border space-y-2">
                      {/* EMI settlement — only if there are targeted loans with EMI */}
                      {ls.targeted_loans.filter(l => !l.loan_number.endsWith("_standalone") || l.is_manual).length > 0 && ls.total_emi_due > 0 && (
                        <button onClick={() => setEmiSettlingLenderId(ls.lender.id)}
                          className="w-full bg-[var(--brand)] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                          <Target size={15} />
                          Pay EMI ({formatCurrency(ls.total_emi_due)})
                        </button>
                      )}
                    </div>
                  )}

                  {/* Loan list */}
                  <div className="px-4 pt-3 pb-4">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Loans · tap target icon to include in EMI
                    </p>
                    {ls.all_loans.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No loans yet</p>
                    ) : (
                      <div className="space-y-2">
                        {ls.all_loans.map(loan => {
                          const balance = loanBalance(loan);
                          const pct = Math.min(100, Math.round((loan.amount_paid / loan.principal) * 100));
                          const isStandalone = !loan.is_manual && !loan.loan_number.endsWith("00");
                          const emiAmount = loan.is_manual
                            ? (loan.emi_amount ?? calcMonthlyEmi(loan.principal, ratePerMonth))
                            : (!isStandalone ? calcMonthlyEmi(loan.principal, ratePerMonth) : null);

                          return (
                            <div key={loan.id}
                              className={cn("rounded-xl border p-3",
                                loan.status === "settled"
                                  ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                                  : loan.is_targeted
                                  ? "border-[var(--brand)] bg-[var(--brand-light)]/30"
                                  : "border-border bg-secondary/40"
                              )}>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs font-mono font-semibold text-foreground">{loan.loan_number}</p>
                                    <StatusBadge status={loan.status} />
                                    {isStandalone && (
                                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 px-1.5 py-0.5 rounded-full">
                                        Standalone
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatDate(loan.loan_date)}
                                    {emiAmount ? ` · EMI ${formatCurrency(emiAmount)}/mo` : " · Lump sum"}
                                    {loan.notes ? ` · ${loan.notes}` : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {/* Target toggle — only for non-standalone active loans */}
                                  {loan.status === "active" && !isStandalone && (
                                    <button
                                      onClick={() => toggleTargeted(loan)}
                                      title={loan.is_targeted ? "Remove from EMI target" : "Add to EMI target"}
                                      className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                                        loan.is_targeted
                                          ? "bg-[var(--brand)] text-white"
                                          : "bg-secondary border border-border text-muted-foreground")}>
                                      <Target size={13} />
                                    </button>
                                  )}
                                  {/* Lump sum settle — available on ALL active loans */}
                                  {loan.status === "active" && (
                                    <button
                                      onClick={() => setLumpSumLoanId(loan.id)}
                                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-[var(--brand)] text-white rounded-lg">
                                      <Zap size={11} /> {isStandalone ? "Settle" : "Pay"}
                                    </button>
                                  )}
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-foreground">{formatCurrency(loan.principal)}</p>
                                    {balance > 0 && <p className="text-[10px] text-destructive font-medium">{formatCurrency(balance)} left</p>}
                                  </div>
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all", loan.status === "settled" ? "bg-emerald-500" : "bg-[var(--brand)]")}
                                  style={{ width: `${pct}%` }} />
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
            <button onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-4 py-3.5">
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
                      <p className="text-sm font-medium text-foreground">Paid to {s.lenders?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.settlement_date)}</p>
                      {s.notes && <p className="text-[10px] text-muted-foreground italic">{s.notes}</p>}
                    </div>
                    <p className="text-sm font-bold text-emerald-600 flex-shrink-0">{formatCurrency(s.total_amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="h-2" />
      </div>

      {/* Modals */}
      {showAddLoan && <AddLoanModal lenders={lenders} userId={userId} onAdded={handleLoanAdded} onClose={() => setShowAddLoan(false)} />}
      {emiSettlingLender && (
        <EmiSettleModal
          lender={emiSettlingLender} targetedLoans={emiSettlingTargeted}
          ratePerMonth={ratePerMonth} userId={userId}
          onSettled={handleEmiSettled} onClose={() => setEmiSettlingLenderId(null)}
        />
      )}
      {lumpSumLoan && (
        <LumpSumModal
          loan={lumpSumLoan} userId={userId}
          onSettled={handleLumpSumSettled} onClose={() => setLumpSumLoanId(null)}
        />
      )}
    </div>
  );
}
