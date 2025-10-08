import { createHash, createPublicKey, sign as nodeSign, verify as nodeVerify } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { once } from 'node:events';
import { canonicalizeToJSON } from './c14n.js';

export function sha256(bufferOrString: Buffer | string): string {
  const h = createHash('sha256');
  h.update(bufferOrString);
  return h.digest('hex');
}

export function hashCanonical(value: unknown): string {
  return sha256(canonicalizeToJSON(value));
}

export async function sha256File(path: string): Promise<string> {
  const h = createHash('sha256');
  const rs = createReadStream(path);
  rs.on('data', (chunk) => h.update(chunk));
  await once(rs, 'end');
  return h.digest('hex');
}

export function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return sha256('');
  let level: Buffer[] = hashes.map((hex) => Buffer.from(hex, 'hex'));
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i];
      const h = createHash('sha256');
      h.update(left);
      h.update(right);
      next.push(h.digest());
    }
    level = next;
  }
  return level[0].toString('hex');
}

export function ed25519Sign(privateKeyPem: string, data: Buffer | string): string {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const signature = nodeSign(null, buf, { key: privateKeyPem });
  return signature.toString('base64');
}

export function ed25519Verify(publicKeyPem: string, data: Buffer | string, signatureBase64: string): boolean {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const pub = createPublicKey(publicKeyPem);
  return nodeVerify(null, buf, pub, Buffer.from(signatureBase64, 'base64'));
}
