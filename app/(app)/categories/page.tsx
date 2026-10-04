import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("*, subcategories(id, name, sort_order)")
    .eq("user_id", user.id)
    .order("sort_order");

  return <CategoriesClient categories={categories || []} userId={user.id} />;
}
