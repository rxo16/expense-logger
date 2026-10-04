import { create } from "zustand";
import type { Expense, ExpenseFilters, ExpenseSort } from "@/types";

interface ExpenseStore {
  expenses: Expense[];
  loading: boolean;
  filters: ExpenseFilters;
  sort: ExpenseSort;
  // Actions
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<ExpenseFilters>) => void;
  setSort: (sort: ExpenseSort) => void;
  clearFilters: () => void;
}

const DEFAULT_SORT: ExpenseSort = {
  field: "expense_date",
  order: "desc",
};

export const useExpenseStore = create<ExpenseStore>((set) => ({
  expenses: [],
  loading: false,
  filters: {},
  sort: DEFAULT_SORT,

  setExpenses: (expenses) => set({ expenses }),

  addExpense: (expense) =>
    set((state) => ({
      expenses: [expense, ...state.expenses],
    })),

  updateExpense: (id, updates) =>
    set((state) => ({
      expenses: state.expenses.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  removeExpense: (id) =>
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    })),

  setLoading: (loading) => set({ loading }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setSort: (sort) => set({ sort }),

  clearFilters: () => set({ filters: {} }),
}));
