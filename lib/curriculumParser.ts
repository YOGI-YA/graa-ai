import mammoth from 'mammoth'
import axios from 'axios'
import { logger } from './logger'

// Type-safe dynamic import / require for pdf-parse to avoid Node/Next bundler edge cases
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    return data.text || ''
  } catch (err) {
    logger.error('CURRICULUM_PARSE', 'PDF parsing failed', err)
    throw new Error('Failed to parse PDF document. Please ensure it is not password protected.')
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  } catch (err) {
    logger.error('CURRICULUM_PARSE', 'DOCX parsing failed', err)
    throw new Error('Failed to parse Word document (.docx).')
  }
}

async function extractTextFromImageWithVision(buffer: Buffer, mimeType: string): Promise<string> {
  const nvidiaKey = process.env.NVIDIA_API_KEY
  if (!nvidiaKey) {
    throw new Error('NVIDIA API Key is required for extracting text from curriculum images/scans.')
  }

  const base64Image = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64Image}`

  try {
    const response = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract and transcribe all text from this syllabus / curriculum image verbatim. Include course titles, module/unit numbers, topics, subtopics, textbooks, and grading schemes in clean structured markdown text.',
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        max_tokens: 2500,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${nvidiaKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      }
    )

    const text = response.data?.choices?.[0]?.message?.content?.trim()
    return text || ''
  } catch (err) {
    logger.error('CURRICULUM_PARSE', 'Image vision extraction failed', err)
    throw new Error('Could not extract text from curriculum image. Please try a PDF or text file.')
  }
}

export async function parseCurriculumBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<{ text: string; fileName: string; charCount: number }> {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  let text = ''

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    text = await extractTextFromPdf(buffer)
  } else if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    text = await extractTextFromDocx(buffer)
  } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext) || mimeType?.startsWith('image/')) {
    text = await extractTextFromImageWithVision(buffer, mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`)
  } else if (['txt', 'md', 'markdown', 'csv', 'json', 'rtf'].includes(ext) || mimeType?.startsWith('text/')) {
    text = buffer.toString('utf-8')
  } else {
    try {
      text = buffer.toString('utf-8')
    } catch {
      throw new Error(`Unsupported file format: .${ext}. Please upload a PDF, DOCX, TXT, MD, or Image file.`)
    }
  }

  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleanedText || cleanedText.length < 20) {
    throw new Error('The uploaded file appears to be empty or contains insufficient text.')
  }

  return {
    text: cleanedText,
    fileName,
    charCount: cleanedText.length,
  }
}
