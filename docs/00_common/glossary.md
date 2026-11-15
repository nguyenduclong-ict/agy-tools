# Từ Điển Thuật Ngữ (Glossary)

| Thuật ngữ | Định nghĩa |
| :--- | :--- |
| **`agy`** | Antigravity CLI — giao diện dòng lệnh chính thức của Google Antigravity. |
| **OS Keyring** | Kho lưu trữ thông tin xác thực bảo mật cấp hệ điều hành (Windows Credential Manager, macOS Keychain, Linux Secret Service / D-Bus). |
| **`gemini:antigravity`** | Khóa định danh credential OAuth mà `agy` sử dụng trong OS Keyring (Service: `gemini`, Account: `antigravity`). |
| **Single-Account JSON** | Định dạng tệp JSON sao lưu thông tin xác thực của đúng một tài khoản `agy` tại một thời điểm. |
| **Mode `project`** | Phạm vi đồng bộ cấu hình áp dụng cho một thư mục dự án cụ thể (`.claude/`, `.agents/`, `CLAUDE.md`, `GEMINI.md`, `.mcp.json`). |
| **Mode `global`** | Phạm vi đồng bộ cấu hình ở mức người dùng trên toàn máy (`~/.claude/`, `~/.claude.json`, `~/.gemini/config/`, `~/.gemini/GEMINI.md`). |
| **Plugin `project-scope`** | Plugin Antigravity tự động tạo tại `.agents/plugins/project-scope/` để chứa `mcp_config.json` ở mode `project`, do Antigravity không đọc `.agents/mcp_config.json` độc lập. |
| **Best-Effort Mapping** | Cơ chế chuyển đổi giữ tối đa cấu hình tương thích giữa Claude Code và Antigravity, bỏ qua hoặc cảnh báo rõ các trường không có ánh xạ 1-1 kèm báo cáo chi tiết. |
| **`.bak` Backup** | Bản sao lưu tự động của tệp đích trước khi bị ghi đè trong quá trình đồng bộ (`<filename>.bak.<timestamp>` hoặc `<filename>.bak`). |
