"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getInitials, cn } from "@/lib/utils";
import {
  User, Lock, Moon, Sun, Bell, Calendar,
  Download, LogOut, ChevronRight, Percent, CreditCard,
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  currency: string;
  financial_year_start: number;
  loan_default_on: boolean;
  lending_rate_pa: number;
}

interface Props {
  profile: Profile | null;
  email: string;
}

export function SettingsClient({ profile, email }: Props) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Loan settings
  const [loanDefaultOn, setLoanDefaultOn] = useState(profile?.loan_default_on ?? true);
  const [lendingRate, setLendingRate] = useState(String(profile?.lending_rate_pa ?? 0));
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function toggleLoanDefault() {
    const next = !loanDefaultOn;
    setLoanDefaultOn(next);
    const supabase = createClient();
    await supabase.from("profiles").update({ loan_default_on: next }).eq("id", profile?.id || "");
    // Also store in localStorage for instant access in AddExpenseClient
    localStorage.setItem("loan_default_on", String(next));
  }

  async function handleSaveLendingRate() {
    const rate = parseFloat(lendingRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    setSavingRate(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ lending_rate_pa: rate }).eq("id", profile?.id || "");
    localStorage.setItem("lending_rate_pa", String(rate));
    setSavingRate(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSaveName() {
    if (!fullName.trim()) return;
    setSavingName(true);
    const supabase = createClient();
    await supabase.from("profiles")
      .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
      .eq("id", profile?.id || "");
    setSavingName(false);
    setEditingName(false);
    router.refresh();
  }

  const displayName = profile?.full_name || email.split("@")[0];
  const initials = getInitials(displayName);

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-5">
        <h1 className="text-xl font-medium">Settings</h1>
        <p className="text-white/70 text-xs mt-0.5">Account & preferences</p>
      </div>

      <div className="px-4 py-4 space-y-4 animate-fade-in">

        {/* Profile */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-[var(--brand-light)] flex items-center justify-center font-semibold text-[var(--brand)] text-base flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex gap-2">
                  <input value={fullName} onChange={e => setFullName(e.target.value)} autoFocus
                    className="flex-1 bg-secondary rounded-lg px-2 py-1 text-sm text-foreground outline-none border border-[var(--brand)]" />
                  <button onClick={handleSaveName} disabled={savingName}
                    className="text-xs text-[var(--brand)] font-medium disabled:opacity-50">
                    {savingName ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => { setEditingName(false); setFullName(profile?.full_name || ""); }}
                    className="text-xs text-muted-foreground">Cancel</button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </>
              )}
            </div>
          </div>
          <SettingsRow icon={<User size={16} />} label="Edit name" onClick={() => setEditingName(true)} showChevron />
          <SettingsRow icon={<Lock size={16} />} label="Change password" onClick={() => router.push("/settings/change-password")} showChevron isLast />
        </div>

        {/* Preferences */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Preferences</p>
          <SettingsRow
            icon={darkMode ? <Moon size={16} /> : <Sun size={16} />}
            label="Dark mode"
            right={<Toggle checked={darkMode} onChange={toggleDarkMode} />}
          />
          <SettingsRow
            icon={<span className="text-sm font-bold text-[var(--brand)]">₹</span>}
            label="Currency"
            right={<span className="text-sm text-muted-foreground">INR</span>}
          />
          <SettingsRow
            icon={<Calendar size={16} />}
            label="Financial year start"
            right={<span className="text-sm text-muted-foreground">April</span>}
          />
          <SettingsRow
            icon={<Bell size={16} />}
            label="Notifications"
            right={<span className="text-xs text-muted-foreground">Coming soon</span>}
            isLast
          />
        </div>

        {/* Loan Settings */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Loan Settings</p>

          {/* Mark as loan default toggle */}
          <SettingsRow
            icon={<CreditCard size={16} />}
            label="Mark as loan by default"
            right={<Toggle checked={loanDefaultOn} onChange={toggleLoanDefault} />}
          />

          {/* Lending rate */}
          <div className="flex items-center gap-3 py-3">
            <span className="text-[var(--brand)] w-5 flex items-center justify-center flex-shrink-0">
              <Percent size={16} />
            </span>
            <span className="flex-1 text-sm text-foreground">Lending rate (p.a.)</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={lendingRate}
                onChange={e => setLendingRate(e.target.value)}
                onBlur={handleSaveLendingRate}
                min="0" max="100" step="0.1"
                className="w-16 text-right bg-secondary rounded-lg px-2 py-1 text-sm text-foreground outline-none border border-transparent focus:border-[var(--brand)] transition-colors"
              />
              <span className="text-sm text-muted-foreground">%</span>
              {savingRate && <span className="text-xs text-[var(--brand)]">Saving...</span>}
            </div>
          </div>

          {/* Interest preview */}
          {parseFloat(lendingRate) > 0 && (
            <div className="mt-1 ml-8 bg-[var(--brand-light)] rounded-xl px-3 py-2">
              <p className="text-xs text-[var(--brand-dark)]">
                Monthly rate: {(parseFloat(lendingRate) / 12).toFixed(2)}% · 
                On ₹10,000 loan → ₹{Math.round(10000 * parseFloat(lendingRate) / 12 / 100)}/mo interest
              </p>
            </div>
          )}
        </div>

        {/* Data */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Data</p>
          <SettingsRow icon={<Download size={16} />} label="Export to CSV"
            onClick={() => alert("CSV export coming soon")} showChevron isLast />
        </div>

        {/* App info */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <SettingsRow icon={<span className="text-xs font-bold text-muted-foreground">v</span>}
            label="App version" right={<span className="text-sm text-muted-foreground">1.0.0</span>} isLast />
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut} disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-destructive/30 text-destructive text-sm font-medium disabled:opacity-50 active:scale-[0.98] transition-all">
          <LogOut size={15} />
          {signingOut ? "Signing out..." : "Sign out"}
        </button>

        <div className="h-2" />
      </div>
    </div>
  );
}

// ── Reusable toggle ───────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={cn(
        "w-11 h-6 rounded-full relative transition-colors flex-shrink-0",
        checked ? "bg-[var(--brand)]" : "bg-muted"
      )}
    >
      <span className={cn(
        "absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
        checked ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );
}

// ── Reusable settings row ─────────────────────────────────────────────────────
function SettingsRow({
  icon, label, onClick, right, showChevron, isLast,
}: {
  icon: React.ReactNode; label: string; onClick?: () => void;
  right?: React.ReactNode; showChevron?: boolean; isLast?: boolean;
}) {
  const inner = (
    <div className={cn("flex items-center gap-3 py-3", !isLast && "border-b border-border")}>
      <span className="text-[var(--brand)] w-5 flex items-center justify-center flex-shrink-0">{icon}</span>
      <span className="flex-1 text-sm text-foreground">{label}</span>
      {right && <span>{right}</span>}
      {showChevron && <ChevronRight size={14} className="text-muted-foreground" />}
    </div>
  );
  if (onClick) return <button onClick={onClick} className="w-full text-left">{inner}</button>;
  return inner;
}
