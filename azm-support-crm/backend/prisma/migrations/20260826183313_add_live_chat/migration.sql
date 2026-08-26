-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('visitor', 'agent');

-- CreateTable
CREATE TABLE "conversations" (
    "id" SERIAL NOT NULL,
    "visitor_name" TEXT NOT NULL,
    "visitor_email" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "body" TEXT NOT NULL,
    "agent_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_agent_user_id_fkey" FOREIGN KEY ("agent_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
