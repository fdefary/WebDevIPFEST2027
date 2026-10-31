import assert from 'node:assert/strict'
import { parseStorageObjectPath } from '../src/shared/storage-path.js'

assert.equal(parseStorageObjectPath('team/owner/id.jpg'), 'team/owner/id.jpg')
assert.equal(
  parseStorageObjectPath('https://firebasestorage.googleapis.com/v0/b/ipfest-2027.firebasestorage.app/o/team%2Fowner%2Fid.jpg?alt=media&token=legacy-secret'),
  'team/owner/id.jpg'
)
for (const value of [
  'https://evil.example/team/owner/id.jpg',
  'https://firebasestorage.googleapis.com/v0/b/bucket/o/Merch%2Forder%2Fproof.jpg?token=secret',
  'team/owner/../secret.jpg',
  'team//id.jpg',
  'not-a-storage-path'
]) assert.equal(parseStorageObjectPath(value), null, value)
