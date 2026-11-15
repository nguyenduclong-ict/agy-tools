# Đặc Tả Tính Năng: Backup & Import Auth Của `agy` CLI

**Trạng thái:** `Implemented (Production)`

## 1. Mục Tiêu & Bối Cảnh

Cho phép người dùng sao lưu trạng thái đăng nhập OAuth hiện tại của `agy` CLI từ OS Keyring (hoặc file fallback) ra **1 tệp JSON duy nhất** (mô hình Single-Account JSON) và nhập lại tệp đó trên cùng máy hoặc máy khác để khôi phục phiên làm việc `agy` mà không cần đăng nhập lại qua trình duyệt.

Tài liệu liên quan: [CLI Interface Overview](../../02_basic_design/01_api_overview.md), [ADR-002](../../02_basic_design/decisions/ADR-002-single-json-auth.md), [Non-Functional Requirements](../../01_srs/non_functional.md).

## 2. Phạm Vi (Scope)

### Trong phạm vi (In Scope)
- Đọc và ghi credential `gemini:antigravity` trên Windows Credential Manager, macOS Keychain, Linux Secret Service (`libsecret`).
- Hỗ trợ fallback tệp `~/.gemini/antigravity-cli/antigravity-oauth-token` khi OS Keyring không khả dụng hoặc truyền cờ `--file-fallback`.
- Lệnh `agy-tools auth backup`: xuất 1 tệp JSON cho tài khoản hiện tại, mặc định Plain JSON, tùy chọn `--encrypt` (AES-256-GCM).
- Lệnh `agy-tools auth import <file>`: kiểm tra hợp lệ, tự động phát hiện và giải mã nếu tệp được mã hóa, ghi vào OS Keyring (hoặc fallback).
- Lệnh `agy-tools auth status`: kiểm tra trạng thái đăng nhập hiện tại (nguồn lưu trữ, email trích xuất từ `id_token`, thời điểm hết hạn token).

### Ngoài phạm vi (Out of Scope)
- Lưu trữ nhiều tài khoản trong cùng một tệp JSON (registry).
- Tự động gọi Google OAuth API để làm mới `access_token` khi sao lưu/nhập (`agy` tự refresh bằng `refresh_token` khi khởi chạy).
- Sao lưu `cpa-connection.json`, `settings.json`, hoặc `mcp_oauth_tokens.json`.

## 3. Yêu Cầu Chức Năng (Functional Requirements)

| Mã | Tên yêu cầu | Mô tả chi tiết |
| :--- | :--- | :--- |
| **FR-101** | Đọc credential `agy` đa nền tảng | Hệ thống tự động phát hiện HĐH (`win32`, `darwin`, `linux`) và đọc chuỗi JSON UTF-8 từ credential slot `gemini` / `antigravity`. Nếu keyring không khả dụng ở Linux/headless, đọc tiếp từ `~/.gemini/antigravity-cli/antigravity-oauth-token`. |
| **FR-102** | Xuất Single-Account JSON (`auth backup`) | Đóng gói credential hợp lệ thành cấu trúc `agy-tools-auth` (v1) gồm `account` (`email`, `authMethod`, `expiry`) và `credential`, ghi nguyên tử ra đường dẫn `-o/--output` (mặc định `./agy-auth-backup.json`). |
| **FR-103** | Mã hóa tùy chọn (`--encrypt`) | Khi người dùng truyền `--encrypt`, yêu cầu nhập passphrase (ẩn ký tự, xác nhận 2 lần khi nhập tương tác; hoặc nhận qua `--passphrase`), mã hóa khối `credential` bằng AES-256-GCM + scrypt và đặt `encrypted: true`. |
| **FR-104** | Nhập Single-Account JSON (`auth import`) | Đọc tệp JSON đầu vào, hỗ trợ cả định dạng bọc `agy-tools-auth` (plain/encrypted) và định dạng JSON thô `{ token, auth_method, id_token }`. Nếu `encrypted: true`, yêu cầu passphrase để giải mã trước khi ghi vào OS Keyring. |
| **FR-105** | Xem trước & xác nhận ghi đè khi import | Trước khi ghi đè lên credential đang tồn tại trong OS Keyring, hiển thị email của tài khoản cũ (nếu đọc được) và tài khoản mới, yêu cầu xác nhận trừ khi truyền `-y/--yes`. Hỗ trợ `--dry-run` để kiểm tra/giải mã thử mà không ghi vào keyring. |
| **FR-106** | Kiểm tra trạng thái (`auth status`) | Trả về nguồn credential đang dùng (`keyring` hoặc `file-fallback`), `email`, `authMethod`, `expiry`, hỗ trợ `--json` cho script. Không bao giờ xuất token thô. |

## 4. Quy Tắc Nghiệp Vụ (Business Rules)

| Mã | Quy tắc |
| :--- | :--- |
| **BR-101** | **Một tài khoản trên mỗi tệp:** Mỗi tệp JSON backup chỉ đại diện cho đúng 1 tài khoản `agy`. Nếu tệp đích `-o` đã tồn tại, phải hỏi xác nhận ghi đè hoặc yêu cầu cờ `--force`. |
| **BR-102** | **Xác thực lược đồ trước khi ghi keyring:** Chỉ cho phép ghi vào OS Keyring khi payload sau giải mã là JSON hợp lệ có trường `token` (chứa ít nhất `refresh_token` hoặc `access_token`) và `auth_method`. |
| **BR-103** | **Trích xuất thông tin hiển thị cục bộ:** Trường `account.email` được trích xuất bằng cách giải mã phần payload (base64url) của `id_token` JWT ở máy cục bộ; nếu `id_token` vắng mặt hoặc không parse được, đặt `email: null` mà không gây lỗi tiến trình. |
| **BR-104** | **Bảo mật tệp và stdout:** Mọi tệp JSON backup hoặc tệp fallback ghi trên POSIX đều đặt permission `0o600`. Không in bất kỳ giá trị token hay passphrase nào ra terminal trong mọi chế độ (kể cả `--json` hay error stack). |
| **BR-105** | **Định dạng lưu trữ Windows Credential Manager:** Ghi bằng `CRED_TYPE_GENERIC` (`1`), `CRED_PERSIST_LOCAL_MACHINE` (`2`), `TargetName = "gemini:antigravity"`, `UserName = "antigravity"`, payload là byte UTF-8 (không dùng UTF-16LE) để khớp hoàn toàn với `agy.exe`. |

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

- **AC-101:** Chạy `agy-tools auth backup -o acc.json` khi đang đăng nhập `agy` tạo ra tệp `acc.json` hợp lệ theo schema `agy-tools-auth` v1 với `encrypted: false`, chứa đủ `credential.token`, `credential.auth_method`, và `account.email` khớp tài khoản; stdout không chứa `refresh_token` hay `access_token`.
- **AC-102:** Chạy `agy-tools auth backup -o acc.enc.json --encrypt --passphrase secret` tạo tệp JSON có `encrypted: true`, không chứa chuỗi plaintext của `refresh_token` hay `access_token` trong tệp.
- **AC-103:** Sau khi xóa hoặc đổi credential trong OS Keyring, chạy `agy-tools auth import acc.json -y` (và tương ứng với `acc.enc.json --passphrase secret`) khôi phục thành công credential vào `gemini:antigravity` dưới dạng UTF-8 JSON chuẩn, và `agy-tools auth status` xác nhận lại đúng tài khoản.
- **AC-104:** Nhập sai `--passphrase` khi import `acc.enc.json` trả về mã lỗi `CRYPTO_DECRYPT_FAILED` (exit code `5`) và giữ nguyên không làm hỏng credential hiện có trong OS Keyring.
- **AC-105:** Import tệp JSON thiếu `token` hoặc sai định dạng trả về `AUTH_INVALID_FORMAT` (exit code `3`) và không ghi vào OS Keyring.
- **AC-106:** Chạy `agy-tools auth import acc.json --dry-run` kiểm tra/giải mã tệp thành công nhưng không thay đổi dữ liệu trong OS Keyring hay file fallback.
- **AC-107:** Trên môi trường Linux giả lập không có `secret-tool` (hoặc với `--file-fallback`), `backup` và `import` đọc/ghi thông qua `~/.gemini/antigravity-cli/antigravity-oauth-token` với permission `0o600`.
