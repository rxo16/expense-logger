import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExpensesClient } from "./ExpensesClient";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [expensesRes, categoriesRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, categories(name, color, icon), subcategories(name)")
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("categories")
      .select("id, name, color, icon")
      .eq("user_id", user.id)
      .order("sort_order"),
  ]);

  return (
    <ExpensesClient
      expenses={expensesRes.data || []}
      categories={categoriesRes.data || []}
    />
  );
}
