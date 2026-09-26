from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import pypdf
import docx
import io
import re
from typing import Optional, List, Dict, Any

app = FastAPI(
    title="GRAA-AI Curriculum Document Extractor",
    description="High-performance, layout-aware microservice for extracting syllabus and curriculum documents (PDF, DOCX, TXT).",
    version="1.0.0"
)

# Enable CORS so Next.js on Vercel or localhost can communicate directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_academic_text(text: str) -> str:
    """Removes common PDF noise, header pagination, and duplicate spaces."""
    if not text:
        return ""
    # Strip standalone page numbers: e.g. "Page 1 of 24" or "- 12 -"
    text = re.sub(r'(?i)\bpage\s+\d+\s+of\s+\d+\b', '', text)
    text = re.sub(r'^\s*[-—]\s*\d+\s*[-—]\s*$', '', text, flags=re.MULTILINE)
    # Normalize whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def extract_units_and_topics(text: str) -> List[Dict[str, Any]]:
    """Heuristically extracts units, modules, and topics from syllabus text."""
    units = []
    # Match patterns like: Unit 1:, Module 2 -, Chapter 3., UNIT I:, SECTION A
    unit_pattern = re.compile(
        r'(?i)(?:^|\n)(?:unit|module|chapter|section)\s+([0-9IVXLCDMivxlcdm]+|[A-Z])[\s:\.\-—]+([^\n]+)',
        re.MULTILINE
    )
    matches = list(unit_pattern.finditer(text))
    
    for i, match in enumerate(matches):
        unit_num = match.group(1).strip()
        unit_title = match.group(2).strip()
        start_pos = match.end()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        unit_body = text[start_pos:end_pos].strip()
        
        # Extract bullet points / topics
        raw_lines = [l.strip(' •*-–\t') for l in unit_body.split('\n') if len(l.strip(' •*-–\t')) > 3]
        topics = raw_lines[:15]  # Limit to 15 key subtopics per unit
        
        units.append({
            "unit": f"Unit {unit_num}: {unit_title}",
            "title": unit_title,
            "topics": topics,
            "bodySnippet": unit_body[:1000]
        })
    
    return units

@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "GRAA-AI Curriculum Document Extractor",
        "version": "1.0.0",
        "supported_formats": ["pdf", "docx", "doc", "txt", "md", "rtf", "csv"]
    }

@app.post("/extract")
async def extract_document(
    file: UploadFile = File(...),
    max_pages: Optional[int] = Query(default=100, description="Max pages to extract from PDF")
):
    """
    Extracts high-fidelity text and structured syllabus units from an uploaded file.
    Supports up to 100MB documents with zero Vercel payload limits.
    """
    filename = file.filename or "document.pdf"
    ext = filename.lower().split(".")[-1]
    contents = await file.read()
    
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    extracted_pages = []
    raw_full_text = ""

    try:
        # 1. PDF Extraction via pdfplumber with pypdf fallback
        if ext == "pdf":
            try:
                with pdfplumber.open(io.BytesIO(contents)) as pdf:
                    total_pages = len(pdf.pages)
                    pages_to_read = min(total_pages, max_pages or 100)
                    for page_idx in range(pages_to_read):
                        page = pdf.pages[page_idx]
                        # Extract text with layout preservation
                        text = page.extract_text(layout=True) or page.extract_text()
                        if text and text.strip():
                            cleaned = clean_academic_text(text)
                            extracted_pages.append(cleaned)
            except Exception as plumber_err:
                # Fallback to pypdf for encrypted/unusual PDF structures
                reader = pypdf.PdfReader(io.BytesIO(contents))
                total_pages = len(reader.pages)
                pages_to_read = min(total_pages, max_pages or 100)
                for page_idx in range(pages_to_read):
                    page = reader.pages[page_idx]
                    text = page.extract_text()
                    if text and text.strip():
                        extracted_pages.append(clean_academic_text(text))

            raw_full_text = "\n\n".join(extracted_pages).strip()

        # 2. Word (.docx) Extraction via python-docx
        elif ext in ["docx", "doc"]:
            doc = docx.Document(io.BytesIO(contents))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            # Also extract text inside tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                    if row_text:
                        paragraphs.append(row_text)
            raw_full_text = "\n".join(paragraphs).strip()

        # 3. Plain Text / Markdown / CSV
        elif ext in ["txt", "md", "markdown", "rtf", "csv", "json"]:
            raw_full_text = contents.decode("utf-8", errors="ignore").strip()

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: .{ext}. Supported: PDF, DOCX, TXT, MD."
            )

        if not raw_full_text or len(raw_full_text) < 15:
            raise HTTPException(
                status_code=400,
                detail="Could not extract readable text from document. Ensure it contains text and is not a password-protected scan."
            )

        # Extract structured units and modules outline
        units = extract_units_and_topics(raw_full_text)

        # Generate a concise high-density outline
        condensed_outline = ""
        if units:
            condensed_outline = "\n".join([
                f"• {u['unit']}\n  Topics: {', '.join(u['topics'][:8]) if u['topics'] else 'Core unit fundamentals'}"
                for u in units
            ])

        return {
            "success": True,
            "filename": filename,
            "char_count": len(raw_full_text),
            "pages_extracted": len(extracted_pages) if ext == "pdf" else 1,
            "units_detected": len(units),
            "units": units,
            "condensed_outline": condensed_outline,
            "text": raw_full_text
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse document: {str(e)}"
        )
