const PACKET_CATEGORIES = [
  ...Array(20).fill('Short Answer'),
  ...Array(5).fill('Long Answer'),
  ...Array(3).fill('List-Based'),
  ...Array(2).fill('Calculation')
]

const QUESTION_DURATIONS = Object.freeze({
  'Short Answer': 14_000,
  'Long Answer': 25_000,
  'List-Based': 25_000,
  Calculation: 60_000
})

function validatePacketQuestions(questions) {
  if (!Array.isArray(questions) || questions.length !== PACKET_CATEGORIES.length) {
    throw new Error('A packet must contain exactly 30 questions.')
  }

  questions.forEach((question, index) => {
    if (!question || question.number !== index + 1) {
      throw new Error(`Question numbers must be unique and ordered from 1 to 30 (row ${index + 1}).`)
    }
    if (question.category !== PACKET_CATEGORIES[index]) {
      throw new Error(`Question ${index + 1} must use category ${PACKET_CATEGORIES[index]}.`)
    }
    if (typeof question.question !== 'string' || !question.question.trim()) {
      throw new Error(`Question ${index + 1} requires question text.`)
    }
    if (typeof question.answer !== 'string' || !question.answer.trim()) {
      throw new Error(`Question ${index + 1} requires an answer key.`)
    }
  })

  return true
}

function parseListItems(text) {
  if (typeof text !== 'string') throw new TypeError('List answer must be text.')
  if (!text.trim()) return []

  const items = []
  let item = ''
  let quoted = false
  let closedQuote = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        item += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
        closedQuote = true
      } else {
        item += character
      }
    } else if (character === ',') {
      items.push(item.trim())
      item = ''
      closedQuote = false
    } else if (character === '"' && !item.trim() && !closedQuote) {
      item = ''
      quoted = true
    } else if (closedQuote && !character.trim()) {
      continue
    } else if (closedQuote || character === '"') {
      throw new Error('Invalid quoting in comma-separated list answer.')
    } else {
      item += character
    }
  }

  if (quoted) throw new Error('Unclosed quote in comma-separated list answer.')
  items.push(item.trim())
  return items
}

function gradeListAnswer(response, answerKey) {
  const expected = parseListItems(answerKey).map((item) => item.trim().replace(/\s+/g, ' ').toLowerCase())
  let actual
  try {
    actual = parseListItems(response).map((item) => item.trim().replace(/\s+/g, ' ').toLowerCase())
  } catch {
    return { verdict: 'Incorrect' }
  }
  const sortedExpected = [...expected].sort()
  const sortedActual = [...actual].sort()
  return { verdict: sortedExpected.length > 0
    && sortedExpected.length === sortedActual.length
    && sortedExpected.every((item, index) => item === sortedActual[index]) ? 'Correct' : 'Incorrect' }
}

function parseNumber(value, allowUnit) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value).trim()
  const pattern = allowUnit
    ? /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:\s+[^\d].*)?$/i
    : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i
  if (!pattern.test(text)) return null
  const number = Number.parseFloat(text)
  return Number.isFinite(number) ? number : null
}

function gradeCalculation(response, answerKey, tolerance) {
  const expected = parseNumber(answerKey, true)
  const actual = parseNumber(response, false)
  if (expected === null) throw new Error('Calculation answer key must start with a valid number and optional unit.')
  if (typeof tolerance !== 'number' || !Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error('Calculation tolerance must be a non-negative finite number.')
  }
  if (actual === null) return { verdict: 'Incorrect' }
  // Decimals are stored in binary, so 0.4 - 0.3 comes out a hair above 0.1. Allow for that rounding only.
  const roundingSlack = 4 * Number.EPSILON * Math.max(1, Math.abs(expected), Math.abs(actual))
  return { verdict: Math.abs(actual - expected) <= tolerance + roundingSlack ? 'Correct' : 'Incorrect' }
}

function questionDurationMs(category) {
  const duration = QUESTION_DURATIONS[category]
  if (!duration) throw new Error('Unknown question category.')
  return duration
}

function categoryForQuestion(number) {
  if (!Number.isInteger(number) || number < 1 || number > PACKET_CATEGORIES.length) {
    throw new Error('Invalid packet question number.')
  }
  return PACKET_CATEGORIES[number - 1]
}

module.exports = { validatePacketQuestions, parseListItems, gradeListAnswer, gradeCalculation, questionDurationMs, categoryForQuestion }
