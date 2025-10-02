import { generateKeyPair, exportJWK, SignJWT, type JWK } from 'jose';

let _priv: CryptoKey | null = null;
let _pub: JWK | null = null;

export async function ensureKeypair() {
  if (_priv && _pub) return { priv: _priv, jwk: _pub };
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  _priv = privateKey;
  _pub = await exportJWK(publicKey);
  // kid makes JWKS deterministic for this boot
  _pub.kid = _pub.kid || `${Date.now().toString(36)}-dev`;
  _pub.alg = 'RS256';
  _pub.use = 'sig';
  return { priv: _priv, jwk: _pub };
}

export async function signDevJWT(payload: Record<string, any>) {
  const { priv, jwk } = await ensureKeypair();
  const iss = process.env.OIDC_ISSUER || 'http://127.0.0.1/';
  const aud = process.env.OIDC_AUDIENCE || process.env.OIDC_CLIENT_ID || 'vaultmesh-dev';
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    ...payload,
    iss,
    aud
  })
    .setProtectedHeader({ alg: 'RS256', kid: jwk.kid! })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 5) // 5 minutes
    .sign(priv);
}

export async function jwks() {
  const { jwk } = await ensureKeypair();
  return { keys: [jwk] };
}
