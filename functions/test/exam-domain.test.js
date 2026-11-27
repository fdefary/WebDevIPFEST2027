const test = require('node:test')
const assert = require('node:assert/strict')
const { validatePacketQuestions, parseListItems, gradeListAnswer, gradeCalculation, questionDurationMs, categoryForQuestion } = require('../src/exam/domain')

const categories = [
  ...Array(20).fill('Short Answer'),
  ...Array(5).fill('Long Answer'),
  ...Array(3).fill('List-Based'),
  ...Array(2).fill('Calculation')
]

function packet() {
  return categories.map((category, index) => ({
    number: index + 1,
    question: `Question ${index + 1}`,
    answer: `Answer ${index + 1}`,
    category
  }))
}

test('accepts a packet with the required count, order, and exact categories', () => {
  assert.equal(validatePacketQuestions(packet()), true)
})

test('rejects missing, duplicated, or out-of-order packet questions', () => {
  const missing = packet().slice(1)
  const duplicate = packet()
  duplicate[1].number = 1
  const wrongCategory = packet()
  wrongCategory[0].category = 'short answer'

  assert.throws(() => validatePacketQuestions(missing), /30 questions/)
  assert.throws(() => validatePacketQuestions(duplicate), /number/i)
  assert.throws(() => validatePacketQuestions(wrongCategory), /category|order/i)
})

test('parses comma-separated list answers with quoted commas', () => {
  assert.deepEqual(parseListItems('alpha, "Washington, D.C.", beta'), ['alpha', 'Washington, D.C.', 'beta'])
})

test('rejects malformed quoting in comma-separated answers', () => {
  assert.throws(() => parseListItems('alpha, "unfinished'), /quote/i)
})

test('grades list answers as an unordered all-or-nothing set', () => {
  assert.deepEqual(gradeListAnswer('beta, "Washington, D.C.", alpha', 'alpha, beta, "Washington, D.C."'), { verdict: 'Correct' })
  assert.deepEqual(gradeListAnswer('alpha, beta', 'alpha, beta, gamma'), { verdict: 'Incorrect' })
  assert.deepEqual(gradeListAnswer('', 'alpha'), { verdict: 'Incorrect' })
  assert.deepEqual(gradeListAnswer('"unfinished', 'alpha'), { verdict: 'Incorrect' })
})

test('grades a single numeric response within an inclusive tolerance', () => {
  assert.deepEqual(gradeCalculation('10.5', '10 m', 0.5), { verdict: 'Correct' })
  assert.deepEqual(gradeCalculation('10.5001', '10 m', 0.5), { verdict: 'Incorrect' })
})

test('accepts answers exactly on the tolerance limit despite binary rounding', () => {
  for (const [response, key, tolerance] of [
    ['0.4', '0.3', 0.1], ['0.2', '0.3', 0.1], ['1.15', '1.1 m', 0.05],
    ['494074207.55', '494074207.5 STB', 0.05], ['494074207.45', '494074207.5 STB', 0.05], ['-0.4', '-0.3', 0.1]
  ]) {
    assert.deepEqual(gradeCalculation(response, key, tolerance), { verdict: 'Correct' }, `${response} against ${key} ± ${tolerance}`)
  }
})

test('still rejects answers beyond the tolerance limit, however slightly', () => {
  for (const [response, key, tolerance] of [
    ['0.4000001', '0.3', 0.1], ['494074207.551', '494074207.5 STB', 0.05], ['494074207', '494074207.5 STB', 0.05],
    ['0.30000001', '0.3', 0], ['4633.2', '4632 psi', 0.05]
  ]) {
    assert.deepEqual(gradeCalculation(response, key, tolerance), { verdict: 'Incorrect' }, `${response} against ${key} ± ${tolerance}`)
  }
})

test('rejects non-numeric participant input and invalid grading tolerances', () => {
  assert.deepEqual(gradeCalculation('10 m', '10 m', 0), { verdict: 'Incorrect' })
  assert.throws(() => gradeCalculation('10', 'ten', 0), /answer key/i)
  assert.throws(() => gradeCalculation('10', '10', -1), /tolerance/i)
})

test('uses the fixed duration for each exact question category', () => {
  assert.deepEqual(Object.fromEntries(categories.filter((value, index) => categories.indexOf(value) === index).map((category) => [category, questionDurationMs(category)])), {
    'Short Answer': 14000,
    'Long Answer': 25000,
    'List-Based': 25000,
    Calculation: 60000
  })
  assert.throws(() => questionDurationMs('short answer'), /category/i)
})

test('maps packet positions to the fixed category order', () => {
  assert.equal(categoryForQuestion(1), 'Short Answer')
  assert.equal(categoryForQuestion(21), 'Long Answer')
  assert.equal(categoryForQuestion(26), 'List-Based')
  assert.equal(categoryForQuestion(29), 'Calculation')
  assert.throws(() => categoryForQuestion(31), /question/i)
})
