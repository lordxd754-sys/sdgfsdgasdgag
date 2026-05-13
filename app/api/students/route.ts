import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const level = searchParams.get("level") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");

  const where = {
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
    ...(status ? { status } : {}),
    ...(level ? { level } : {}),
  };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.student.count({ where }),
  ]);

  return NextResponse.json({ students, total, page, perPage });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { formId, ...data } = body;

    const student = await prisma.student.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        birthdate: data.birthdate ? new Date(data.birthdate) : null,
        city: data.city || null,
        goal: data.goal || null,
        level: data.level ?? "iniciante",
        daysPerWeek: parseInt(data.daysPerWeek ?? "3") || 3,
        sessionDuration: parseInt(data.sessionDuration ?? "60") || 60,
        restrictions: data.restrictions || null,
        equipment: data.equipment || null,
        notes: data.notes || null,
        status: data.status ?? "ativo",
        mfitId: data.mfitId || null,
      },
    });

    if (formId) {
      await prisma.formResponse.update({
        where: { id: formId },
        data: { status: "processado", studentId: student.id },
      });
    }

    return NextResponse.json(student, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao criar aluno" }, { status: 500 });
  }
}
