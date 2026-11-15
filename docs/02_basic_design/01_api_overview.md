# Hợp Đồng Giao Diện CLI & Định Dạng Dữ Liệu (CLI Interface Overview)

## 1. Cấu Trúc Lệnh `agy-tools`

Chạy `agy-tools` không kèm subcommand sẽ mở menu tương tác chọn tác vụ (`Auth Backup`, `Auth Import`, `Sync Agent Config`).

### 1.1. Nhóm Lệnh `auth`

| Lệnh | Mô tả | Cờ (Flags) chính |
| :--- | :--- | :--- |
| `agy-tools auth backup` | Xuất credential `agy` hiện tại ra 1 tệp JSON duy nhất. | `-o, --output <path>` (mặc định `./agy-auth-backup.json`), `--encrypt`, `--passphrase <str>`, `--force`, `--file-fallback` |
| `agy-tools auth import <file>` | Nạp credential từ 1 tệp JSON vào OS Keyring của `agy`. | `--passphrase <str>`, `--dry-run`, `--file-fallback`, `-y, --yes` |
| `agy-tools auth status` | Kiểm tra trạng thái tồn tại credential `gemini:antigravity` và hiển thị email/expiry (không lộ token). | `--json` |

### 1.2. Nhóm Lệnh `sync`

| Lệnh | Mô tả | Cờ (Flags) chính |
| :--- | :--- | :--- |
| `agy-tools sync` | Đồng bộ cấu hình Agent giữa Claude Code và Antigravity. | `--from <claude\|agy>`, `--to <claude\|agy>`, `--mode <project\|global>`, `--project-dir <path>`, `-c, --categories <list>`, `--dry-run`, `--force`, `--skip-existing`, `--no-backup`, `-y, --yes`, `--json` |

**Giá trị hợp lệ cho `--categories` (phân tách bằng dấu phẩy):**
`agents`, `skills`, `rules`, `mcp`, `commands`, `hooks`, `all`.
Khi chạy tương tác không truyền `--categories`, CLI hiển thị **checkbox** với 3 mục được chọn sẵn: `agents`, `skills`, `rules`.

## 2. Hợp Đồng Tệp Single-Account JSON (`auth`)

### 2.1. Định dạng chuẩn (Plain JSON)

```json
{
  "format": "agy-tools-auth",
  "version": 1,
  "exportedAt": "2026-11-15T13:50:00.000Z",
  "account": {
    "email": "user@example.com",
    "authMethod": "oauth-personal",
    "expiry": "2026-11-15T14:50:00.000Z"
  },
  "encrypted": false,
  "credential": {
    "token": {
      "access_token": "...",
      "token_type": "Bearer",
      "refresh_token": "...",
      "expiry": "..."
    },
    "auth_method": "oauth-personal",
    "id_token": "..."
  }
}
```

### 2.2. Định dạng mã hóa (`--encrypt`)

```json
{
  "format": "agy-tools-auth",
  "version": 1,
  "exportedAt": "2026-11-15T13:50:00.000Z",
  "account": {
    "email": "user@example.com",
    "authMethod": "oauth-personal",
    "expiry": "2026-11-15T14:50:00.000Z"
  },
  "encrypted": true,
  "crypto": {
    "cipher": "aes-256-gcm",
    "kdf": "scrypt",
    "kdfParams": { "N": 16384, "r": 8, "p": 1, "keyLen": 32 },
    "salt": "<base64>",
    "iv": "<base64>",
    "tag": "<base64>"
  },
  "ciphertext": "<base64>"
}
```

*Ghi chú tương thích:* Lệnh `auth import` cũng chấp nhận JSON thô nguyên bản từ keyring (`{ "token": {...}, "auth_method": "...", "id_token": "..." }`) để thuận tiện khôi phục từ tệp token trực tiếp.
