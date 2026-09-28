import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import dotenv from 'dotenv'
import { extractTextFromPdfBuffer } from './extractors/pdf.js'
import { extractTextFromDocxBuffer } from './extractors/docx.js'
import { cleanAcademicText, extractUnitsAndTopics, buildCondensedOutline } from './utils/textCleaner.js'
import { ExtractionResult } from './types.js'

dotenv.config()

const PORT = parseInt(process.env.PORT || '4000', 10)
const HOST = process.env.HOST || '0.0.0.0'
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

const app: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  bodyLimit: MAX_FILE_SIZE,
})

async function bootstrap() {
  // 1. CORS
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })

  // 2. Security Headers
  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  // 3. Rate Limiting
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  })

  // 4. Multipart streaming file upload (supports up to 100MB)
  await app.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    },
  })

  // Health Check
  const healthHandler = async (_req: FastifyRequest, reply: FastifyReply) => {
    const memory = process.memoryUsage()
    return reply.send({
      status: 'online',
      service: 'GRAA-AI Fastify Document Extractor',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      },
      supportedFormats: ['pdf', 'docx', 'doc', 'txt', 'md', 'rtf', 'csv'],
      maxUploadMB: MAX_FILE_SIZE / 1024 / 1024,
    })
  }

  app.get('/', healthHandler)
  app.get('/health', healthHandler)

  // Document Extraction Endpoint
  app.post('/extract', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      let buffer: Buffer | null = null
      let filename = 'document.pdf'
      let maxPages = 100
      let extractUnits = true

      if (req.isMultipart()) {
        const parts = req.parts()
        for await (const part of parts) {
          if (part.type === 'file') {
            filename = part.filename || 'document.pdf'
            buffer = await part.toBuffer()
          } else if (part.fieldname === 'maxPages') {
            maxPages = parseInt(part.value as string, 10) || 100
          } else if (part.fieldname === 'extractUnits') {
            extractUnits = part.value !== 'false'
          }
        }
      } else if (req.headers['content-type']?.includes('application/json')) {
        const body = req.body as any
        if (body?.text) {
          const rawText = cleanAcademicText(body.text)
          const units = extractUnits ? extractUnitsAndTopics(rawText) : []
          const outline = buildCondensedOutline(units)
          const result: ExtractionResult = {
            success: true,
            metadata: {
              filename: body.fileName || 'direct_text.txt',
              format: 'txt',
              sizeBytes: Buffer.byteLength(rawText),
              pageCount: 1,
              charCount: rawText.length,
              unitsDetected: units.length,
            },
            condensedOutline: outline,
            units,
            text: rawText,
          }
          return reply.send(result)
        }
        return reply.status(400).send({ error: 'No text or file provided in JSON body.' })
      }

      if (!buffer || buffer.length === 0) {
        return reply.status(400).send({ error: 'No file uploaded or file is empty.' })
      }

      const ext = filename.toLowerCase().split('.').pop() || 'pdf'
      let rawText = ''
      let pageCount = 1

      // 1. PDF Handling
      if (ext === 'pdf') {
        const pdfResult = await extractTextFromPdfBuffer(buffer, maxPages)
        rawText = pdfResult.text
        pageCount = pdfResult.pageCount
      }
      // 2. Word (.docx / .doc) Handling
      else if (ext === 'docx' || ext === 'doc') {
        const docxResult = await extractTextFromDocxBuffer(buffer)
        rawText = docxResult.text
        pageCount = 1
      }
      // 3. Plain Text / Markdown / CSV
      else if (['txt', 'md', 'markdown', 'rtf', 'csv', 'json'].includes(ext)) {
        rawText = cleanAcademicText(buffer.toString('utf-8'))
        pageCount = 1
      } else {
        return reply.status(400).send({
          error: `Unsupported file extension .${ext}. Supported: PDF, DOCX, TXT, MD, CSV, RTF.`,
        })
      }

      if (!rawText || rawText.length < 15) {
        return reply.status(400).send({
          error: 'Could not extract readable text from document. Ensure it contains text and is not an encrypted or blank file.',
        })
      }

      // Structure syllabus units and outline
      const units = extractUnits ? extractUnitsAndTopics(rawText) : []
      const condensedOutline = buildCondensedOutline(units)

      const result: ExtractionResult = {
        success: true,
        metadata: {
          filename,
          format: ext,
          sizeBytes: buffer.length,
          pageCount,
          charCount: rawText.length,
          unitsDetected: units.length,
        },
        condensedOutline,
        units,
        text: rawText,
      }

      return reply.send(result)
    } catch (err) {
      req.log.error(err, 'Extraction error')
      return reply.status(500).send({
        error: err instanceof Error ? err.message : 'Internal extraction server error.',
      })
    }
  })

  // Start server
  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`🚀 GRAA-AI Document Extractor Service running on http://${HOST}:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

bootstrap()
