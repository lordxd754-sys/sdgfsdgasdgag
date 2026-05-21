import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { studentId, workoutId, sessionId } = body ?? {};

  if (!studentId || !workoutId || !sessionId) {
    return NextResponse.json(
      { error: "studentId, workoutId and sessionId are required" },
      { status: 400 }
    );
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `exec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const { data, error } = await supabase
    .from("WorkoutExecution")
    .insert({
      id,
      studentId,
      workoutId,
      sessionId,
      startedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
