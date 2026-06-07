"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, ChevronRight, Trash2, X, Check, Pencil, AlertTriangle } from "lucide-react";
import { cn, CATEGORY_COLORS } from "@/lib/utils";

interface Subcategory { id: string; name: string; sort_order: number; }
interface Category { id: string; name: string; color: string; icon: string; subcategories?: Subcategory[]; }
interface Props { categories: Category[]; userId: string; }

// ── Two-tap confirm delete ─────────────────────────────────────────────────────
function ConfirmDelete({
  label,
  onConfirm,
  size = "sm",
}: {
  label: string;
  onConfirm: () => void;
  size?: "sm" | "xs";
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn("text-destructive font-medium", size === "xs" ? "text-[11px]" : "text-xs")}>
          Sure?
        </span>
        <button
          onClick={() => { setConfirming(false); onConfirm(); }}
          className={cn(
            "rounded-lg bg-destructive text-white font-medium",
            size === "xs" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1"
          )}
        >
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className={cn(
            "rounded-lg bg-secondary border border-border text-muted-foreground font-medium",
            size === "xs" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1"
          )}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={cn(
        "rounded-lg bg-destructive/10 flex items-center justify-center text-destructive flex-shrink-0",
        size === "xs" ? "w-6 h-6" : "w-7 h-7"
      )}
      aria-label={label}
    >
      <Trash2 size={size === "xs" ? 11 : 13} />
    </button>
  );
}

// ── Subcategory row with inline rename + two-tap delete ───────────────────────
function SubcategoryRow({
  sub,
  catColor,
  isLast,
  onRename,
  onDelete,
}: {
  sub: Subcategory;
  catColor: string;
  isLast: boolean;
  onRename: (subId: string, name: string) => Promise<void>;
  onDelete: (subId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(sub.name);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === sub.name) { setEditing(false); setValue(sub.name); return; }
    setSaving(true);
    await onRename(sub.id, trimmed);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", !isLast && "border-b border-border")}>
      {/* Dot */}
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: catColor }} />

      {/* Name or edit input */}
      {editing ? (
        <div className="flex-1 flex items-center gap-1.5">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setEditing(false); setValue(sub.name); }
            }}
            className="flex-1 bg-secondary border border-[var(--brand)] rounded-lg px-2 py-1 text-sm text-foreground outline-none"
          />
          <button onClick={handleSave} disabled={saving} className="text-[var(--brand)] disabled:opacity-40 flex-shrink-0">
            <Check size={13} strokeWidth={3} />
          </button>
          <button onClick={() => { setEditing(false); setValue(sub.name); }} className="text-muted-foreground flex-shrink-0">
            <X size={13} />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm text-foreground">{sub.name}</span>
          {/* Rename */}
          <button
            onClick={() => setEditing(true)}
            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0"
            aria-label={"Rename " + sub.name}
          >
            <Pencil size={12} />
          </button>
          {/* Delete — two taps */}
          <ConfirmDelete
            label={"Delete " + sub.name}
            onConfirm={() => onDelete(sub.id)}
            size="xs"
          />
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function CategoriesClient({ categories: initial, userId }: Props) {
  const [categories, setCategories] = useState(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [addSubForId, setAddSubForId] = useState<string | null>(null);

  // New category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // New subcategory
  const [newSubName, setNewSubName] = useState("");
  const [savingSub, setSavingSub] = useState(false);

  // Category inline rename
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameCatValue, setRenameCatValue] = useState("");

  // ── Category CRUD ─────────────────────────────────────────────────────────────

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: newCatName.trim(),
        color: newCatColor,
        icon: "tag",
        sort_order: categories.length,
      })
      .select()
      .single();
    if (!error && data) {
      setCategories((p) => [...p, { ...data, subcategories: [] }]);
      setNewCatName("");
      setNewCatColor(CATEGORY_COLORS[0]);
      setShowAddCat(false);
    }
    setSaving(false);
  }

  async function handleRenameCategory(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) { setRenamingCatId(null); return; }
    const supabase = createClient();
    const { error } = await supabase.from("categories").update({ name: trimmed }).eq("id", id);
    if (!error) setCategories((p) => p.map((c) => c.id === id ? { ...c, name: trimmed } : c));
    setRenamingCatId(null);
  }

  async function handleDeleteCategory(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) {
      setCategories((p) => p.filter((c) => c.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  }

  // ── Subcategory CRUD ──────────────────────────────────────────────────────────

  async function handleAddSubcategory(categoryId: string) {
    if (!newSubName.trim()) return;
    setSavingSub(true);
    const supabase = createClient();
    const cat = categories.find((c) => c.id === categoryId);
    const { data, error } = await supabase
      .from("subcategories")
      .insert({
        category_id: categoryId,
        user_id: userId,
        name: newSubName.trim(),
        sort_order: cat?.subcategories?.length || 0,
      })
      .select()
      .single();
    if (!error && data) {
      setCategories((p) =>
        p.map((c) => c.id === categoryId ? { ...c, subcategories: [...(c.subcategories || []), data] } : c)
      );
      setNewSubName("");
      setAddSubForId(null);
    }
    setSavingSub(false);
  }

  async function handleRenameSubcategory(categoryId: string, subId: string, name: string) {
    const supabase = createClient();
    const { error } = await supabase.from("subcategories").update({ name }).eq("id", subId);
    if (!error) {
      setCategories((p) =>
        p.map((c) =>
          c.id === categoryId
            ? { ...c, subcategories: (c.subcategories || []).map((s) => s.id === subId ? { ...s, name } : s) }
            : c
        )
      );
    }
  }

  async function handleDeleteSubcategory(categoryId: string, subId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("subcategories").delete().eq("id", subId);
    if (!error) {
      setCategories((p) =>
        p.map((c) =>
          c.id === categoryId
            ? { ...c, subcategories: (c.subcategories || []).filter((s) => s.id !== subId) }
            : c
        )
      );
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      {/* Header */}
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium">Categories</h1>
            <p className="text-white/70 text-xs mt-0.5">Tap pencil to rename · expand to manage sub-categories</p>
          </div>
          <button
            onClick={() => setShowAddCat(true)}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            aria-label="Add category"
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 animate-fade-in">

        {/* ── Add category form ── */}
        {showAddCat && (
          <div className="bg-card rounded-2xl border border-[var(--brand)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">New Category</p>
              <button onClick={() => { setShowAddCat(false); setNewCatName(""); }}>
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
                if (e.key === "Escape") setShowAddCat(false);
              }}
              placeholder="Category name"
              autoFocus
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[var(--brand)] transition-colors"
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCatColor(color)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
                    style={{ background: color }}
                    aria-label={"Select color " + color}
                  >
                    {newCatColor === color && <Check size={14} className="text-white" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleAddCategory}
              disabled={saving || !newCatName.trim()}
              className="w-full bg-[var(--brand)] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Category"}
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {categories.length === 0 && !showAddCat ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--brand-light)] flex items-center justify-center mb-4">
              <Plus size={28} className="text-[var(--brand)]" />
            </div>
            <p className="text-muted-foreground text-sm">No categories yet</p>
            <button onClick={() => setShowAddCat(true)} className="mt-3 text-sm text-[var(--brand)] font-medium">
              Create your first category
            </button>
          </div>
        ) : (
          <>
            {/* ── Category list ── */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className={cn("transition-all", idx < categories.length - 1 ? "border-b border-border" : "")}
                >
                  {/* Category row */}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    {/* Color dot */}
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />

                    {/* Name / inline rename */}
                    <div className="flex-1 min-w-0">
                      {renamingCatId === cat.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={renameCatValue}
                            onChange={(e) => setRenameCatValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameCategory(cat.id, renameCatValue);
                              if (e.key === "Escape") setRenamingCatId(null);
                            }}
                            className="flex-1 bg-secondary border border-[var(--brand)] rounded-lg px-2 py-1 text-sm text-foreground outline-none"
                          />
                          <button
                            onClick={() => handleRenameCategory(cat.id, renameCatValue)}
                            className="text-[var(--brand)] flex-shrink-0"
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                          <button onClick={() => setRenamingCatId(null)} className="text-muted-foreground flex-shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="text-left w-full"
                          onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                        >
                          <p className="text-sm font-medium text-foreground">{cat.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {cat.subcategories?.length || 0} sub-categories
                          </p>
                        </button>
                      )}
                    </div>

                    {/* Rename button */}
                    {renamingCatId !== cat.id && (
                      <button
                        onClick={() => { setRenamingCatId(cat.id); setRenameCatValue(cat.name); }}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0"
                        aria-label={"Rename " + cat.name}
                      >
                        <Pencil size={13} />
                      </button>
                    )}

                    {/* Delete — two taps */}
                    {renamingCatId !== cat.id && (
                      <ConfirmDelete
                        label={"Delete " + cat.name}
                        onConfirm={() => handleDeleteCategory(cat.id)}
                      />
                    )}

                    {/* Expand chevron */}
                    <button
                      onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                      className="flex-shrink-0"
                      aria-label={expandedId === cat.id ? "Collapse" : "Expand"}
                    >
                      <ChevronRight
                        size={16}
                        className={cn(
                          "text-muted-foreground transition-transform duration-200",
                          expandedId === cat.id ? "rotate-90" : ""
                        )}
                      />
                    </button>
                  </div>

                  {/* ── Expanded: sub-categories ── */}
                  {expandedId === cat.id && (
                    <div className="border-t border-border bg-secondary/30 pb-4">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 mb-2">
                        Sub-categories
                      </p>

                      {/* Sub-category rows — same card style as parent */}
                      <div className="mx-4 bg-card rounded-2xl border border-border overflow-hidden mb-3">
                        {(cat.subcategories || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic px-4 py-3">
                            None yet — add one below
                          </p>
                        ) : (
                          (cat.subcategories || []).map((sub, subIdx) => (
                            <SubcategoryRow
                              key={sub.id}
                              sub={sub}
                              catColor={cat.color}
                              isLast={subIdx === (cat.subcategories || []).length - 1}
                              onRename={(subId, name) => handleRenameSubcategory(cat.id, subId, name)}
                              onDelete={(subId) => handleDeleteSubcategory(cat.id, subId)}
                            />
                          ))
                        )}
                      </div>

                      {/* Add sub-category */}
                      <div className="px-4">
                        {addSubForId === cat.id ? (
                          <div className="flex gap-2">
                            <input
                              value={newSubName}
                              onChange={(e) => setNewSubName(e.target.value)}
                              placeholder="Sub-category name"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddSubcategory(cat.id);
                                if (e.key === "Escape") { setAddSubForId(null); setNewSubName(""); }
                              }}
                              className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand)] transition-colors"
                            />
                            <button
                              onClick={() => handleAddSubcategory(cat.id)}
                              disabled={savingSub || !newSubName.trim()}
                              className="w-9 h-9 bg-[var(--brand)] rounded-xl flex items-center justify-center disabled:opacity-50 flex-shrink-0"
                            >
                              <Check size={15} className="text-white" />
                            </button>
                            <button
                              onClick={() => { setAddSubForId(null); setNewSubName(""); }}
                              className="w-9 h-9 bg-secondary border border-border rounded-xl flex items-center justify-center flex-shrink-0"
                            >
                              <X size={15} className="text-muted-foreground" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddSubForId(cat.id); setNewSubName(""); }}
                            className="flex items-center gap-1.5 text-xs text-[var(--brand)] font-medium"
                          >
                            <Plus size={13} />
                            Add sub-category
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
              <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Deleting a category will fail if expenses are linked to it. Reassign those expenses first.
              </p>
            </div>
          </>
        )}

        <div className="h-2" />
      </div>
    </div>
  );
}
