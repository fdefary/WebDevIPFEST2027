import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { parsePacketCsvText, parsePacketPdf, reconstructPacketRows } from '../src/shared/exam-packet-import.js'

const categories = [
  ...Array(20).fill('Short Answer'), ...Array(5).fill('Long Answer'),
  ...Array(3).fill('List-Based'), ...Array(2).fill('Calculation')
]

function csvPacket() {
  const rows = categories.map((category, index) => [index + 1, `Question ${index + 1}`, `Answer ${index + 1}`, category])
  rows[0][1] = 'Question with, comma and\nline break'
  rows[0][2] = '"Quoted", answer'
  return ['No,Question,Answer,Category', ...rows.map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(','))].join('\n')
}

test('parses quoted CSV cells and multiline questions without losing columns', () => {
  const result = parsePacketCsvText(csvPacket())
  assert.equal(result.questions.length, 30)
  assert.equal(result.questions[0].question, 'Question with, comma and\nline break')
  assert.equal(result.questions[0].answer, '"Quoted", answer')
  assert.deepEqual(result.warnings, [])
})

test('rejects non-exact CSV headers and flags category/order problems for review', () => {
  assert.throws(() => parsePacketCsvText('No,Question,Answer\n1,Q,A'), /headers/i)
  const result = parsePacketCsvText(csvPacket().replace('Short Answer', 'short answer'))
  assert.ok(result.warnings.some((warning) => /category/i.test(warning)))
})

function item(str, x, y) {
  return { str, transform: [1, 0, 0, 1, x, y] }
}

test('reconstructs rows that wrap and continue onto the following PDF page', () => {
  const pages = [
    [
      item('No', 84, 800), item('Question', 152, 800), item('Answer', 304, 800), item('Category', 435, 800),
      item('1', 90, 780), item('Question begins', 119, 780), item('Key begins', 300, 780), item('Short Answer', 424, 780),
      item('and wraps', 119, 765), item('Key continues', 300, 765)
    ],
    [
      item('No', 84, 800), item('Question', 152, 800), item('Answer', 304, 800), item('Category', 435, 800),
      item('across pages', 119, 780), item('on page two', 300, 780),
      item('2', 90, 760), item('Second question', 119, 760), item('Second key', 300, 760), item('Short Answer', 424, 760)
    ]
  ]
  const result = reconstructPacketRows(pages)
  assert.equal(result.questions[0].question, 'Question begins and wraps across pages')
  assert.equal(result.questions[0].answer, 'Key begins Key continues on page two')
  assert.equal(result.questions[1].question, 'Second question')
})

function onePagePdf() {
  const text = [
    ['No', 20, 800], ['Question', 60, 800], ['Answer', 220, 800], ['Category', 350, 800],
    ['1', 20, 780], ['Test question', 60, 780], ['Test key', 220, 780], ['Short Answer', 350, 780]
  ].map(([value, x, y]) => `BT /F1 12 Tf 1 0 0 1 ${x} ${y} Tm (${value}) Tj ET`).join('\n')
  const stream = `${text}\n`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new TextEncoder().encode(pdf)
}

test('extracts selectable text from a PDF file', async () => {
  const bytes = onePagePdf()
  const file = { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }
  const result = await parsePacketPdf(file)
  assert.equal(result.questions[0].question, 'Test question')
  assert.equal(result.questions[0].answer, 'Test key')
  assert.equal(result.questions[0].category, 'Short Answer')
})

test('keeps long answer text inside the answer column before the category cell', () => {
  const result = reconstructPacketRows([[
    item('No', 84, 800), item('Question', 152, 800), item('Answer', 304, 800), item('Category', 435, 800),
    item('1', 90, 780), item('Explain the topic', 119, 780),
    item('Answer text continues', 250, 780), item('here', 394, 780), item('Long Answer', 424, 780)
  ]])
  assert.equal(result.questions[0].answer, 'Answer text continues here')
  assert.equal(result.questions[0].category, 'Long Answer')
})

// Positions copied from a real packet layout (made-up wording): headers are centred, cell text is not.
function run(str, x, y, width) {
  return { str, width, transform: [1, 0, 0, 1, x, y] }
}
const realHeader = [
  run('No', 84.6, 800, 16.7), run('Question', 152.2, 800, 54.1),
  run('Answer', 303.9, 800, 44), run('Category', 435.4, 800, 55.4)
]

test('places justified cell text in its column wherever the column header sits', () => {
  const { questions } = reconstructPacketRows([[...realHeader,
    run('7', 85.2, 726.4, 15.7), run(' ', 100.9, 726.4, 24.6),
    run('Explain', 119.3, 727.5, 37), run(' ', 156.3, 727.5, 73.2), run('how', 229.5, 727.5, 9.5),
    run('Left', 249.8, 727.5, 24.4), run(' ', 274.2, 727.5, 119.6), run('edge', 393.8, 727.5, 11.2),
    run('Long Answer', 423.9, 726.4, 78.5)
  ]])
  assert.deepEqual(questions.map(({ number, question, answer, category }) => [number, question, answer, category]),
    [[7, 'Explain how', 'Left edge', 'Long Answer']])
})

test('joins pieces that touch on the page without adding spaces inside words', () => {
  const { questions } = reconstructPacketRows([[...realHeader,
    run('1', 90, 780, 8), run('rig', 119.3, 780, 13), run(' ', 132.3, 780, 3),
    run('fl', 135.3, 780, 6.8), run('oor', 142.2, 780, 17),
    run('Air-', 249.8, 780, 18), run('fi', 267.8, 780, 6.4), run('lled', 274.2, 780, 22),
    run('Short Answer', 423.9, 780, 78.5)
  ]])
  assert.equal(questions[0].question, 'rig floor')
  assert.equal(questions[0].answer, 'Air-filled')
})

test('ends the table at text starting outside it and reports what it left out', () => {
  const result = reconstructPacketRows([[...realHeader,
    run('30', 85.1, 413.5, 15.8), run('Find the value', 119.3, 413.5, 90), run('46 psi', 301.8, 413.5, 48), run('Calculation', 430, 413.5, 66),
    run('30.', 72, 257.3, 19.5),
    run('worked solution = 46 psi', 108, 107.2, 240)
  ]])
  assert.equal(result.questions.length, 1)
  assert.equal(result.questions[0].question, 'Find the value')
  assert.equal(result.questions[0].answer, '46 psi')
  assert.equal(result.notices.length, 1)
  assert.match(result.notices[0], /after the table.*worked solution/i)
})

test('keeps file problems apart from row checks, which the review table recalculates', () => {
  const clean = parsePacketCsvText(csvPacket().replace('Short Answer', 'short answer'))
  assert.ok(clean.warnings.some((warning) => /category/i.test(warning)))
  assert.deepEqual(clean.notices, [])
  const broken = parsePacketCsvText(`${csvPacket()}\n"31","only two"`)
  assert.ok(broken.notices.some((notice) => /CSV row/.test(notice)))
})

// The real sample holds exam questions and keys, so it and its transcription stay in the Git-ignored
// docs/superpowers folder. This check runs only on machines that have both.
const samplePdf = 'docs/superpowers/specs/Package 1(2).pdf'
const sampleExpected = 'docs/superpowers/specs/package-1-expected.json'

test('reads all 30 rows of the sample packet PDF exactly', {
  skip: !(existsSync(samplePdf) && existsSync(sampleExpected)) && 'local sample files are not present'
}, async () => {
  const bytes = readFileSync(samplePdf)
  const result = await parsePacketPdf({ arrayBuffer: async () => new Uint8Array(bytes).buffer })
  const expected = JSON.parse(readFileSync(sampleExpected, 'utf8'))
  assert.equal(result.questions.length, expected.length)
  expected.forEach(([question, answer], index) => {
    assert.deepEqual(
      [result.questions[index].number, result.questions[index].question, result.questions[index].answer, result.questions[index].category],
      [index + 1, question, answer, categories[index]], `row ${index + 1}`)
  })
  assert.deepEqual(result.warnings, [])
})
