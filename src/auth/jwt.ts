import type { AuthAccountMeta, RawAgyCredential } from './types.js';

/**
 * Locally decodes the middle payload segment of an OIDC id_token JWT to extract email for display.
 * Returns null safely if the token is missing or malformed.
 */
export function extractEmailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken || typeof idToken !== 'string') {
    return null;
  }
  const parts = idToken.split('.');
  if (parts.length < 2 || !parts[1]) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
    return typeof payload.email === 'string' && payload.email.length > 0 ? payload.email : null;
  } catch {
    return null;
  }
}

/**
 * Builds non-sensitive account metadata from a raw agy credential.
 */
export function extractAccountMeta(credential: RawAgyCredential): AuthAccountMeta {
  const email = extractEmailFromIdToken(credential.id_token);
  const authMethod = typeof credential.auth_method === 'string' ? credential.auth_method : null;
  const expiry = typeof credential.token?.expiry === 'string' ? credential.token.expiry : null;
  return { email, authMethod, expiry };
}
