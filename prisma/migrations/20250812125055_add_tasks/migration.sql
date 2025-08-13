-- CreateTable
CREATE TABLE "public"."Task" (
    "id" SERIAL NOT NULL,
    "passportId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskStep" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "mainWorkerId" INTEGER NOT NULL,

    CONSTRAINT "TaskStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskSecondaryWorker" (
    "id" SERIAL NOT NULL,
    "stepId" INTEGER NOT NULL,
    "workerId" INTEGER NOT NULL,

    CONSTRAINT "TaskSecondaryWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Worker" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "public"."Passport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskStep" ADD CONSTRAINT "TaskStep_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskStep" ADD CONSTRAINT "TaskStep_mainWorkerId_fkey" FOREIGN KEY ("mainWorkerId") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskSecondaryWorker" ADD CONSTRAINT "TaskSecondaryWorker_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "public"."TaskStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskSecondaryWorker" ADD CONSTRAINT "TaskSecondaryWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
