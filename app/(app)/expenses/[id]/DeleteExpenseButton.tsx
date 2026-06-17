"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", expenseId);
    router.push("/expenses");
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="bg-card rounded-2xl border border-destructive/30 p-4 text-center space-y-3">
        <p className="text-sm text-foreground font-medium">Delete this expense?</p>
        <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirm(false)}
            className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-medium text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-medium disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-destructive/30 text-destructive text-sm font-medium"
    >
      <Trash2 size={15} />
      Delete expense
    </button>
  );
}
