"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, ChevronRight, Trash2, X, Check } from "lucide-react";
import { cn, CATEGORY_COLORS } from "@/lib/utils";

interface Subcategory {
  id: string;
  name: string;
  sort_order: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  subcategories?: Subcategory[];
}

interface Props {
  categories: Category[];
  userId: string;
}

export function CategoriesClient({ categories: initial, userId }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [addSubForId, setAddSubForId] = useState<string | null>(null);

  // New category form state
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // New subcategory state
  const [newSubName, setNewSubName] = useState("");
  const [savingSub, setSavingSub] = useState(false);

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
      setCategories((prev) => [...prev, { ...data, subcategories: [] }]);
      setNewCatName("");
      setNewCatColor(CATEGORY_COLORS[0]);
      setShowAddCat(false);
    }
    setSaving(false);
  }

  async function handleDeleteCategory(id: string) {
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleAddSubcategory(categoryId: string) {
    if (!newSubName.trim()) return;
    setSavingSub(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("subcategories")
      .insert({
        category_id: categoryId,
        user_id: userId,
        name: newSubName.trim(),
        sort_order: 0,
      })
      .select()
      .single();

    if (!error && data) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, subcategories: [...(c.subcategories || []), data] }
            : c
        )
      );
      setNewSubName("");
      setAddSubForId(null);
    }
    setSavingSub(false);
  }

  async function handleDeleteSubcategory(categoryId: string, subId: string) {
    const supabase = createClient();
    await supabase.from("subcategories").delete().eq("id", subId);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, subcategories: (c.subcategories || []).filter((s) => s.id !== subId) }
          : c
      )
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      {/* Header */}
      <div className="bg-[var(--brand)] text-white px-5 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium">Categories</h1>
            <p className="text-white/70 text-xs mt-0.5">Manage expense categories</p>
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

        {/* Add category form */}
        {showAddCat && (
          <div className="bg-card rounded-2xl border border-[var(--brand)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">New Category</p>
              <button onClick={() => setShowAddCat(false)}>
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name"
              autoFocus
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[var(--brand)] transition-colors"
            />
            {/* Color picker */}
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
                    aria-label={`Select color ${color}`}
                  >
                    {newCatColor === color && (
                      <Check size={14} className="text-white" strokeWidth={3} />
                    )}
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

        {/* Categories list */}
        {categories.length === 0 && !showAddCat ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--brand-light)] flex items-center justify-center mb-4">
              <Plus size={28} className="text-[var(--brand)]" />
            </div>
            <p className="text-muted-foreground text-sm">No categories yet</p>
            <button
              onClick={() => setShowAddCat(true)}
              className="mt-3 text-sm text-[var(--brand)] font-medium"
            >
              Create your first category
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className={cn(
                  "transition-all",
                  idx < categories.length - 1 && expandedId !== cat.id
                    ? "border-b border-border"
                    : ""
                )}
              >
                {/* Category row */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: cat.color }}
                  />
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() =>
                      setExpandedId(expandedId === cat.id ? null : cat.id)
                    }
                  >
                    <p className="text-sm font-medium text-foreground">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat.subcategories?.length || 0} sub-categories
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive flex-shrink-0"
                    aria-label={`Delete ${cat.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === cat.id ? null : cat.id)
                    }
                    className="flex-shrink-0"
                    aria-label="Expand"
                  >
                    <ChevronRight
                      size={16}
                      className={cn(
                        "text-muted-foreground transition-transform",
                        expandedId === cat.id ? "rotate-90" : ""
                      )}
                    />
                  </button>
                </div>

                {/* Expanded subcategories */}
                {expandedId === cat.id && (
                  <div className="px-4 pb-4 border-t border-border bg-secondary/40">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-3 mb-2">
                      Sub-categories
                    </p>

                    {/* Existing subcategories */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(cat.subcategories || []).map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1"
                        >
                          <span className="text-xs text-foreground">{sub.name}</span>
                          <button
                            onClick={() => handleDeleteSubcategory(cat.id, sub.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            aria-label={`Delete ${sub.name}`}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                      {(cat.subcategories || []).length === 0 && (
                        <p className="text-xs text-muted-foreground">No sub-categories yet</p>
                      )}
                    </div>

                    {/* Add subcategory */}
                    {addSubForId === cat.id ? (
                      <div className="flex gap-2">
                        <input
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          placeholder="Sub-category name"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddSubcategory(cat.id);
                            if (e.key === "Escape") setAddSubForId(null);
                          }}
                          className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--brand)] transition-colors"
                        />
                        <button
                          onClick={() => handleAddSubcategory(cat.id)}
                          disabled={savingSub || !newSubName.trim()}
                          className="w-9 h-9 bg-[var(--brand)] rounded-xl flex items-center justify-center disabled:opacity-50"
                        >
                          <Check size={15} className="text-white" />
                        </button>
                        <button
                          onClick={() => { setAddSubForId(null); setNewSubName(""); }}
                          className="w-9 h-9 bg-secondary border border-border rounded-xl flex items-center justify-center"
                        >
                          <X size={15} className="text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddSubForId(cat.id);
                          setNewSubName("");
                        }}
                        className="flex items-center gap-1.5 text-xs text-[var(--brand)] font-medium"
                      >
                        <Plus size={13} />
                        Add sub-category
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="h-2" />
      </div>
    </div>
  );
}
