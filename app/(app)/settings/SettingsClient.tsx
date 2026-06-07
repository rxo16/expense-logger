"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import {
  User, Lock, Moon, Sun, CurrencyIcon, Bell, Calendar,
  Download, LogOut, ChevronRight, Trash2,
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  currency: string;
  financial_year_start: number;
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

  // Sync dark mode with <html> class
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
    await supabase
      .from("profiles")
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
      {/* Header */}
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-5">
        <h1 className="text-xl font-medium">Settings</h1>
        <p className="text-white/70 text-xs mt-0.5">Account & preferences</p>
      </div>

      <div className="px-4 py-4 space-y-4 animate-fade-in">

        {/* Profile card */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-[var(--brand-light)] flex items-center justify-center font-semibold text-[var(--brand)] text-base flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus
                    className="flex-1 bg-secondary rounded-lg px-2 py-1 text-sm text-foreground outline-none border border-[var(--brand)]"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="text-xs text-[var(--brand)] font-medium disabled:opacity-50"
                  >
                    {savingName ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setFullName(profile?.full_name || ""); }}
                    className="text-xs text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </>
              )}
            </div>
          </div>

          <SettingsRow
            icon={<User size={16} />}
            label="Edit name"
            onClick={() => setEditingName(true)}
            showChevron
          />
          <SettingsRow
            icon={<Lock size={16} />}
            label="Change password"
            onClick={() => router.push("/settings/change-password")}
            showChevron
          />
        </div>

        {/* Preferences */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Preferences
          </p>

          <SettingsRow
            icon={darkMode ? <Moon size={16} /> : <Sun size={16} />}
            label="Dark mode"
            right={
              <button
                onClick={toggleDarkMode}
                className={`w-10 h-6 rounded-full relative transition-colors ${
                  darkMode ? "bg-[var(--brand)]" : "bg-muted"
                }`}
                role="switch"
                aria-checked={darkMode}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    darkMode ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            }
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

        {/* Data */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Data
          </p>
          <SettingsRow
            icon={<Download size={16} />}
            label="Export to CSV"
            onClick={() => alert("CSV export coming soon")}
            showChevron
            isLast
          />
        </div>

        {/* App info */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <SettingsRow
            icon={<span className="text-xs font-bold text-muted-foreground">v</span>}
            label="App version"
            right={<span className="text-sm text-muted-foreground">1.0.0</span>}
            isLast
          />
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-destructive/30 text-destructive text-sm font-medium disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          <LogOut size={15} />
          {signingOut ? "Signing out..." : "Sign out"}
        </button>

        <div className="h-2" />
      </div>
    </div>
  );
}

// Reusable settings row
function SettingsRow({
  icon,
  label,
  onClick,
  right,
  showChevron,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  right?: React.ReactNode;
  showChevron?: boolean;
  isLast?: boolean;
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 py-3 ${!isLast ? "border-b border-border" : ""}`}
    >
      <span className="text-[var(--brand)] w-5 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <span className="flex-1 text-sm text-foreground">{label}</span>
      {right && <span>{right}</span>}
      {showChevron && <ChevronRight size={14} className="text-muted-foreground" />}
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {inner}
      </button>
    );
  }

  return inner;
}
