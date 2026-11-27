// How a question is laid out. The participant page and the admin preview both use this, so they stay alike.
export function answerLayout(category) {
  return {
    long: category === 'Long Answer' || category === 'List-Based',
    inputType: category === 'Calculation' ? 'number' : 'text',
    listHint: category === 'List-Based'
  }
}

export function submitLabel(questionNumber, questionCount) {
  return questionNumber === questionCount ? 'Submit exam' : 'Submit answer'
}
