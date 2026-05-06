import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

export const isDbEnabled = Boolean(databaseUrl);

const globalForPrisma = globalThis;

export const prisma = isDbEnabled
  ? globalForPrisma.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    })
  : null;

if (isDbEnabled && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
