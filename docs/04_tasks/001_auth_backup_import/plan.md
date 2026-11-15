# Kế Hoạch Triển Khai: 001 — Backup & Import Auth Của `agy` CLI

**Đặc tả:** [spec.md](../../03_features/01_auth_backup_import/spec.md) | [logic.md](../../03_features/01_auth_backup_import/logic.md)

## 1. Mục Tiêu Kỹ Thuật

Khởi tạo cấu trúc dự án TypeScript/Node.js (`package.json`, `tsconfig.json`, `tsup`, `vitest`) và triển khai hoàn chỉnh nhóm lệnh `agy-tools auth` (`backup`, `import`, `status`) theo mô hình Single-Account JSON, hỗ trợ OS Keyring đa nền tảng (Windows Credential Manager, macOS Keychain, Linux Secret Service + file fallback) và mã hóa tùy chọn AES-256-GCM.

## 2. Danh Sách Tệp Dự Kiến Tạo / Sửa

- `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `.gitignore`
- `src/core/errors.ts`, `src/core/fs-atomic.ts`, `src/core/logger.ts`
- `src/auth/types.ts`, `src/auth/crypto.ts`, `src/auth/jwt.ts`, `src/auth/validation.ts`, `src/auth/service.ts`
- `src/auth/keyring/{types.ts,windows.ts,macos.ts,linux.ts,file-fallback.ts,index.ts}`
- `src/cli/index.ts`, `src/cli/prompts.ts`, `src/cli/formatters.ts`
- `tests/auth/{crypto.test.ts,validation.test.ts,service.test.ts}`

## 3. Checklist Theo Tiêu Chí Nghiệm Thu (`AC-xxx`)

- [x] Khởi tạo project TypeScript ESM, cài dependencies (`commander`, `@inquirer/prompts`, `yaml`, `diff`, `picocolors`, `cli-table3`, `tsup`, `vitest`, `typescript`, `@types/node`).
- [x] **AC-101:** `auth backup` đọc từ keyring/fallback, trích `email` từ `id_token`, xuất tệp `agy-tools-auth` v1 Plain JSON không in secret ra stdout.
- [x] **AC-102:** `auth backup --encrypt` mã hóa bằng AES-256-GCM + scrypt (`salt`, `iv`, `tag`, `ciphertext`).
- [x] **AC-103:** `auth import` hỗ trợ cả wrapped JSON và raw JSON, tự giải mã nếu `encrypted: true`, ghi đúng định dạng UTF-8 vào `gemini:antigravity` và xác minh qua `auth status`.
- [x] **AC-104:** Sai passphrase khi import trả lỗi `CRYPTO_DECRYPT_FAILED` (exit code `5`) và không chạm keyring.
- [x] **AC-105:** Tệp JSON sai schema trả lỗi `AUTH_INVALID_FORMAT` (exit code `3`).
- [x] **AC-106:** `auth import --dry-run` kiểm tra/giải mã không ghi vào keyring.
- [x] **AC-107:** Cơ chế file fallback `~/.gemini/antigravity-cli/antigravity-oauth-token` hoạt động với quyền `0o600` trên POSIX.

## 4. Kế Hoạch Kiểm Thử

- Unit test mã hóa/giải mã AES-256-GCM (đúng/sai passphrase, tamper tag).
- Unit test parser/validator (wrapped plain, wrapped encrypted, raw `agy` JSON, invalid JSON).
- Integration test `auth backup` / `auth import` / `auth status` với mock keyring & file fallback trên thư mục tạm.
- Kiểm chứng thực tế `agy-tools auth status` trên Windows Credential Manager (`gemini:antigravity`).
