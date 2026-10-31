import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TEAM_DOCUMENTS, isValidTeamDocumentFile, teamDocumentPath } from '../src/shared/team-documents.js';

test('defines all required team document fields and canonical suffixes', () => {
  assert.deepEqual(TEAM_DOCUMENTS.map(({ field, suffix }) => [field, suffix]), [
    ['studentIdCardUrl', 'StudentID'],
    ['twibbonUrl', 'Twibbon'],
    ['socialMediaFollowUrl', 'Follow'],
    ['instagramStoryShareUrl', 'AddToStory'],
    ['likeAndRepostUrl', 'LikeRepost']
  ]);
});

test('builds team-level filenames from the competition and team names', () => {
  assert.equal(
    teamDocumentPath('uid_123', 'business case', 'Team One', 'StudentID'),
    'team/uid_123/documents/Business_Case_Team_One_StudentID.pdf'
  );
});

test('sanitizes user-controlled names and rejects an unsafe owner ID', () => {
  assert.equal(
    teamDocumentPath('uid_123', 'business case', '../Team/One', 'LikeRepost'),
    'team/uid_123/documents/Business_Case_Team_One_LikeRepost.pdf'
  );
  assert.throws(() => teamDocumentPath('../other', 'business case', 'Team', 'StudentID'));
});

test('accepts signed PDFs and rejects renamed, wrong-type, and oversized files', async () => {
  const makeFile = (contents, name, type) => Object.assign(new Blob([contents], { type }), { name });
  const validPdf = makeFile('%PDF-1.7\ncontent', 'proof.pdf', 'application/pdf');
  assert.equal(await isValidTeamDocumentFile(validPdf), true);
  assert.equal(await isValidTeamDocumentFile(makeFile('plain text', 'proof.pdf', 'application/pdf')), false);
  assert.equal(await isValidTeamDocumentFile(makeFile('%PDF-1.7', 'proof.pdf', 'image/png')), false);

  const oversizedPdf = makeFile('%PDF-1.7', 'proof.pdf', 'application/pdf');
  Object.defineProperty(oversizedPdf, 'size', { value: 20 * 1024 * 1024 + 1 });
  assert.equal(await isValidTeamDocumentFile(oversizedPdf), false);
});
