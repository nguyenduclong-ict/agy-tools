# Quy Chuẩn Dự Án (Conventions)

## 1. Quy Chuẩn Đặt Tên & Mã Nguồn

- **Ngôn ngữ & Module:** TypeScript strict mode (`"strict": true`), ESM (`"type": "module"`).
- **Đặt tên tệp:** `kebab-case.ts` cho tệp mã nguồn và kiểm thử (`*.test.ts`).
- **Đặt tên ký hiệu:** `PascalCase` cho class/interface/type, `camelCase` cho hàm/biến, `UPPER_SNAKE_CASE` cho hằng số.
- **Lệnh CLI:** Tên nhị phân chính là `agy-tools`.

## 2. Mã Lỗi Chuẩn (Error Codes)

| Mã lỗi | Nhóm | Mô tả | Exit Code |
| :--- | :--- | :--- | :--- |
| `AUTH_NOT_FOUND` | Auth | Không tìm thấy credential `gemini:antigravity` trong keyring hoặc file fallback | `2` |
| `AUTH_INVALID_FORMAT` | Auth | Tệp JSON import sai cấu trúc hoặc thiếu trường OAuth bắt buộc | `3` |
| `AUTH_KEYRING_UNAVAILABLE` | Auth | Hệ thống không có keyring khả dụng và chưa bật fallback | `4` |
| `CRYPTO_DECRYPT_FAILED` | Bảo mật | Sai passphrase hoặc ciphertext/auth-tag bị hỏng khi giải mã AES-256-GCM | `5` |
| `SYNC_SOURCE_NOT_FOUND` | Sync | Không tìm thấy thư mục/tệp nguồn ở mode tương ứng | `6` |
| `SYNC_CONFLICT_ABORTED` | Sync | Người dùng hủy thao tác khi phát hiện xung đột ghi đè | `7` |
| `FS_PERMISSION_DENIED` | Hệ thống tệp | Không đủ quyền đọc/ghi vào đường dẫn đích hoặc keyring | `8` |
| `CLI_INVALID_ARGS` | CLI | Tham số dòng lệnh không hợp lệ hoặc xung đột cờ | `1` |

## 3. Quy Chuẩn Bảo Mật Đầu Ra (Logging & Secret Hygiene)

- Tuyệt đối không in giá trị `access_token`, `refresh_token`, `id_token` nguyên bản, `apiKey`, `headers.Authorization`, hoặc passphrase ra `stdout` / `stderr` / log.
- Chỉ hiển thị thông tin không nhạy cảm khi xác nhận tài khoản: `email` (giải mã payload JWT cục bộ), `auth_method`, `expiry`, tên file đích.
- Trên hệ điều hành POSIX (macOS, Linux), tệp JSON sao lưu auth và tệp token fallback phải được cấp quyền `0o600`.

## 4. Quy Chuẩn Sao Lưu Trước Ghi Đè (`.bak`)

- Mọi thao tác ghi đè tệp cấu hình hiện có trong lệnh `sync` (trừ khi truyền `--no-backup` tường minh) đều tạo bản sao lưu trước khi ghi mới.
- Định dạng tên sao lưu: lưu vào thư mục `.agy-tools-backup/<timestamp>/` giữ nguyên đường dẫn tương đối hoặc tạo `<target>.bak` tùy theo cấu hình mặc định (chi tiết quy định tại [Agent Config Sync Logic](../03_features/02_agent_config_sync/logic.md)).
