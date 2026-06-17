import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/shared/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto relative">
      {/* Page content — padded above bottom nav */}
      <main className="pb-nav min-h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
