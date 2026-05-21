import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type SetInput = {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
};

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const body = (await req.json()) as {
    sets?: SetInput[];
    finishedAt?: string;
    duration?: number;
    notes?: string;
  };

  // Insert SetLog entries if provided
  if (Array.isArray(body.sets) && body.sets.length > 0) {
    const rows = body.sets
      .filter((s) => s && s.exerciseId && Number.isFinite(s.setNumber))
      .map((s) => ({
        id: makeId("set"),
        executionId: id,
        exerciseId: s.exerciseId,
        setNumber: s.setNumber,
        reps: Math.max(0, Math.floor(Number(s.reps) || 0)),
        weight: Number.isFinite(Number(s.weight)) ? Number(s.weight) : 0,
        completedAt: new Date().toISOString(),
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("SetLog").insert(rows);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
  }

  // Finalize execution
  const updateData: Record<string, any> = {};
  if (body.finishedAt) updateData.finishedAt = body.finishedAt;
  if (typeof body.duration === "number") updateData.duration = Math.max(0, Math.floor(body.duration));
  if (typeof body.notes === "string") updateData.notes = body.notes;

  let updated: any = null;
  if (Object.keys(updateData).length > 0) {
    const { data, error } = await supabase
      .from("WorkoutExecution")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    updated = data;
  } else {
    const { data } = await supabase
      .from("WorkoutExecution")
      .select()
      .eq("id", id)
      .single();
    updated = data;
  }

  return NextResponse.json(updated ?? { id });
}
