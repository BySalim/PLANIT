-- CreateEnum
CREATE TYPE "PlanningViewKind" AS ENUM ('CLASSE', 'SALLE', 'PROF');

-- CreateTable
CREATE TABLE "planning_view_groups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "view" "PlanningViewKind" NOT NULL,
    "name" TEXT NOT NULL,
    "refIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planning_view_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planning_view_groups_userId_view_idx" ON "planning_view_groups"("userId", "view");

-- AddForeignKey
ALTER TABLE "planning_view_groups" ADD CONSTRAINT "planning_view_groups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
