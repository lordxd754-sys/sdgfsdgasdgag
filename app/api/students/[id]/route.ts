import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { takenAt: "desc" } },
      workouts: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { sentAt: "desc" } },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(student);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const body = await req.json();

  try {
    const student = await prisma.student.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        birthdate: body.birthdate ? new Date(body.birthdate) : null,
        city: body.city || null,
        goal: body.goal || null,
        level: body.level ?? "iniciante",
        daysPerWeek: parseInt(body.daysPerWeek ?? "3") || 3,
        sessionDuration: parseInt(body.sessionDuration ?? "60") || 60,
        restrictions: body.restrictions || null,
        equipment: body.equipment || null,
        notes: body.notes || null,
        status: body.status ?? "ativo",
        mfitId: body.mfitId || null,
      },
    });
    return NextResponse.json(student);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  await prisma.student.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
