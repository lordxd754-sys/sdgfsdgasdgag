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
      student: { include: { photos: { orderBy: { takenAt: "desc" }, take: 4 } } },
      sessions: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workout);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const body = await req.json();

  // Delete existing sessions if updating sessions
  if (body.sessions) {
    await prisma.workoutSession.deleteMany({ where: { workoutId: id } });
  }

  const workout = await prisma.workout.update({
    where: { id },
    data: {
      ...(body.title ? { title: body.title } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.mfitSynced ? { mfitSyncedAt: new Date() } : {}),
      ...(body.sessions
        ? {
            sessions: {
              create: body.sessions.map((s: any, si: number) => ({
                name: s.name,
                order: s.order ?? si + 1,
                exercises: {
                  create: s.exercises.map((ex: any, ei: number) => ({
                    name: ex.name,
                    sets: parseInt(String(ex.sets)) || 3,
                    reps: String(ex.reps),
                    rest: parseInt(String(ex.rest)) || 60,
                    notes: ex.notes || null,
                    order: ex.order ?? ei + 1,
                  })),
                },
              })),
            },
          }
        : {}),
    },
    include: {
      sessions: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  return NextResponse.json(workout);
}
