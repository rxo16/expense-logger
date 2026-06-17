import { create } from "zustand";
import type { Category, Subcategory } from "@/types";

interface CategoryStore {
  categories: Category[];
  loading: boolean;
  // Actions
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  addSubcategory: (categoryId: string, sub: Subcategory) => void;
  updateSubcategory: (categoryId: string, subId: string, updates: Partial<Subcategory>) => void;
  removeSubcategory: (categoryId: string, subId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useCategoryStore = create<CategoryStore>((set) => ({
  categories: [],
  loading: false,

  setCategories: (categories) => set({ categories }),

  addCategory: (category) =>
    set((state) => ({
      categories: [...state.categories, category],
    })),

  updateCategory: (id, updates) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  removeCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    })),

  addSubcategory: (categoryId, sub) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === categoryId
          ? { ...c, subcategories: [...(c.subcategories || []), sub] }
          : c
      ),
    })),

  updateSubcategory: (categoryId, subId, updates) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              subcategories: (c.subcategories || []).map((s) =>
                s.id === subId ? { ...s, ...updates } : s
              ),
            }
          : c
      ),
    })),

  removeSubcategory: (categoryId, subId) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              subcategories: (c.subcategories || []).filter(
                (s) => s.id !== subId
              ),
            }
          : c
      ),
    })),

  setLoading: (loading) => set({ loading }),
}));
