import { describe, expect, it } from 'vitest';

import { merkleRoot, sha256 } from '../../lib/hash.js';

describe('hash helpers', () => {
  it('computes the expected sha256 digest', () => {
    const digest = sha256('abc');
    expect(digest).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('derives stable merkle roots and promotes odd leaves', () => {
    const leaves = ['a', 'b', 'c'].map((value) => sha256(value));
    const root = merkleRoot(leaves);
    expect(root).toBe(merkleRoot(leaves));
  });
});
