export interface OAuthTokenPayload {
  access_token?: string;
  token_type?: string;
  refresh_token?: string;
  expiry?: string;
  [key: string]: unknown;
}

export interface RawAgyCredential {
  token: OAuthTokenPayload;
  auth_method: string;
  id_token?: string;
  [key: string]: unknown;
}

export interface AuthAccountMeta {
  email: string | null;
  authMethod: string | null;
  expiry: string | null;
}

export interface AuthCryptoMeta {
  cipher: 'aes-256-gcm';
  kdf: 'scrypt';
  kdfParams: {
    N: number;
    r: number;
    p: number;
    keyLen: number;
  };
  salt: string;
  iv: string;
  tag: string;
}

export interface AuthBackupPlainEnvelope {
  format: 'agy-tools-auth';
  version: 1;
  exportedAt: string;
  account: AuthAccountMeta;
  encrypted: false;
  credential: RawAgyCredential;
}

export interface AuthBackupEncryptedEnvelope {
  format: 'agy-tools-auth';
  version: 1;
  exportedAt: string;
  account: AuthAccountMeta;
  encrypted: true;
  crypto: AuthCryptoMeta;
  ciphertext: string;
}

export type AuthBackupEnvelope = AuthBackupPlainEnvelope | AuthBackupEncryptedEnvelope;

export type AuthSourceKind = 'keyring' | 'file-fallback';

export interface AuthStatusResult {
  authenticated: boolean;
  source: AuthSourceKind | null;
  account: AuthAccountMeta | null;
}
