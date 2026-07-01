import { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "./db-client";

// Reuse a single PrismaClient across hot-reloads in dev to avoid exhausting
// connections. In production on Turso the adapter is configured in
// createPrismaClient().
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
