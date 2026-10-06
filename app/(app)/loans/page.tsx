import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoansClient } from "./LoansClient";

export default async function LoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [lendersRes, loansRes, settlementsRes, profileRes] = await Promise.all([
    supabase.from("lenders").select("*").eq("user_id", user.id)
      .order("is_default", { ascending: false }).order("created_at"),
    supabase.from("loans")
      .select("*, lenders(id, name, initials, is_default)")
      .eq("user_id", user.id)
      .order("loan_date", { ascending: true }),
    supabase.from("settlements")
      .select("*, lenders(name, initials), settlement_allocations(id, loan_id, amount_applied)")
      .eq("user_id", user.id)
      .order("settlement_date", { ascending: false })
      .limit(50),
    supabase.from("profiles")
      .select("lending_rate_pa, loan_default_on")
      .eq("id", user.id)
      .single(),
  ]);

  return (
    <LoansClient
      lenders={lendersRes.data || []}
      loans={loansRes.data || []}
      settlements={settlementsRes.data || []}
      userId={user.id}
      lendingRatePa={profileRes.data?.lending_rate_pa ?? 0}
    />
  );
}
