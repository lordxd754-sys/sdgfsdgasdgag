import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const workout = await prisma.workout.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const text = workout.sessions
    .map((s: (typeof workout.sessions)[number]) => {
      const lines = s.exercises.map(
        (ex: (typeof s.exercises)[number], i: number) =>
          `  ${i + 1}. ${ex.name} | ${ex.sets}x${ex.reps} | ${ex.rest}s descanso${ex.notes ? ` | ${ex.notes}` : ""}`
      );
      return `${s.name}\n${lines.join("\n")}`;
    })
    .join("\n\n");

  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
