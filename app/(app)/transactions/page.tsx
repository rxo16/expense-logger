import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TransactionsClient } from "./TransactionsClient";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [expensesRes, categoriesRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, categories(id, name, color), subcategories(id, name)")
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("categories")
      .select("id, name, color, subcategories(id, name)")
      .eq("user_id", user.id)
      .order("sort_order"),
  ]);

  return (
    <TransactionsClient
      expenses={expensesRes.data || []}
      categories={categoriesRes.data || []}
    />
  );
}
