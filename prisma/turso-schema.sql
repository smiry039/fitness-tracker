-- CreateTable
CREATE TABLE "Exercise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "muscleGroup" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'weight'
);

-- CreateTable
CREATE TABLE "RoutineDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "focus" TEXT,
    "dayOfWeek" INTEGER,
    "dayOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "RoutineExercise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "routineDayId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "targetSets" INTEGER NOT NULL DEFAULT 3,
    "targetReps" TEXT NOT NULL DEFAULT '8-12',
    "cue" TEXT,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RoutineExercise_routineDayId_fkey" FOREIGN KEY ("routineDayId") REFERENCES "RoutineDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoutineExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "routineDayId" INTEGER,
    "notes" TEXT,
    CONSTRAINT "WorkoutSession_routineDayId_fkey" FOREIGN KEY ("routineDayId") REFERENCES "RoutineDay" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SetLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "setNumber" INTEGER NOT NULL DEFAULT 1,
    "reps" INTEGER,
    "weight" REAL,
    "durationSec" INTEGER,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SetLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SetLog_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Viking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL DEFAULT 'Ragnar',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VikingStat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vikingId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VikingStat_vikingId_fkey" FOREIGN KEY ("vikingId") REFERENCES "Viking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineExercise_routineDayId_exerciseId_key" ON "RoutineExercise"("routineDayId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "VikingStat_vikingId_key_key" ON "VikingStat"("vikingId", "key");

