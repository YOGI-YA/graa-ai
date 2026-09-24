import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

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
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
