import { readFileSync, existsSync, statSync } from 'fs'
import { resolve, extname } from 'path'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam, readNumberParam } from './common'

const MAX_PDF_SIZE = 50 * 1024 * 1024
const DEFAULT_MAX_PAGES = 30
const MAX_RENDER_PAGES = 10
const MIN_TEXT_CHARS = 200
const MAX_PIXELS_PER_PAGE = 4_000_000

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
type CanvasModule = typeof import('@napi-rs/canvas')

let pdfJsPromise: Promise<PdfJsModule> | null = null
let canvasPromise: Promise<CanvasModule> | null = null

function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').catch((err) => {
      pdfJsPromise = null
      throw new Error(`Failed to load pdfjs-dist: ${String(err)}`)
    })
  }
  return pdfJsPromise
}

function loadCanvas(): Promise<CanvasModule> {
  if (!canvasPromise) {
    canvasPromise = import('@napi-rs/canvas').catch((err) => {
      canvasPromise = null
      throw new Error(`Failed to load @napi-rs/canvas: ${String(err)}`)
    })
  }
  return canvasPromise
}

function parsePageRange(range: string, totalPages: number, maxPages: number): number[] {
  const pages = new Set<number>()
  const parts = range.split(',').map((p) => p.trim())

  for (const part of parts) {
    if (!part) continue
    const dashMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part)
    if (dashMatch) {
      const start = Number(dashMatch[1])
      const end = Number(dashMatch[2])
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < start) {
        throw new Error(`Invalid page range: "${part}"`)
      }
      for (let i = start; i <= Math.min(end, totalPages, maxPages); i++) {
        pages.add(i)
      }
    } else {
      const num = Number(part)
      if (!Number.isFinite(num) || num < 1) {
        throw new Error(`Invalid page number: "${part}"`)
      }
      if (num <= totalPages && num <= maxPages) {
        pages.add(num)
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b)
}

function resolveEffectivePages(
  totalPages: number,
  pageNumbers: number[] | undefined,
  maxPages: number
): number[] {
  return pageNumbers
    ? pageNumbers.filter((p) => p >= 1 && p <= totalPages)
    : Array.from({ length: Math.min(totalPages, maxPages) }, (_, i) => i + 1)
}

async function extractText(
  getDocument: PdfJsModule['getDocument'],
  data: Uint8Array,
  pages: number[]
): Promise<string[]> {
  const pdf = await getDocument({ data, disableWorker: true }).promise
  const textParts: string[] = []

  for (const pageNum of pages) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? String(item.str) : ''))
      .filter(Boolean)
      .join(' ')
    if (pageText.trim()) {
      textParts.push(`[Page ${pageNum}]\n${pageText}`)
    }
  }

  return textParts
}

async function renderPagesToImages(
  getDocument: PdfJsModule['getDocument'],
  createCanvas: CanvasModule['createCanvas'],
  data: Uint8Array,
  pages: number[]
): Promise<string[]> {
  const pdf = await getDocument({ data, disableWorker: true }).promise
  const renderPages = pages.slice(0, MAX_RENDER_PAGES)
  const dataUrls: string[] = []

  for (const pageNum of renderPages) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const pagePixels = viewport.width * viewport.height
    const scale = Math.min(1, Math.sqrt(MAX_PIXELS_PER_PAGE / Math.max(1, pagePixels)))
    const scaled = page.getViewport({ scale: Math.max(0.1, scale) })

    const canvas = createCanvas(Math.ceil(scaled.width), Math.ceil(scaled.height))
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport: scaled
    }).promise

    const png = canvas.toBuffer('image/png')
    dataUrls.push(`data:image/png;base64,${png.toString('base64')}`)
  }

  return dataUrls
}

export const pdfReadTool: AgentTool = {
  definition: {
    name: 'pdf_read',
    description:
      'Read and extract content from a PDF document. Extracts text from each page; for scanned PDFs with little text, renders pages as images for the AI to see. Use this tool when the user asks to read, analyze, or summarize a PDF file.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to the PDF file'
        },
        pages: {
          type: 'string',
          description:
            'Page range to extract, e.g. "1-5", "1,3,5-7". Defaults to all pages (up to 30).'
        },
        maxPages: {
          type: 'number',
          description: 'Maximum number of pages to extract (default 30)'
        }
      },
      required: ['path']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const filePath = readStringParam(args, 'path', true)
      const pagesRaw = readStringParam(args, 'pages')
      const maxPages = readNumberParam(args, 'maxPages', DEFAULT_MAX_PAGES)!

      const absPath = resolve(filePath)

      const ext = extname(absPath).toLowerCase()
      if (ext !== '.pdf') {
        return errorResult(`Not a PDF file: ${filePath} (extension: ${ext})`)
      }

      if (!existsSync(absPath)) {
        return errorResult(`File not found: ${filePath}`)
      }

      const stat = statSync(absPath)
      if (!stat.isFile()) {
        return errorResult(`Not a file: ${filePath}`)
      }

      if (stat.size > MAX_PDF_SIZE) {
        return errorResult(
          `PDF too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`
        )
      }

      const buffer = readFileSync(absPath)
      const data = new Uint8Array(buffer)
      const { getDocument } = await loadPdfJs()

      const tempPdf = await getDocument({ data, disableWorker: true }).promise
      const totalPages = tempPdf.numPages

      let pageNumbers: number[] | undefined
      if (pagesRaw) {
        pageNumbers = parsePageRange(pagesRaw, totalPages, maxPages)
        if (pageNumbers.length === 0) {
          return errorResult(
            `No valid pages in range "${pagesRaw}" (document has ${totalPages} pages)`
          )
        }
      }

      const effectivePages = resolveEffectivePages(totalPages, pageNumbers, maxPages)
      const textParts = await extractText(getDocument, data, effectivePages)
      const fullText = textParts.join('\n\n')
      const sizeKB = (stat.size / 1024).toFixed(1)

      if (fullText.trim().length >= MIN_TEXT_CHARS) {
        return jsonResult({
          path: absPath,
          fileSize: `${sizeKB} KB`,
          totalPages,
          extractedPages: effectivePages,
          content: fullText
        })
      }

      let pageImages: string[] = []
      try {
        const { createCanvas } = await loadCanvas()
        pageImages = await renderPagesToImages(getDocument, createCanvas, data, effectivePages)
      } catch {
        // canvas not available, fall through with text-only result
      }

      if (pageImages.length > 0) {
        const info = {
          path: absPath,
          fileSize: `${sizeKB} KB`,
          totalPages,
          extractedPages: effectivePages,
          renderedPages: pageImages.length,
          note: 'PDF has little extractable text. Pages have been rendered as images for visual analysis.',
          content: fullText || ''
        }
        return {
          success: true,
          content: JSON.stringify(info, null, 2),
          details: info,
          imageDataUrls: pageImages
        }
      }

      return jsonResult({
        path: absPath,
        fileSize: `${sizeKB} KB`,
        totalPages,
        extractedPages: effectivePages,
        warning:
          'No extractable text found and canvas rendering unavailable. This PDF may contain only scanned images.',
        content: fullText || ''
      })
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
