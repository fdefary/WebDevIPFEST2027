const PRIVATE_ROOTS = new Set([
    'Case', 'team', 'payments', 'preliminary_submissions',
    'final_submissions', 'finalreg_submissions'
])

export function parseStorageObjectPath(value) {
    if (typeof value !== 'string' || !value || value.length > 2048) return null

    let path = value
    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value)
            if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com'
                || url.port || url.username || url.password || url.hash) return null
            const match = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/)
            if (!match) return null
            path = decodeURIComponent(match[1])
        } catch {
            return null
        }
    }

    const parts = path.split('/')
    if (!PRIVATE_ROOTS.has(parts[0]) || parts.length < 3
        || parts.some(part => !part || part === '.' || part === '..')
        || /[\\\u0000-\u001f]/.test(path)
        || /%(?:2f|5c|2e)/i.test(path)) return null
    return path
}
