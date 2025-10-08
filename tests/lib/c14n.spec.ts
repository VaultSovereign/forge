import { describe, expect, it } from 'vitest';

import { canonicalize, canonicalizeToJSON, deepFreeze } from '../../lib/c14n.js';

describe('canonical JSON', () => {
  it('sorts keys and normalizes numbers', () => {
    const sample = { b: 2, a: -0, z: Infinity, arr: [1, undefined, 3] };
    const json = canonicalizeToJSON(sample);
    expect(json).toBe('{"a":0,"arr":[1,null,3],"b":2,"z":null}');
  });

  it('produces stable output regardless of key order', () => {
    const a = { x: { b: 1, a: 2 } };
    const b = { x: { a: 2, b: 1 } };
    expect(canonicalizeToJSON(a)).toBe(canonicalizeToJSON(b));
  });

  it('drops undefined keys', () => {
    const obj: Record<string, unknown> = { a: 1, omit: undefined };
    const json = canonicalizeToJSON(obj);
    expect(json).toBe('{"a":1}');
  });

  it('deep freezes canonicalized payloads when requested', () => {
    const obj = { nested: { value: 1 } };
    const canonical = canonicalize(obj) as { nested: { value: number } };
    const frozen = deepFreeze(canonical);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(() => {
      (frozen.nested as { value: number }).value = 2;
    }).toThrow();
  });
});
