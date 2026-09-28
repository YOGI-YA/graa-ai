# 🚀 GRAA-AI Document Extractor Microservice (Fastify + TypeScript)

A dedicated, high-performance, layout-aware microservice designed to extract academic syllabuses, curriculums, and lecture outlines from large documents (PDF, DOCX, TXT, MD).

Built to overcome serverless constraints (Vercel 4.5MB payload limit, 10s execution timeouts) by processing up to **100MB+** documents with streaming multipart and intelligent unit/topic detection.

---

## ✨ Features

- **Massive File Support**: Streaming multipart parsing up to **100 MB** per document.
- **Multi-Engine PDF Extractor**: Uses `unpdf` (Mozilla PDF.js engine) + `pdf-parse` fallback.
- **Word Document Support**: Full `.docx` and `.doc` parsing with table extraction via `mammoth`.
- **Intelligent Syllabus Parser**: Heuristically extracts Units, Modules, Chapters, Topics, and condensed outlines.
- **Zero Vercel Limits**: Runs as an independent container/service on Render, Railway, Fly.io, or VPS.
- **Production Hardened**: `@fastify/rate-limit`, `@fastify/helmet`, `@fastify/cors`, and pino JSON logging.

---

## 🛠️ API Reference

### 1. Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "online",
  "service": "GRAA-AI Fastify Document Extractor",
  "version": "1.0.0",
  "uptimeSeconds": 142,
  "memoryUsageMB": { "rss": 42, "heapUsed": 18 },
  "supportedFormats": ["pdf", "docx", "doc", "txt", "md", "rtf", "csv"],
  "maxUploadMB": 100
}
```

### 2. Extract Document
```http
POST /extract
Content-Type: multipart/form-data
```

**Parameters:**
- `file`: Binary document file (PDF, DOCX, TXT, MD)
- `maxPages` *(optional)*: Maximum pages to extract (default: `100`)
- `extractUnits` *(optional)*: Boolean flag to enable structured unit parsing (default: `true`)

**Response:**
```json
{
  "success": true,
  "metadata": {
    "filename": "cs101_syllabus.pdf",
    "format": "pdf",
    "sizeBytes": 1428571,
    "pageCount": 14,
    "charCount": 38400,
    "unitsDetected": 5
  },
  "condensedOutline": "• Unit 1: Introduction to Data Structures\n  Topics: Arrays, Linked Lists, Stacks, Queues\n\n• Unit 2: Trees and Graphs...",
  "units": [
    {
      "unit": "Unit 1: Introduction to Data Structures",
      "title": "Introduction to Data Structures",
      "topics": ["Arrays", "Linked Lists", "Stacks", "Queues", "Asymptotic Analysis"],
      "bodySnippet": "..."
    }
  ],
  "text": "Full extracted and cleaned syllabus text..."
}
```

---

## 💻 Running Locally

```bash
cd pdf-extractor-service
npm install
npm run dev
```

The service will start at `http://localhost:4000`.

---

## 🚢 Deploying

### Option A: Render (1-Click)
1. Push to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), create a new **Web Service** pointing to this repo.
3. Set **Root Directory** to `pdf-extractor-service`.
4. Render automatically picks up `render.yaml` and deploys.

### Option B: Railway / Docker
Deploy using the included multi-stage `Dockerfile`:
```bash
docker build -t graa-document-extractor .
docker run -p 4000:4000 graa-document-extractor
```

### Option C: Connect to Next.js
In your main Next.js `.env` file, add:
```env
PDF_EXTRACTOR_URL="http://localhost:4000"
# Or in production:
# PDF_EXTRACTOR_URL="https://your-extractor.onrender.com"
```
