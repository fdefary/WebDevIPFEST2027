const test = require('node:test')
const assert = require('node:assert/strict')
const { EXAM_EXPORT_HEADERS, buildExamExportRows } = require('../src/exam/export')

test('exports submitted answers and keys with Verdict for List-Based and Calculation only', () => {
  const rows = buildExamExportRows({
    team: { teamId: 'team-1', teamName: 'Team One' }, packet: { name: 'Packet A' },
    questions: [
      { number: 1, category: 'Short Answer' },
      { number: 26, category: 'List-Based' },
      { number: 29, category: 'Calculation' }
    ],
    answerKeys: { 1: { answer: 'key' }, 26: { answer: 'A, B' }, 29: { answer: '12 m' } },
    attempt: { answers: { 1: 'response', 26: 'B, A', 29: '12' }, verdicts: { 26: 'Correct', 29: 'Correct' } }
  })
  assert.deepEqual(EXAM_EXPORT_HEADERS, ['Team', 'Team ID', 'Packet', 'Question', 'Category', 'Submitted Answer', 'Answer Key', 'Verdict', 'Judge Score'])
  assert.equal(rows[0]['Submitted Answer'], 'response')
  assert.equal(rows[0]['Answer Key'], 'key')
  assert.equal(rows[0].Verdict, '')
  assert.equal(rows[0]['Judge Score'], '')
  assert.equal(rows[1].Verdict, 'Correct')
  assert.equal(rows[2].Verdict, 'Correct')
})

test('leaves unanswered and ungraded values explicit for offline checking', () => {
  const [row] = buildExamExportRows({
    team: {}, packet: {}, questions: [{ number: 21, category: 'Long Answer' }], answerKeys: { 21: { answer: 'key' } }
  })
  assert.equal(row['Submitted Answer'], '')
  assert.equal(row.Verdict, '')
  assert.equal(row['Judge Score'], '')
})

test('grades a completed List-Based or Calculation answer that has no stored verdict', () => {
  const questions = [{ number: 26, category: 'List-Based' }, { number: 29, category: 'Calculation' }, { number: 30, category: 'Calculation' }]
  const rows = buildExamExportRows({
    team: { teamName: 'T', teamId: 't' }, packet: { name: 'P' }, questions,
    answerKeys: { 26: { answer: 'A, B' }, 29: { answer: '10 m', tolerance: 0.5 }, 30: { answer: '5', tolerance: 0 } },
    // 26 timed out blank and 29 was answered, both while no key was loaded. 30 was never reached.
    attempt: { answers: { 26: '', 29: '10.2' }, verdicts: {} }
  })
  assert.deepEqual(rows.map((row) => row.Verdict), ['Incorrect', 'Correct', 'Not graded'])
})
