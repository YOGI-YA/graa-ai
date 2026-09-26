# GRAA-AI Curriculum Document Extractor Microservice 🚀

High-performance, layout-aware microservice for parsing large syllabus & curriculum documents (PDF, DOCX, TXT) up to 100MB+ with **zero serverless payload limits**.

---

## ⚡ Features
- **Unlimited File Size**: Bypasses Vercel's 4.5MB Serverless limit.
- **Deep PDF Layout Engine**: Uses `pdfplumber` + `pypdf` with table & column extraction.
- **Automated Unit Detection**: Heuristically extracts Units, Chapters, Modules & Subtopics.
- **Noise Stripping**: Automatically removes page numbers, exam guidelines, and header disclaimers.

---

## 🚀 1-Click Deploy to Render.com ($0 Free)

1. Push this folder to your GitHub repo (or create a new repo for `pdf-extractor-service`).
2. Log into [Render.com](https://render.com/) -> Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following options:
   - **Name**: `graa-pdf-extractor`
   - **Root Directory**: `pdf-extractor-service` (if in monorepo) or leave empty.
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
5. Click **Deploy Web Service**.

Render will generate a public URL like:
`https://graa-pdf-extractor.onrender.com`

---

## 🔌 Connect to Next.js (`graa-ai`)

Add this to your Next.js `.env` or Vercel Environment Variables:
```env
PDF_EXTRACTOR_SERVICE_URL="https://graa-pdf-extractor.onrender.com"
```

---

## 🧪 Local Testing

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run server
uvicorn main:app --reload --port 8000

# 3. Test extraction via cURL
curl -X POST "http://localhost:8000/extract" \
     -F "file=@/path/to/syllabus.pdf"
```
