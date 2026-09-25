import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { logger } from './logger'

function getDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  for (const file of ['.env.local', '.env']) {
    try {
      const p = path.resolve(process.cwd(), file)
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8')
        const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m)
        if (match && match[1]) {
          process.env.DATABASE_URL = match[1]
          return match[1]
        }
      }
    } catch {}
  }
  return undefined
}

const dbUrl = getDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  schemaEnsured: boolean | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

let schemaPromise: Promise<void> | null = null

export function ensureDatabaseSchema(): Promise<void> {
  if (globalForPrisma.schemaEnsured) return Promise.resolve()
  if (schemaPromise) return schemaPromise

  schemaPromise = (async () => {
    try {
      // Safely ensure new columns exist in PostgreSQL without breaking existing tables
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'en';`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "learningStyle" TEXT;`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'en';`)
      globalForPrisma.schemaEnsured = true
      logger.info('DB', 'Database schema successfully verified and patched.')
    } catch (err) {
      // Don't crash if table does not exist yet (e.g. before initial migration)
      logger.warn('DB', 'Schema patch skipped or pending initial migration.', { err: String(err) })
    }
  })()

  return schemaPromise
}
