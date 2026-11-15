export const ERROR_EXIT_CODES = {
  CLI_INVALID_ARGS: 1,
  AUTH_NOT_FOUND: 2,
  AUTH_INVALID_FORMAT: 3,
  AUTH_KEYRING_UNAVAILABLE: 4,
  CRYPTO_DECRYPT_FAILED: 5,
  SYNC_SOURCE_NOT_FOUND: 6,
  SYNC_CONFLICT_ABORTED: 7,
  FS_PERMISSION_DENIED: 8,
} as const;

export type ErrorCode = keyof typeof ERROR_EXIT_CODES;

/**
 * Domain error carrying a standardized error code and CLI exit status.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly exitCode: number;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.exitCode = ERROR_EXIT_CODES[code];
  }
}

/**
 * Maps unknown filesystem or runtime errors to AppError when applicable.
 */
export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM') {
      return new AppError('FS_PERMISSION_DENIED', err.message, err);
    }
    return new AppError('CLI_INVALID_ARGS', err.message, err);
  }
  return new AppError('CLI_INVALID_ARGS', String(err));
}
