const LINK_LIFETIME_MS = 5 * 60 * 1000

// Not firebase-admin's getDownloadURL: it sends no sign-in to the emulator, so Storage Rules deny it.
// The admin metadata request skips Rules. STORAGE_EMULATOR_HOST is set by firebase-admin.
async function emulatorDownloadUrl(file) {
  const [metadata] = await file.getMetadata()
  const token = metadata.metadata?.firebaseStorageDownloadTokens?.split(',')[0]
  if (!token) throw new Error(`No download token for ${file.name}.`)
  return `${process.env.STORAGE_EMULATOR_HOST}/v0/b/${file.bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`
}

// Signed links need cloud credentials, which the local emulators do not have, and they would point at
// the real Storage service. Inside the Functions emulator, use its own download link instead.
async function examAssetUrl(file, {
  emulator = process.env.FUNCTIONS_EMULATOR === 'true',
  downloadUrl = emulatorDownloadUrl
} = {}) {
  if (emulator) return downloadUrl(file)
  const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + LINK_LIFETIME_MS })
  return url
}

module.exports = { examAssetUrl }
