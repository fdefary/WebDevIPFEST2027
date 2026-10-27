import { httpsCallable } from 'firebase/functions'
import { FUNCTIONS } from '../index.js'
import { parseStorageObjectPath } from './storage-path.js'

const createPrivateDownloadUrl = httpsCallable(FUNCTIONS, 'createPrivateDownloadUrl')

const escapeAttribute = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]))

export function privateStoragePathOf(value) {
    return parseStorageObjectPath(value)
}

export function privateStorageLink(value, label = 'Open file', className = '') {
    const path = privateStoragePathOf(value)
    if (!path) return ''
    return `<a href="#" data-private-storage-path="${escapeAttribute(path)}" class="${escapeAttribute(className)}">${escapeAttribute(label)}</a>`
}

document.addEventListener('click', async (event) => {
    const link = event.target.closest?.('[data-private-storage-path]')
    if (!link) return
    event.preventDefault()

    const tab = window.open('about:blank', '_blank')
    if (tab) tab.opener = null
    try {
        const { data } = await createPrivateDownloadUrl({ path: link.dataset.privateStoragePath })
        const url = new URL(data.url)
        if (url.protocol !== 'https:') throw new Error('Invalid signed URL protocol')
        if (tab) tab.location = url.href
        else window.location.assign(url.href)
    } catch (error) {
        tab?.close()
        console.error('Private download denied', error)
        alert('You do not have permission to open this file, or the temporary link could not be created.')
    }
})
