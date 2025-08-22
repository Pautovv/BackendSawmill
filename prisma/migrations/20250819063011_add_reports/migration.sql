-- CreateTable
CREATE TABLE "public"."TaskReport" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "totalQuantity" DOUBLE PRECISION,
    "totalUnit" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskStepResult" (
    "id" SERIAL NOT NULL,
    "taskReportId" INTEGER NOT NULL,
    "stepAssignmentId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "notes" TEXT,

    CONSTRAINT "TaskStepResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskReport_taskId_key" ON "public"."TaskReport"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskStepResult_taskReportId_stepAssignmentId_key" ON "public"."TaskStepResult"("taskReportId", "stepAssignmentId");

-- AddForeignKey
ALTER TABLE "public"."TaskReport" ADD CONSTRAINT "TaskReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskStepResult" ADD CONSTRAINT "TaskStepResult_taskReportId_fkey" FOREIGN KEY ("taskReportId") REFERENCES "public"."TaskReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskStepResult" ADD CONSTRAINT "TaskStepResult_stepAssignmentId_fkey" FOREIGN KEY ("stepAssignmentId") REFERENCES "public"."TaskStepAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
