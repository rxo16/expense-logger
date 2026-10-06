import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, currency, financial_year_start, loan_default_on, lending_rate_pa")
    .eq("id", user.id)
    .single();

  return (
    <SettingsClient
      profile={profile}
      email={user.email || ""}
    />
  );
}
