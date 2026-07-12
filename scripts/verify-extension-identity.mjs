import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const shared = await import('../packages/shared/dist/index.mjs');
const expectedId = shared.EXTENSION_ID;
const manifestPath = resolve('app/chrome-extension/.output/chrome-mv3/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (typeof manifest.key !== 'string' || manifest.key.length === 0) {
  throw new Error(`Built manifest has no stable key: ${manifestPath}`);
}

const digest = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest();
const alphabet = 'abcdefghijklmnop';
const actualId = [...digest.subarray(0, 16)]
  .flatMap((byte) => [alphabet[byte >> 4], alphabet[byte & 0x0f]])
  .join('');

if (actualId !== expectedId) {
  throw new Error(`Extension identity mismatch: expected ${expectedId}, built ${actualId}`);
}

console.log(`Extension identity verified: ${actualId}`);
