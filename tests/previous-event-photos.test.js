import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const photos = [
  'BCC_0563.webp', 'BCC_0591.webp', 'Galla_Dinner_1461.webp', 'Galla_Dinner_1507.webp',
  'GDPC_0167.webp', 'GDPC_0300.webp', 'Hackathon_0577.webp', 'Hackathon_0601.webp',
  'MUD_2811.webp', 'MUD_2818.webp', 'ORDC_0236.webp', 'ORDC_0306.webp',
  'POD_0567.webp', 'POD_0603.webp', 'PPC_0226.webp', 'PPC_0259.webp',
  'Smartcomp_0149.webp', 'Smartcomp_0165.webp', 'Tour_de_bandung_asia_afrika.webp',
  'Tour_de_bandung_braga.webp', 'Tour_de_bandung_patra.webp', 'Well_Design_5732.webp',
  'Well_Design_5747.webp'
];

test('serves previous-event photos from the organized events archive', () => {
  for (const photo of photos) {
    assert.ok(existsSync(path.join(root, 'static/images/events/archive', photo)), `Missing archive photo ${photo}`);
    assert.equal(existsSync(path.join(root, 'prev_event_photos', photo)), false, `Old photo path remains: ${photo}`);
  }
});
