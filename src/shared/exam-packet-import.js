import Papa from 'papaparse'

const HEADERS = ['No', 'Question', 'Answer', 'Category']
const CELL_PADDING = 5 // points between a table rule and the text beside it
const CATEGORIES = [
  ...Array(20).fill('Short Answer'), ...Array(5).fill('Long Answer'),
  ...Array(3).fill('List-Based'), ...Array(2).fill('Calculation')
]

function packetWarnings(questions) {
  const warnings = []
  if (questions.length !== 30) warnings.push(`Expected 30 questions, found ${questions.length}.`)
  questions.forEach((question, index) => {
    if (question.number !== index + 1) warnings.push(`Row ${index + 1} must have question number ${index + 1}.`)
    if (question.category !== CATEGORIES[index]) {
      warnings.push(`Question ${question.number} must use category ${CATEGORIES[index] || 'a valid category'}.`)
    }
    if (!question.question.trim()) warnings.push(`Question ${question.number} has no question text.`)
    if (!question.answer.trim()) warnings.push(`Question ${question.number} has no answer key.`)
  })
  return warnings
}

function parsePacketCsvText(csv) {
  const parsed = Papa.parse(String(csv).replace(/^\uFEFF/, ''), {
    header: true, skipEmptyLines: 'greedy', transformHeader: (value) => value.trim()
  })
  const fields = parsed.meta.fields || []
  if (fields.length !== HEADERS.length || HEADERS.some((header) => !fields.includes(header))) {
    throw new Error(`CSV headers must be exactly: ${HEADERS.join(', ')}.`)
  }

  const questions = parsed.data.map((row, index) => ({
    number: /^\d+$/.test(String(row.No).trim()) ? Number(row.No) : Number.NaN,
    question: String(row.Question ?? '').trim(),
    answer: String(row.Answer ?? '').trim(),
    category: String(row.Category ?? '').trim(),
    assets: [], formulaLatex: '', tolerance: null,
    importRow: index + 2
  }))
  // notices: problems with the file itself. warnings: row checks, which change as rows are corrected.
  const notices = parsed.errors.map((error) => `CSV row ${error.row + 2}: ${error.message}`)
  return { questions, warnings: packetWarnings(questions), notices }
}

async function parsePacketCsv(file) {
  const csv = typeof file === 'string' ? file : await file.text()
  return parsePacketCsvText(csv)
}

function lineGroups(items) {
  // Space pieces are ignored: their widths do not reliably show where words or cells end.
  const ordered = items.filter((item) => item.str?.trim()).map((item) => ({
    text: item.str.trim(), x: item.transform?.[4] ?? item.x ?? 0, y: item.transform?.[5] ?? item.y ?? 0,
    width: item.width ?? 0
  })).sort((a, b) => b.y - a.y || a.x - b.x)
  const lines = []
  for (const item of ordered) {
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 2.5)
    if (!line) {
      line = { y: item.y, items: [] }
      lines.push(line)
    }
    line.items.push(item)
  }
  return lines.sort((a, b) => b.y - a.y).map((line) => ({
    ...line, items: line.items.sort((a, b) => a.x - b.x)
  }))
}

function headerPositions(line) {
  const found = new Map()
  for (const item of line.items) {
    const value = item.text.trim().toLowerCase().replace(/\.$/, '')
    const header = HEADERS.find((candidate) => candidate.toLowerCase() === value)
    if (header) found.set(header, item)
  }
  return HEADERS.every((header) => found.has(header))
    ? HEADERS.map((header) => found.get(header))
    : null
}

// Where the Question, Answer and Category columns begin. Headers are usually centred over their
// columns, while cell text starts much further left than its header.
function columnLimits([no, question, answer, category], lines) {
  const questionStart = no.x + (question.x - no.x) * 0.4
  let answerStart = (question.x + answer.x) / 2
  // Left edge of the question text, taken from the lines that open a numbered row.
  const textStart = Math.min(...lines.map(({ items: [first, second] }) => (
    second && first.x < questionStart && parseQuestionNumber(first.text) !== null && second.x >= questionStart
      ? second.x : Number.POSITIVE_INFINITY
  )))
  if (question.x - textStart > 10) {
    // Centred header: the column reaches as far right of the header's centre as it does left of it.
    const centre = question.x + question.width / 2
    answerStart = Math.max(answerStart, 2 * centre - (textStart - CELL_PADDING))
  }
  return [questionStart, answerStart, category.x - 15]
}

// "fi" and "fl" arrive as pieces of their own, so a piece touching the one before it continues the word.
function lineCells(items, limits) {
  const cells = ['', '', '', '']
  let previous = null
  for (const item of items) {
    const cell = limits.filter((limit) => item.x >= limit).length
    const sameWord = previous?.cell === cell && Math.abs(item.y - previous.y) <= 0.5
      && Math.abs(item.x - previous.end) <= 0.5
    cells[cell] += `${cells[cell] && !sameWord ? ' ' : ''}${item.text}`
    previous = { cell, y: item.y, end: item.x + item.width }
  }
  return cells.map((cell) => cell.replace(/\s+/g, ' ').trim())
}

function parseQuestionNumber(value) {
  const match = value.trim().match(/^(\d{1,2})\.?$/)
  return match ? Number(match[1]) : null
}

function reconstructPacketRows(pages) {
  const pageLines = pages.map(lineGroups)
  const allLines = pageLines.flat()
  let limits = null
  let tableLeft = 0
  let row = null
  const rows = []
  const notices = []
  const afterTable = []
  let tableEnded = false
  const append = (target, source, index) => {
    const value = source[index].trim()
    if (value) target[index] = `${target[index]} ${value}`.trim()
  }
  const flush = () => {
    if (row) rows.push(row)
    row = null
  }

  for (const lines of pageLines) {
    for (const line of lines) {
      const header = headerPositions(line)
      if (header) {
        limits = columnLimits(header, allLines)
        tableLeft = header[0].x - 8
        tableEnded = false
        continue
      }
      const text = line.items.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim()
      // Table text sits inside the No column or to its right. Text further left, such as
      // worked solutions at the page margin, means the table is over.
      if (limits && line.items[0].x < tableLeft) {
        flush()
        limits = null
        tableEnded = true
      }
      if (!limits) {
        if (tableEnded) afterTable.push(text)
        continue
      }

      const cells = lineCells(line.items, limits)
      const number = parseQuestionNumber(cells[0])
      if (number !== null && cells.slice(1).some(Boolean)) {
        flush()
        row = { number, cells: ['', cells[1], cells[2], cells[3]] }
      } else if (row) {
        for (let index = 1; index < cells.length; index += 1) append(row.cells, cells, index)
      } else if (cells.some(Boolean)) {
        notices.push(`Unmatched PDF text near page row: ${cells.filter(Boolean).join(' | ')}`)
      }
    }
  }
  flush()
  if (afterTable.length) {
    const left = afterTable.join(' ')
    notices.push(`Left out text found after the table: ${left.length > 200 ? `${left.slice(0, 200)}…` : left}`)
  }

  const questions = rows.map(({ number, cells }) => ({
    number, question: cells[1].trim(), answer: cells[2].trim(),
    category: cells[3].trim().replace(/\s+/g, ' '),
    assets: [], formulaLatex: '', tolerance: null
  }))
  return { questions, warnings: packetWarnings(questions), notices }
}

async function parsePacketPdf(file) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Select a PDF file to import.')
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, useSystemFonts: true
  }).promise
  const pages = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ({ str: item.str, width: item.width, transform: item.transform })))
  }
  return reconstructPacketRows(pages)
}

export { parsePacketCsv, parsePacketCsvText, parsePacketPdf, reconstructPacketRows }
