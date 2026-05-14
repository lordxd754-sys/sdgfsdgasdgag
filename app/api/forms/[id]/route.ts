import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const body = await req.json();

  const updateData: Record<string, any> = {};
  if (body.status) updateData.status = body.status;
  if (body.studentId) updateData.studentId = body.studentId;

  const { data: form } = await supabase
    .from("FormResponse")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json(form);
}
