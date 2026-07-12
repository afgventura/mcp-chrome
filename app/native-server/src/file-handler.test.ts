import { afterEach, describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileHandler } from './file-handler';

describe('FileHandler', () => {
  const handler = new FileHandler();
  const createdFiles: string[] = [];

  afterEach(() => {
    for (const filePath of createdFiles.splice(0)) {
      fs.rmSync(filePath, { force: true });
    }
  });

  test('keeps caller-supplied file names inside the upload directory', async () => {
    const result = await handler.handleFileRequest({
      action: 'prepareFile',
      base64Data: Buffer.from('safe').toString('base64'),
      fileName: '../../outside.txt',
    });
    createdFiles.push(result.filePath);

    expect(result.success).toBe(true);
    expect(result.fileName).toBe('outside.txt');
    expect(path.dirname(result.filePath)).toBe(path.join(os.tmpdir(), 'chrome-mcp-uploads'));
    expect(fs.readFileSync(result.filePath, 'utf8')).toBe('safe');
  });

  test('does not clean up files in a sibling directory with the same prefix', async () => {
    const siblingDir = path.join(os.tmpdir(), 'chrome-mcp-uploads-untrusted');
    const siblingFile = path.join(siblingDir, 'keep.txt');
    fs.mkdirSync(siblingDir, { recursive: true });
    fs.writeFileSync(siblingFile, 'keep');
    createdFiles.push(siblingFile);

    const result = await handler.handleFileRequest({
      action: 'cleanupFile',
      filePath: siblingFile,
    });

    expect(result).toEqual({
      success: false,
      error: 'Can only cleanup files in temp directory',
    });
    expect(fs.existsSync(siblingFile)).toBe(true);
  });

  test('rejects non-HTTP download protocols', async () => {
    const result = await handler.handleFileRequest({
      action: 'prepareFile',
      fileUrl: 'file:///etc/passwd',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Only HTTP and HTTPS URLs are supported');
  });
});
