export const TEAM_DOCUMENTS = [
  { field: 'studentIdCardUrl', suffix: 'StudentID', inputId: 'student-id-card-pdf', label: 'Student ID Card' },
  { field: 'twibbonUrl', suffix: 'Twibbon', inputId: 'twibbon-pdf', label: 'Twibbon' },
  { field: 'socialMediaFollowUrl', suffix: 'Follow', inputId: 'social-media-follow-pdf', label: 'Social Media Follow' },
  { field: 'instagramStoryShareUrl', suffix: 'AddToStory', inputId: 'instagram-story-share-pdf', label: 'Instagram Story Share' },
  { field: 'likeAndRepostUrl', suffix: 'LikeRepost', inputId: 'like-and-repost-pdf', label: 'Like and Repost' }
]

const MAX_TEAM_DOCUMENT_SIZE = 20 * 1024 * 1024

export async function isValidTeamDocumentFile(file) {
  if (!file || file.size > MAX_TEAM_DOCUMENT_SIZE || !file.name.toLowerCase().endsWith('.pdf')) return false
  if (file.type && file.type !== 'application/pdf') return false
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  return signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46 && signature[4] === 0x2d
}

const COMPETITION_FILE_NAMES = {
  'business case': 'Business_Case',
  'geothermal development plan': 'Geothermal_Development_Plan',
  'mud inovation': 'Mud_Innovation',
  'oil rig design': 'Oil_Rig_Design',
  'paper and poster': 'Paper_and_Poster',
  'plan of development': 'Plan_of_Development',
  'smart competition': 'Smart_Competition',
  'well design': 'Well_Design',
  hackaton: 'Hackathon'
}

function safeFilePart(value, fallback) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback
}

export function teamDocumentPath(uid, competition, teamName, suffix) {
  if (!/^[A-Za-z0-9_-]+$/.test(String(uid))) throw new Error('Invalid team owner ID')
  if (!TEAM_DOCUMENTS.some(document => document.suffix === suffix)) throw new Error('Invalid team document type')
  const competitionName = COMPETITION_FILE_NAMES[String(competition).toLowerCase()]
    ?? safeFilePart(competition, 'Competition')
  const name = safeFilePart(teamName, 'Team')
  return `team/${uid}/documents/${competitionName}_${name}_${suffix}.pdf`
}
