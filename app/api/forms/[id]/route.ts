import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const body = await req.json();

  const form = await prisma.formResponse.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.studentId ? { studentId: body.studentId } : {}),
    },
  });

  return NextResponse.json(form);
}
