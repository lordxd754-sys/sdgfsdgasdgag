-- Add videoUrl to Exercise
ALTER TABLE "Exercise" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- WorkoutExecution table
CREATE TABLE IF NOT EXISTS "WorkoutExecution" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "notes" TEXT,
    CONSTRAINT "WorkoutExecution_pkey" PRIMARY KEY ("id")
);

-- SetLog table
CREATE TABLE IF NOT EXISTS "SetLog" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SetLog_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "WorkoutExecution" ADD CONSTRAINT "WorkoutExecution_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutExecution" ADD CONSTRAINT "WorkoutExecution_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "WorkoutExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
