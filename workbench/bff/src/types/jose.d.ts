declare module 'jose' {
  export type JWTPayload = Record<string, any> & {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    iat?: number;
  };
  export function createRemoteJWKSet(url: URL): any;
  export function jwtVerify(
    token: string,
    key: any,
    opts: { issuer?: string; audience?: string | string[] },
  ): Promise<{ payload: JWTPayload }>;
}
