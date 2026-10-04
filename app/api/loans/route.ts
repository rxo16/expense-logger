import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [loansRes, settlementsRes] = await Promise.all([
    supabase.from("loans").select("*, lenders(id, name, initials)")
      .eq("user_id", user.id).order("loan_date", { ascending: true }),
    supabase.from("settlements").select("*, lenders(name, initials), settlement_allocations(id, loan_id, amount_applied)")
      .eq("user_id", user.id).order("settlement_date", { ascending: false }).limit(50),
  ]);

  return NextResponse.json({ loans: loansRes.data || [], settlements: settlementsRes.data || [] });
}
