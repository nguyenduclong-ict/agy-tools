# Tác Nhân & Phân Quyền (Actors & Permissions)

## 1. Danh Sách Tác Nhân

| Tác nhân | Mô tả | Cách tương tác |
| :--- | :--- | :--- |
| **Developer (Interactive)** | Lập trình viên vận hành trực tiếp trên terminal cá nhân. | Chạy `agy-tools` không kèm đủ cờ để dùng menu chọn, checkbox và xác nhận xung đột. |
| **Automation / CI Script** | Kịch bản tự động hóa hoặc dotfiles setup trên máy mới. | Chạy subcommands kèm đầy đủ flags (`--from`, `--to`, `--mode`, `--categories`, `--yes`, `--force`, `--json`). |

## 2. Ma Trận Quyền Truy Cập Hệ Thống

| Tài nguyên | Thao tác | Quyền yêu cầu | Lưu ý bảo mật |
| :--- | :--- | :--- | :--- |
| **OS Keyring (`gemini:antigravity`)** | Đọc / Ghi | Quyền user hiện hành trên Credential Manager / Keychain / Secret Service. | Không yêu cầu quyền Administrator/root. |
| **File token fallback (`~/.gemini/antigravity-cli/antigravity-oauth-token`)** | Đọc / Ghi | Quyền đọc/ghi thư mục `$HOME`. | Ghi với mode `0o600` trên POSIX. |
| **Tệp JSON backup auth** | Đọc / Ghi | Quyền ghi tại đường dẫn `-o` do người dùng chỉ định. | Ghi với mode `0o600` trên POSIX; cảnh báo không commit vào Git. |
| **Thư mục Global (`~/.claude/`, `~/.claude.json`, `~/.gemini/`)** | Đọc / Ghi | Quyền user trên `$HOME`. | Tạo `.bak` trước khi sửa file JSON tổng hợp (`~/.claude.json`, `settings.json`, `mcp_config.json`). |
| **Thư mục Project (`.claude/`, `.agents/`, `CLAUDE.md`, `GEMINI.md`, `.mcp.json`)** | Đọc / Ghi | Quyền đọc/ghi trong thư mục dự án. | Ghi đè an toàn, tạo `.bak` khi có xung đột. |
