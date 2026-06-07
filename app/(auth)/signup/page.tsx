"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormValues } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(values: SignupFormValues) {
    setLoading(true);
    setAuthError("");
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
      },
    });

    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return;
    }

    // Create profile row
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: values.email,
        full_name: values.full_name,
        currency: "INR",
        financial_year_start: 4,
      });

      // Seed default categories
      await seedDefaultCategories(supabase, data.user.id);
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="py-8 animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[var(--brand)] flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">₹</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Create account</h1>
        <p className="text-muted-foreground text-sm mt-1">Start tracking your expenses</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Full name</label>
          <input
            {...register("full_name")}
            type="text"
            placeholder="Rahul Sharma"
            autoComplete="name"
            className={cn(
              "w-full bg-card border rounded-xl px-4 py-3 text-sm text-foreground outline-none transition-colors",
              errors.full_name ? "border-destructive" : "border-border focus:border-[var(--brand)]"
            )}
          />
          {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email</label>
          <input
            {...register("email")}
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            autoComplete="email"
            className={cn(
              "w-full bg-card border rounded-xl px-4 py-3 text-sm text-foreground outline-none transition-colors",
              errors.email ? "border-destructive" : "border-border focus:border-[var(--brand)]"
            )}
          />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Password</label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Min 6 characters"
              autoComplete="new-password"
              className={cn(
                "w-full bg-card border rounded-xl px-4 py-3 pr-11 text-sm text-foreground outline-none transition-colors",
                errors.password ? "border-destructive" : "border-border focus:border-[var(--brand)]"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Confirm password</label>
          <input
            {...register("confirm_password")}
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            className={cn(
              "w-full bg-card border rounded-xl px-4 py-3 text-sm text-foreground outline-none transition-colors",
              errors.confirm_password ? "border-destructive" : "border-border focus:border-[var(--brand)]"
            )}
          />
          {errors.confirm_password && <p className="text-xs text-destructive mt-1">{errors.confirm_password.message}</p>}
        </div>

        {authError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
            <p className="text-sm text-destructive">{authError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--brand)] text-white rounded-xl py-3.5 text-[15px] font-semibold disabled:opacity-60 active:scale-[0.98] transition-all mt-2"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--brand)] font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}

// Seed default categories for new users
async function seedDefaultCategories(supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>, userId: string) {
  const defaults = [
    { name: "Food", color: "#0F9E76", icon: "basket", subs: ["Delivery", "Restaurant", "Grocery", "Snacks"] },
    { name: "Transport", color: "#185FA5", icon: "car", subs: ["Fuel", "Auto / Cab", "Parking", "Metro"] },
    { name: "Utilities", color: "#854F0B", icon: "bolt", subs: ["Electricity", "Internet", "Water", "Gas"] },
    { name: "Office", color: "#993556", icon: "briefcase", subs: ["Stationery", "Software", "Tax", "Salary"] },
    { name: "Health", color: "#D85A30", icon: "heart", subs: ["Medicine", "Doctor", "Lab Test"] },
    { name: "Other", color: "#5F5E5A", icon: "dots", subs: ["Miscellaneous", "Subscription", "Gift"] },
  ];

  for (let i = 0; i < defaults.length; i++) {
    const cat = defaults[i];
    const { data: catRow } = await supabase
      .from("categories")
      .insert({ user_id: userId, name: cat.name, color: cat.color, icon: cat.icon, sort_order: i })
      .select()
      .single();

    if (catRow) {
      await supabase.from("subcategories").insert(
        cat.subs.map((name, j) => ({
          category_id: catRow.id,
          user_id: userId,
          name,
          sort_order: j,
        }))
      );
    }
  }
}
