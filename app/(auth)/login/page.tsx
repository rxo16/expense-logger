"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setLoading(true);
    setAuthError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setAuthError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="py-8 animate-slide-up">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[var(--brand)] flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">₹</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground text-sm mt-1">Sign in to your expense tracker</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            Email
          </label>
          <input
            {...register("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={cn(
              "w-full bg-card border rounded-xl px-4 py-3 text-sm text-foreground outline-none transition-colors",
              errors.email
                ? "border-destructive"
                : "border-border focus:border-[var(--brand)]"
            )}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn(
                "w-full bg-card border rounded-xl px-4 py-3 pr-11 text-sm text-foreground outline-none transition-colors",
                errors.password
                  ? "border-destructive"
                  : "border-border focus:border-[var(--brand)]"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Auth error */}
        {authError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
            <p className="text-sm text-destructive">{authError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--brand)] text-white rounded-xl py-3.5 text-[15px] font-semibold disabled:opacity-60 active:scale-[0.98] transition-all mt-2"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[var(--brand)] font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
