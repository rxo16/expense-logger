import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AddExpenseClient } from "./AddExpenseClient";

export default async function AddExpensePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [categoriesRes, lendersRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*, subcategories(id, name, sort_order)")
      .eq("user_id", user.id)
      .order("sort_order"),
    supabase
      .from("lenders")
      .select("id, name, initials, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at"),
  ]);

  return (
    <AddExpenseClient
      categories={categoriesRes.data || []}
      lenders={lendersRes.data || []}
    />
  );
}
