-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."WorkerRole" AS ENUM ('LEAD', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" SERIAL NOT NULL,
    "techCardId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskField" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "TaskField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskStepAssignment" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "stepId" INTEGER NOT NULL,

    CONSTRAINT "TaskStepAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskWorkerAssignment" (
    "id" SERIAL NOT NULL,
    "stepAssignmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "public"."WorkerRole" NOT NULL,

    CONSTRAINT "TaskWorkerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskDocument" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'NEW',
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskStepAssignment_taskId_stepId_key" ON "public"."TaskStepAssignment"("taskId", "stepId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskWorkerAssignment_stepAssignmentId_userId_key" ON "public"."TaskWorkerAssignment"("stepAssignmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDocument_taskId_userId_key" ON "public"."TaskDocument"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_techCardId_fkey" FOREIGN KEY ("techCardId") REFERENCES "public"."TechCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskField" ADD CONSTRAINT "TaskField_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskStepAssignment" ADD CONSTRAINT "TaskStepAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskStepAssignment" ADD CONSTRAINT "TaskStepAssignment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "public"."TechStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskWorkerAssignment" ADD CONSTRAINT "TaskWorkerAssignment_stepAssignmentId_fkey" FOREIGN KEY ("stepAssignmentId") REFERENCES "public"."TaskStepAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskWorkerAssignment" ADD CONSTRAINT "TaskWorkerAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskDocument" ADD CONSTRAINT "TaskDocument_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskDocument" ADD CONSTRAINT "TaskDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
