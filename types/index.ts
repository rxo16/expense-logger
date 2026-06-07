// ─── Core domain types ───────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  financial_year_start: number; // 1=Jan, 4=Apr
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;       // hex color e.g. "#0F9E76"
  icon: string;        // lucide icon name e.g. "ShoppingBasket"
  sort_order: number;
  created_at: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  category_id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export type PaymentMode = "upi" | "card" | "cash" | "bank_transfer" | "other";

export interface Expense {
  id: string;
  user_id: string;
  category_id: string;
  subcategory_id: string | null;
  amount: number;
  description: string;
  notes: string | null;
  payment_mode: PaymentMode;
  expense_date: string; // ISO date string YYYY-MM-DD
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
  subcategory?: Subcategory;
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface ExpenseFormValues {
  amount: number;
  description: string;
  notes?: string;
  category_id: string;
  subcategory_id?: string;
  payment_mode: PaymentMode;
  expense_date: string;
}

export interface CategoryFormValues {
  name: string;
  color: string;
  icon: string;
}

export interface SubcategoryFormValues {
  name: string;
  category_id: string;
}

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface MonthSummary {
  year: number;
  month: number;          // 1-12
  total: number;
  transaction_count: number;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  category_color: string;
  total: number;
  percentage: number;
  transaction_count: number;
}

export interface DashboardData {
  current_month_total: number;
  last_month_total: number;
  today_total: number;
  current_month_count: number;
  month_over_month_change: number; // percentage
  top_categories: CategoryBreakdown[];
  monthly_trend: MonthSummary[];   // last 6 months
  recent_expenses: Expense[];
}

// ─── API response types ───────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Filter/sort types ────────────────────────────────────────────────────────

export interface ExpenseFilters {
  category_id?: string;
  payment_mode?: PaymentMode;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export type SortField = "expense_date" | "amount" | "created_at";
export type SortOrder = "asc" | "desc";

export interface ExpenseSort {
  field: SortField;
  order: SortOrder;
}

// ─── Store types ──────────────────────────────────────────────────────────────

export interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: AuthState["user"]) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  filters: ExpenseFilters;
  sort: ExpenseSort;
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<ExpenseFilters>) => void;
  setSort: (sort: ExpenseSort) => void;
  clearFilters: () => void;
}

export interface CategoryState {
  categories: Category[];
  loading: boolean;
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  addSubcategory: (categoryId: string, sub: Subcategory) => void;
  removeSubcategory: (categoryId: string, subId: string) => void;
  setLoading: (loading: boolean) => void;
}
