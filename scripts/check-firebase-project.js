import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const projectId = 'ipfest-2027';
const firebaserc = JSON.parse(readFileSync('.firebaserc', 'utf8'));
const firebase = JSON.parse(readFileSync('firebase.json', 'utf8'));
const webConfig = readFileSync('src/index.js', 'utf8');
const functions = JSON.parse(readFileSync('functions/package.json', 'utf8'));

assert.equal(firebaserc.projects.default, projectId);
assert.equal(firebase.hosting.site, projectId);
for (const [key, value] of Object.entries({
  apiKey: 'AIzaSyCaAWAHqMdgDSfsSoEq2fVldksii1_vA18',
  authDomain: 'ipfest-2027.firebaseapp.com',
  projectId,
  storageBucket: 'ipfest-2027.firebasestorage.app',
  messagingSenderId: '997727130659',
  appId: '1:997727130659:web:10902420888d916f398d96',
  measurementId: 'G-MP3S9DH01H'
})) {
  assert.ok(webConfig.includes(`${key}: "${value}"`), `Firebase web config ${key} must target ${projectId}`);
}
assert.equal(functions.engines.node, '22', 'Cloud Functions must use the supported Node.js 22 runtime');

for (const workflow of ['firebase-hosting-merge.yml', 'firebase-hosting-pull-request.yml']) {
  const hostingWorkflow = readFileSync(`.github/workflows/${workflow}`, 'utf8');
  assert.match(hostingWorkflow, /projectId: ipfest-2027\b/, `${workflow} must deploy to ipfest-2027`);
  assert.match(hostingWorkflow, /secrets\.FIREBASE_SERVICE_ACCOUNT_IPFEST_2027\b/, `${workflow} must use a dedicated 2027 service account`);
}
