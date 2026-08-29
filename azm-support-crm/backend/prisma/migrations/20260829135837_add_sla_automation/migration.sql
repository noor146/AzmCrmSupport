-- AlterEnum
ALTER TYPE "TicketEventType" ADD VALUE 'escalated';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "first_responded_at" TIMESTAMP(3),
ADD COLUMN     "resolved_at" TIMESTAMP(3),
ADD COLUMN     "sla_escalated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sla_resolution_due_at" TIMESTAMP(3),
ADD COLUMN     "sla_response_due_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sla_policies" (
    "priority" "TicketPriority" NOT NULL,
    "response_minutes" INTEGER NOT NULL,
    "resolution_minutes" INTEGER NOT NULL,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("priority")
);
