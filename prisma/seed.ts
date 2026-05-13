import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({ url: `file:${process.cwd()}/dev.db` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@ptmanager.com" },
    update: {},
    create: {
      email: "admin@ptmanager.com",
      password: hashedPassword,
      name: "Personal Trainer",
    },
  });
  console.log("Admin user created: admin@ptmanager.com / admin123");

  // Settings
  const existing = await prisma.settings.findFirst();
  if (!existing) {
    await prisma.settings.create({
      data: {
        followUpTemplate:
          "Olá {nome}! Tudo bem? Passando para ver como está indo o {treino_atual}. Qualquer dúvida pode me chamar! 💪",
        autoFollowUp: false,
        followUpHour: 8,
      },
    });
  }

  // Sample students
  const ana = await prisma.student.upsert({
    where: { email: "ana.silva@email.com" },
    update: {},
    create: {
      name: "Ana Silva",
      email: "ana.silva@email.com",
      phone: "+5511999990001",
      city: "São Paulo",
      goal: "Emagrecimento e condicionamento",
      level: "iniciante",
      daysPerWeek: 3,
      sessionDuration: 60,
      restrictions: "Dor leve no joelho direito",
      equipment: "Academia completa",
      notes: "Prefere treinos de menor impacto",
      status: "ativo",
      lastContactAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
    },
  });

  const carlos = await prisma.student.upsert({
    where: { email: "carlos.mendes@email.com" },
    update: {},
    create: {
      name: "Carlos Mendes",
      email: "carlos.mendes@email.com",
      phone: "+5511999990002",
      city: "Campinas",
      goal: "Hipertrofia muscular",
      level: "intermediario",
      daysPerWeek: 5,
      sessionDuration: 75,
      restrictions: null,
      equipment: "Academia completa com halteres e máquinas",
      notes: "Já treina há 2 anos, quer focar em massa",
      status: "ativo",
      lastContactAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  });

  const julia = await prisma.student.upsert({
    where: { email: "julia.costa@email.com" },
    update: {},
    create: {
      name: "Julia Costa",
      email: "julia.costa@email.com",
      phone: "+5511999990003",
      city: "Rio de Janeiro",
      goal: "Condicionamento e performance",
      level: "avancado",
      daysPerWeek: 4,
      sessionDuration: 90,
      restrictions: "Hérnia de disco L4-L5 (leve)",
      equipment: "Casa com halteres até 20kg e barra",
      notes: "Atleta amadora de crossfit, quer complementar treino",
      status: "ativo",
      lastContactAt: new Date(),
    },
  });

  // Workout for Carlos
  const carlosWorkout = await prisma.workout.findFirst({ where: { studentId: carlos.id } });
  if (!carlosWorkout) {
    await prisma.workout.create({
      data: {
        studentId: carlos.id,
        title: "Treino Hipertrofia - Intermediário",
        content: "{}",
        status: "aprovado",
        sessions: {
          create: [
            {
              name: "Treino A - Peito e Tríceps",
              order: 1,
              exercises: {
                create: [
                  { name: "Supino Reto com Barra", sets: 4, reps: "8-10", rest: 90, notes: "Descer até o peito", order: 1 },
                  { name: "Supino Inclinado Halteres", sets: 3, reps: "10-12", rest: 75, notes: null, order: 2 },
                  { name: "Crucifixo Máquina", sets: 3, reps: "12-15", rest: 60, notes: "Sentir o alongamento", order: 3 },
                  { name: "Tríceps Corda", sets: 4, reps: "12-15", rest: 60, notes: null, order: 4 },
                  { name: "Tríceps Testa", sets: 3, reps: "10-12", rest: 60, notes: null, order: 5 },
                ],
              },
            },
            {
              name: "Treino B - Costas e Bíceps",
              order: 2,
              exercises: {
                create: [
                  { name: "Puxada Frontal", sets: 4, reps: "8-10", rest: 90, notes: "Puxar até o queixo", order: 1 },
                  { name: "Remada Curvada", sets: 4, reps: "8-10", rest: 90, notes: "Coluna neutra", order: 2 },
                  { name: "Remada Unilateral", sets: 3, reps: "10-12", rest: 75, notes: null, order: 3 },
                  { name: "Rosca Direta", sets: 4, reps: "10-12", rest: 60, notes: null, order: 4 },
                  { name: "Rosca Concentrada", sets: 3, reps: "12-15", rest: 60, notes: null, order: 5 },
                ],
              },
            },
            {
              name: "Treino C - Pernas",
              order: 3,
              exercises: {
                create: [
                  { name: "Agachamento Livre", sets: 4, reps: "8-10", rest: 120, notes: "Profundidade total", order: 1 },
                  { name: "Leg Press 45°", sets: 4, reps: "10-12", rest: 90, notes: null, order: 2 },
                  { name: "Extensora", sets: 3, reps: "12-15", rest: 60, notes: null, order: 3 },
                  { name: "Stiff", sets: 4, reps: "10-12", rest: 90, notes: "Sentir isquiotibiais", order: 4 },
                  { name: "Panturrilha na Máquina", sets: 4, reps: "15-20", rest: 45, notes: null, order: 5 },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // Sample form response
  const formCount = await prisma.formResponse.count();
  if (formCount === 0) {
    await prisma.formResponse.create({
      data: {
        rawData: JSON.stringify({
          q3_nome: "Pedro Alves",
          q4_email: "pedro.alves@email.com",
          q5_phone: "+5511999990004",
          q6_objetivo: "Ganho de massa muscular",
          nivel: "iniciante",
          disponibilidade: "3 vezes por semana",
        }),
        status: "novo",
      },
    });
  }

  console.log("Seed completed!");
  console.log("Sample students: Ana Silva, Carlos Mendes, Julia Costa");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
