import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// ─── Expense ──────────────────────────────────────────────────────────────────

// Preset options for "Incurred For"
export const INCURRED_FOR_PRESETS = [
  { value: "self",    label: "Self",    emoji: "🙋" },
  { value: "family",  label: "Family",  emoji: "👨‍👩‍👧" },
  { value: "spouse",  label: "Spouse",  emoji: "💑" },
  { value: "friends", label: "Friends", emoji: "👥" },
  { value: "siblings",label: "Siblings",emoji: "👫" },
  { value: "custom",  label: "Other",   emoji: "✏️" },
] as const;

export type IncurredForPreset = typeof INCURRED_FOR_PRESETS[number]["value"];

export const expenseSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Enter a valid amount" })
    .positive("Amount must be greater than 0")
    .max(10_000_000, "Amount too large"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description too long"),
  notes: z.string().max(500, "Notes too long").optional(),
  category_id: z.string().uuid("Select a category"),
  subcategory_id: z.string().uuid().optional().or(z.literal("")),
  payment_mode: z.enum(["upi", "card", "cash", "bank_transfer", "other"]),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  // Who this expense was incurred for
  incurred_for: z.string().max(50).optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type ExpenseFormValues = z.infer<typeof expenseSchema>;

// ─── Category ─────────────────────────────────────────────────────────────────
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Name too long"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color"),
  icon: z.string().min(1, "Select an icon"),
});

export const subcategorySchema = z.object({
  name: z
    .string()
    .min(1, "Subcategory name is required")
    .max(50, "Name too long"),
  category_id: z.string().uuid("Invalid category"),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
export type SubcategoryFormValues = z.infer<typeof subcategorySchema>;
