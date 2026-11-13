import assert from 'node:assert/strict';
import { test } from 'node:test';
import { teamSearchText, matchesSearch } from '../src/shared/team-search.js';

const team = {
  teamName: 'TERASEA',
  leader: { firstName: 'Dimas', lastName: 'Siampurna', email: 'dimas@student.example.ac.id', phoneNo: '088286905594', studentId: '124480030', university: 'Institut Teknologi Sumatera' },
  members: [{ firstName: 'Indy', lastName: 'Rahmadini', email: 'indy@student.example.ac.id', phoneNo: '+62 831-6971-0246', studentId: '124480035' }]
};
const text = teamSearchText(team, 'Oil Rig Design Competition');

test('finds a team by team, leader, member, university and competition', () => {
  for (const query of ['terasea', 'Dimas', 'rahmadini', 'indy@student', 'sumatera', 'oil rig', '124480035']) {
    assert.ok(matchesSearch(text, query), `should match ${query}`);
  }
});

test('matches phone numbers regardless of formatting or country code', () => {
  for (const query of ['088286905594', '0831697', '628316971', '+62 831-6971']) {
    assert.ok(matchesSearch(text, query), `should match ${query}`);
  }
});

test('requires every word and treats an empty query as a match', () => {
  assert.ok(matchesSearch(text, 'dimas sumatera'));
  assert.equal(matchesSearch(text, 'dimas harvard'), false);
  assert.ok(matchesSearch(text, '   '));
});

test('handles teams with missing leader or members', () => {
  assert.equal(teamSearchText({ teamName: 'Solo' }), 'solo');
  assert.ok(matchesSearch(teamSearchText({}), ''));
});
