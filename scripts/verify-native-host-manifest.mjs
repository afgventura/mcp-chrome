import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const shared = await import('../packages/shared/dist/index.mjs');
const expectedOrigin = `chrome-extension://${shared.EXTENSION_ID}/`;
const defaultManifestPath = join(
  homedir(),
  'Library',
  'Application Support',
  'Google',
  'Chrome',
  'NativeMessagingHosts',
  'com.chromemcp.nativehost.json',
);
const manifestPath = resolve(process.argv[2] ?? defaultManifestPath);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (
  !Array.isArray(manifest.allowed_origins) ||
  !manifest.allowed_origins.includes(expectedOrigin)
) {
  throw new Error(
    `Native-host identity mismatch: ${manifestPath} must authorize ${expectedOrigin}. ` +
      'Do not mix the afgventura extension with the upstream npm bridge.',
  );
}

console.log(`Native-host identity verified: ${expectedOrigin}`);
