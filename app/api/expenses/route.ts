import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/validations";

// GET /api/expenses — list expenses with optional filters
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category_id = searchParams.get("category_id");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = supabase
    .from("expenses")
    .select("*, categories(name, color, icon), subcategories(name)")
    .eq("user_id", user.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category_id) query = query.eq("category_id", category_id);
  if (date_from) query = query.gte("expense_date", date_from);
  if (date_to) query = query.lte("expense_date", date_to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// POST /api/expenses — create expense
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
