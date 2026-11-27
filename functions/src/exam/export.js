const EXAM_EXPORT_HEADERS = [
  'Team', 'Team ID', 'Packet', 'Question', 'Category', 'Submitted Answer', 'Answer Key', 'Verdict', 'Judge Score'
]

const { gradeListAnswer, gradeCalculation } = require('./domain')

// An answer can be completed before its key was loaded, for example when several questions expire at
// once. Grade those here. A question the team never reached stays 'Not graded'.
function gradeCompleted(category, response, key) {
  if (response === undefined || !key) return 'Not graded'
  return category === 'List-Based'
    ? gradeListAnswer(response, key.answer).verdict
    : gradeCalculation(response, key.answer, key.tolerance).verdict
}

function buildExamExportRows({ team, packet, questions, answerKeys, attempt = {} }) {
  return questions.map((question) => {
    const number = question.number
    const category = question.category
    const systemGraded = category === 'List-Based' || category === 'Calculation'
    return {
      Team: team.teamName || '',
      'Team ID': team.teamId || '',
      Packet: packet.name || '',
      Question: number,
      Category: category,
      'Submitted Answer': attempt.answers?.[number] ?? '',
      'Answer Key': answerKeys[number]?.answer ?? '',
      Verdict: systemGraded
        ? attempt.verdicts?.[number] ?? gradeCompleted(category, attempt.answers?.[number], answerKeys[number])
        : '',
      'Judge Score': ''
    }
  })
}

module.exports = { EXAM_EXPORT_HEADERS, buildExamExportRows }
