import { PrismaClient } from "@prisma/client"
import { databaseUrlForRuntime } from "./database-url"

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient
}

const datasourceUrl = databaseUrlForRuntime(process.env.DATABASE_URL, process.env.VERCEL === "1")
export const prisma = globalForPrisma.prisma ?? new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
